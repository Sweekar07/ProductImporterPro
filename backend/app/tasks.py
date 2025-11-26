import os
import json
import redis
import logging
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert

from app.celery_app import celery_app
from app.database import get_sync_session_local
from app.models import Product, UploadTask, Webhook
from app.utils.csv_parser import CSVParser
from app.utils.webhook_sender import send_webhook
from app.config import settings


logger = logging.getLogger(__name__)
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)    # For progress
redis_binary_client = redis.from_url(settings.REDIS_URL, decode_responses=False)    # For CSV files


@celery_app.task(
    bind=True, 
    name='app.tasks.process_csv_upload',
    time_limit=3600,
    soft_time_limit=3300
)
def process_csv_upload(self, task_id: str, redis_key: str, filename: str):
    """
    Process CSV file upload with accurate duplicate tracking
    """
    SessionLocal = get_sync_session_local()
    if SessionLocal is None:
        logger.error("SessionLocal is None - database not initialized")
        raise RuntimeError("Database session factory not initialized")
    
    db = SessionLocal()
    temp_file_path = None
    
    try:
        upload_task = db.query(UploadTask).filter(UploadTask.id == task_id).first()
        if not upload_task:
            logger.error(f"Upload task {task_id} not found")
            return
        
        upload_task.status = "processing"
        db.commit()
        
        # Stage 1: Retrieving CSV from Redis
        update_progress(
            task_id, "processing", 0, 0, 0, 0, 
            stage="retrieving", 
            message="Retrieving CSV from storage..."
        )

        # Get CSV content from Redis
        logger.info(f"Retrieving CSV from Redis: {redis_key}")
        csv_content = redis_binary_client.get(redis_key)
        
        if not csv_content:
            raise ValueError(f"CSV content not found in Redis: {redis_key}")
        
        # Save to temporary file for processing
        temp_file_path = f"/tmp/uploads/{task_id}.csv"
        with open(temp_file_path, 'wb') as f:
            f.write(csv_content)
        
        logger.info(f"Retrieved CSV from Redis ({len(csv_content):,} bytes) and saved to {temp_file_path}")
        
        # Verify file was created
        if not os.path.exists(temp_file_path):
            raise FileNotFoundError(f"Failed to create temporary file: {temp_file_path}")
        
        # Now process with CSVParser
        parser = CSVParser(temp_file_path)

        # Stage 2: Parsing CSV
        update_progress(
            task_id, "processing", 5, 0, 0, 0, 
            stage="parsing", 
            message="Reading CSV file..."
        )
  
        total_rows = parser.count_rows()
        upload_task.total_rows = total_rows
        db.commit()
        
        update_progress(
            task_id, "processing", 10, total_rows, 0, 0,
            stage="parsing",
            message=f"Parsed {total_rows:,} rows from CSV"
        )
        
        # Stage 3: Validating & Deduplicating
        update_progress(
            task_id, "processing", 20, total_rows, 0, 0,
            stage="validating",
            message="Validating and deduplicating data..."
        )
        
        sku_dict = {}
        validation_failed = 0
        
        for idx, row_data in enumerate(parser.parse()):
            if idx % 10000 == 0 and idx > 0:
                progress = 20 + (idx / total_rows) * 20
                update_progress(
                    task_id, "processing", progress, total_rows, idx, validation_failed,
                    stage="validating",
                    message=f"Validating row {idx:,} of {total_rows:,}"
                )
            
            if row_data.get('sku') and row_data.get('name'):
                sku_upper = row_data['sku'].strip().upper()
                
                # Store latest occurrence (overwrites duplicates)
                sku_dict[sku_upper] = {
                    'sku': sku_upper,
                    'name': row_data['name'].strip(),
                    'description': row_data.get('description', '').strip(),
                    'is_active': True
                }
            else:
                validation_failed += 1
        
        valid_rows = list(sku_dict.values())
        
        # Calculate duplicates: total - unique - failed
        duplicates_in_csv = total_rows - len(valid_rows) - validation_failed
        
        logger.info(f"Validation: Total={total_rows:,}, Unique={len(valid_rows):,}, CSV_Duplicates={duplicates_in_csv:,}, Invalid={validation_failed:,}")
        
        # Verify math
        assert total_rows == len(valid_rows) + duplicates_in_csv + validation_failed, "Row count mismatch!"
        
        update_progress(
            task_id, "processing", 40, total_rows, len(valid_rows), validation_failed,
            stage="validating",
            message=f"Validation complete: {len(valid_rows):,} unique, {duplicates_in_csv:,} duplicates, {validation_failed:,} invalid"
        )
        
        # Stage 4: Importing to Database
        update_progress(
            task_id, "processing", 45, total_rows, 0, validation_failed,
            stage="importing",
            message="Starting bulk import..."
        )
        
        new_inserts, db_updates = bulk_upsert_optimized(
            db, valid_rows, task_id, total_rows, validation_failed
        )
        
        # Calculate final counts
        processed_rows = new_inserts  # New products inserted
        total_duplicates = duplicates_in_csv + db_updates  # CSV dupes + DB updates
        
        logger.info(f"Import: New={new_inserts:,}, Updated={db_updates:,}, CSV_Dupes={duplicates_in_csv:,}, Total_Dupes={total_duplicates:,}")
        
        # Verify final math
        assert total_rows == new_inserts + total_duplicates + validation_failed, "Final count mismatch!"
        
        # Save to database
        upload_task = db.query(UploadTask).filter(UploadTask.id == task_id).first()
        upload_task.processed_rows = processed_rows
        upload_task.failed_rows = validation_failed
        upload_task.duplicate_rows = total_duplicates
        db.commit()
        
        # Stage 5: Finalizing
        update_progress(
            task_id, "processing", 95, total_rows, processed_rows, validation_failed,
            stage="finalizing",
            message="Triggering webhooks..."
        )
        
        # Mark as completed
        upload_task = db.query(UploadTask).filter(UploadTask.id == task_id).first()
        upload_task.status = "completed"
        upload_task.completed_at = datetime.utcnow()
        db.commit()
        
        # Stage 6: Complete
        update_progress(
            task_id, "completed", 100, total_rows, processed_rows, validation_failed,
            stage="complete",
            message=f"Import complete! {processed_rows:,} new products, {total_duplicates:,} duplicates handled"
        )
        
        # Trigger webhooks
        trigger_webhooks.delay("upload_complete", {
            "task_id": task_id,
            "filename": filename,
            "total_rows": total_rows,
            "new_inserts": new_inserts,
            "db_updates": db_updates,
            "csv_duplicates": duplicates_in_csv,
            "total_duplicates": total_duplicates,
            "validation_failed": validation_failed
        })
        
        logger.info(f"Task {task_id} complete: New={new_inserts:,}, Duplicates={total_duplicates:,}, Failed={validation_failed:,}")
        
    except Exception as e:
        logger.error(f"Error processing upload task {task_id}: {e}")
        upload_task = db.query(UploadTask).filter(UploadTask.id == task_id).first()
        upload_task.status = "failed"
        upload_task.error_message = str(e)
        db.commit()
        update_progress(
            task_id, "failed", 0, total_rows if 'total_rows' in locals() else 0, 
            0, 0, error_message=str(e),
            stage="error",
            message=f"Upload failed: {str(e)}"
        )
        raise
        
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logger.info(f"Cleaned up temporary file: {temp_file_path}")
            except Exception as e:
                logger.error(f"Error cleaning up temp file: {e}")
        
        # Delete CSV from Redis
        try:
            redis_binary_client.delete(redis_key)
            logger.info(f"Deleted CSV from Redis: {redis_key}")
        except Exception as e:
            logger.error(f"Error deleting from Redis: {e}")
        db.close()


def bulk_upsert_optimized(db, valid_rows: list, task_id: str, total_rows: int, validation_failed: int) -> tuple:
    """
    Returns (new_inserts, db_updates)
    """
    if not valid_rows:
        return 0, 0
    
    try:
        batch_size = 10000
        total_new = 0
        total_updated = 0
        
        for i in range(0, len(valid_rows), batch_size):
            batch = valid_rows[i:i + batch_size]
            
            # Get existing SKUs before insert
            existing_skus = set(
                row[0] for row in db.query(Product.sku).filter(
                    Product.sku.in_([row['sku'] for row in batch])
                ).all()
            )
            
            # Count new vs updates in this batch
            batch_new = sum(1 for r in batch if r['sku'] not in existing_skus)
            batch_updated = len(batch) - batch_new
            
            # Perform upsert
            stmt = insert(Product).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=['sku'],
                set_={
                    'name': stmt.excluded.name,
                    'description': stmt.excluded.description,
                    'is_active': stmt.excluded.is_active,
                    'updated_at': func.now()
                }
            )
            
            db.execute(stmt)
            db.commit()
            
            total_new += batch_new
            total_updated += batch_updated
            
            # Update progress
            processed = i + len(batch)
            progress = 45 + (processed / len(valid_rows)) * 45
            update_progress(
                task_id, "processing", progress, total_rows, processed, validation_failed,
                stage="importing",
                message=f"Imported {processed:,} of {len(valid_rows):,} products ({total_new:,} new, {total_updated:,} updated)"
            )
            
            if processed % 50000 == 0:
                logger.info(f"Progress: {processed:,}/{len(valid_rows):,} - New: {total_new:,}, Updated: {total_updated:,}")
        
        logger.info(f"Bulk upsert complete: {total_new:,} new inserts, {total_updated:,} updates")
        return total_new, total_updated
        
    except Exception as e:
        logger.error(f"Bulk upsert error: {e}")
        db.rollback()
        raise


def update_progress(
    task_id: str, 
    status: str, 
    progress: float, 
    total: int, 
    processed: int, 
    failed: int, 
    error_message: str = None,
    stage: str = None,
    message: str = None
):
    """
    Update progress in Redis for SSE streaming
    """
    progress_data = {
        "task_id": task_id,
        "status": status,
        "progress": round(progress, 2),
        "total_rows": total,
        "processed_rows": processed,
        "failed_rows": failed,
        "error_message": error_message,
        "stage": stage,
        "message": message
    }
    redis_client.setex(f"progress:{task_id}", 3600, json.dumps(progress_data))
    redis_client.setex(f"upload_progress:{task_id}", 3600, json.dumps(progress_data))


@celery_app.task(name='app.tasks.trigger_webhooks')
def trigger_webhooks(event_type: str, payload: dict):
    """
    Trigger all enabled webhooks
    """
    SessionLocal = get_sync_session_local()
    if SessionLocal is None:
        logger.error("SessionLocal is None in trigger_webhooks")
        return
    
    db = SessionLocal()

    try:
        webhooks = db.query(Webhook).filter(
            Webhook.event_type == event_type,
            Webhook.is_enabled == True
        ).all()
        
        for webhook in webhooks:
            try:
                send_webhook(webhook.url, payload, webhook.secret_key)
                logger.info(f"Webhook triggered: {webhook.url}")
            except Exception as e:
                logger.error(f"Webhook error for {webhook.url}: {e}")
    finally:
        db.close()


@celery_app.task(name='app.tasks.delete_all_products')
def delete_all_products():
    """
    Delete all products from database
    """
    SessionLocal = get_sync_session_local()
    if SessionLocal is None:
        logger.error("SessionLocal is None in delete_all_products")
        raise RuntimeError("Database session factory not initialized")
    
    db = SessionLocal()

    try:
        count = db.query(Product).delete()
        db.commit()
        logger.info(f"Deleted {count} products")
        return {"deleted_count": count}
    except Exception as e:
        logger.error(f"Error deleting products: {e}")
        db.rollback()
        raise
    finally:
        db.close()
