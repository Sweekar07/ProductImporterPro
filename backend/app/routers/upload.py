import uuid
import json
import asyncio
import logging
import aiofiles
import redis.asyncio as aioredis
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, UploadFile, File, Depends

from app.config import settings
from app.models import UploadTask
from app.database import get_async_db
from app.schemas import UploadResponse
from app.tasks import process_csv_upload
from app.exceptions.custom_exceptions import NotFoundException, InternalServerException, BadRequestException


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/upload", tags=["Upload"])

redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=False)


@router.post("/", response_model=UploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Upload CSV file and start processing asynchronously
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise NotFoundException("Only CSV files are supported")
    
    logger.info(f"CSV upload started: {file.filename}")
    
    # Check file size (optional, e.g., 100MB limit)
    contents = await file.read()
    if len(contents) > 100 * 1024 * 1024:  # 100MB
        raise BadRequestException("File size exceeds 100MB limit")
    
    try:
        # Create upload task record
        task_id = str(uuid.uuid4())
        upload_task = UploadTask(
            id=task_id,
            filename=file.filename,
            status="pending"
        )
        db.add(upload_task)
        await db.commit()

        # Store CSV content in Redis with 2 hour expiry
        redis_key = f"csv_upload:{task_id}"
        await redis_client.setex(redis_key, 7200, contents)  # 2 hours = 7200 seconds
        
        logger.info(f"Stored CSV in Redis: {redis_key} (size: {len(contents):,} bytes)")
        
        # Queue Celery task
        process_csv_upload.delay(task_id, redis_key, file.filename)
        
        logger.info(f"CSV upload queued: {task_id}")
        
        return UploadResponse(
            task_id=task_id,
            message="File uploaded successfully. Processing started."
        )
        
    except Exception as e:
        try:
            await redis_client.delete(redis_key)
        except:
            pass
        logger.error(f"Upload error: {e}")
        raise InternalServerException("Failed to upload and process csv file")

@router.get("/progress/{task_id}")
async def get_progress_stream(task_id: str):
    """
    SSE endpoint for real-time progress updates
    """
    try:
        async def event_generator():
            try:
                while True:
                    # Get progress from Redis
                    progress_data = await redis_client.get(f"progress:{task_id}")
                    
                    if progress_data:
                        data = json.loads(progress_data)
                        yield f"data: {json.dumps(data)}\n\n"
                        
                        # Stop streaming if completed or failed
                        if data.get("status") in ["completed", "failed"]:
                            break
                    else:
                        # Task not started yet
                        yield f"data: {json.dumps({'status': 'pending', 'progress': 0})}\n\n"
                    
                    await asyncio.sleep(0.5)
                    
            except Exception as e:
                logger.error(f"SSE error: {e}")
                yield f"data: {json.dumps({'status': 'error', 'error_message': str(e)})}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    except Exception as e:
        logger.error(f"SSE setup error: {e}")
        raise InternalServerException("Failed to establish SSE connection")


@router.get("/tasks/{task_id}")
async def get_task_by_id(
    task_id: str,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get specific upload task by ID (alias for get_upload_status)
    """
    try:
        from sqlalchemy import select
        
        result = await db.execute(select(UploadTask).where(UploadTask.id == task_id))
        task = result.scalar_one_or_none()
        
        if not task:
            raise NotFoundException("Task not found")
        
        return {
            "task_id": task.id,
            "filename": task.filename,
            "status": task.status,
            "total_rows": task.total_rows,
            "processed_rows": task.processed_rows,
            "failed_rows": task.failed_rows,
            "error_message": task.error_message,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None
        }
    except Exception as e:
        logger.error(f"Error fetching task {task_id}: {e}")
        raise InternalServerException("Failed to fetch task")


@router.get("/tasks")
async def get_all_tasks(
    page: int = 1,
    page_size: int = 10,
    status: str = None,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all upload tasks with pagination and optional status filter
    """
    try:
        from sqlalchemy import select, func
        
        # Build query
        query = select(UploadTask).order_by(UploadTask.created_at.desc())
        
        if status:
            query = query.where(UploadTask.status == status)
        
        # Count total
        count_query = select(func.count()).select_from(UploadTask)
        if status:
            count_query = count_query.where(UploadTask.status == status)
        
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Paginate
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        result = await db.execute(query)
        tasks = result.scalars().all()
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "tasks": [
                {
                    "task_id": task.id,
                    "filename": task.filename,
                    "status": task.status,
                    "total_rows": task.total_rows or 0,
                    "processed_rows": task.processed_rows or 0,
                    "failed_rows": task.failed_rows or 0,
                    "duplicate_rows": task.duplicate_rows or 0,
                    "error_message": task.error_message,
                    "created_at": task.created_at.isoformat() if task.created_at else None,
                    "completed_at": task.completed_at.isoformat() if task.completed_at else None
                }
                for task in tasks
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching tasks: {e}")
        raise InternalServerException("Failed to fetch tasks")

@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Delete a specific upload task
    """
    try:
        from sqlalchemy import select, delete
        
        # Check if task exists
        result = await db.execute(select(UploadTask).where(UploadTask.id == task_id))
        task = result.scalar_one_or_none()
        
        if not task:
            raise NotFoundException("Task not found")
        
        # Delete the task
        await db.execute(delete(UploadTask).where(UploadTask.id == task_id))
        await db.commit()
        
        logger.info(f"Deleted task: {task_id}")
        
        return {"message": "Task deleted successfully", "task_id": task_id}
    except Exception as e:
        logger.error(f"Error deleting task {task_id}: {e}")
        raise InternalServerException("Failed to delete task")
