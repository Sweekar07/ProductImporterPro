import logging
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.webhook_sender import send_webhook
from fastapi import APIRouter, Depends

from app.database import get_async_db
from app.models import Webhook
from app.schemas import WebhookCreate, WebhookUpdate, WebhookResponse
from app.exceptions.custom_exceptions import NotFoundException, InternalServerException


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])


@router.get("/", response_model=List[WebhookResponse])
async def get_webhooks(db: AsyncSession = Depends(get_async_db)):
    """
    Get all webhooks
    """
    try:
        result = await db.execute(select(Webhook).order_by(Webhook.created_at.desc()))
        webhooks = result.scalars().all()
        return webhooks
    except Exception as e:
        logger.error(f"Error fetching webhooks: {e}")
        raise InternalServerException("Failed to fetch webhooks")


@router.get("/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(webhook_id: int, db: AsyncSession = Depends(get_async_db)):
    """
    Get single webhook by ID
    """
    try:
        result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
        webhook = result.scalar_one_or_none()
        
        if not webhook:
            raise NotFoundException("Webhook not found")
        
        return webhook
    except Exception as e:
        logger.error(f"Error fetching webhook {webhook_id}: {e}")
        raise InternalServerException("failed to fetch webhook")


@router.post("/", response_model=WebhookResponse, status_code=201)
async def create_webhook(
    webhook_data: WebhookCreate,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Create a new webhook
    """
    try:
        webhook = Webhook(**webhook_data.model_dump())
        db.add(webhook)
        await db.commit()
        await db.refresh(webhook)
        
        return webhook
    except Exception as e:
        logger.error(f"Error creating webhook: {e}")
        raise InternalServerException("Failed to create webhook")

@router.put("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: int,
    webhook_data: WebhookUpdate,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Update existing webhook
    """
    try:
        result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
        webhook = result.scalar_one_or_none()
        
        if not webhook:
            raise NotFoundException("Webhook not found")
        
        update_data = webhook_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(webhook, field, value)
        
        await db.commit()
        await db.refresh(webhook)
        
        return webhook
    except Exception as e:
        logger.error(f"Error updating webhook {webhook_id}: {e}")
        raise InternalServerException("Failed to update webhook")

@router.delete("/{webhook_id}", status_code=204)
async def delete_webhook(webhook_id: int, db: AsyncSession = Depends(get_async_db)):
    """
    Delete a webhook
    """
    try:
        result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
        webhook = result.scalar_one_or_none()
        
        if not webhook:
            raise NotFoundException("Webhook not found")
        
        await db.delete(webhook)
        await db.commit()
        
        return None
    except Exception as e:
        logger.error(f"Error deleting webhook {webhook_id}: {e}")
        raise InternalServerException("Failed to delete webhook")

@router.post("/{webhook_id}/test")
async def test_webhook(webhook_id: int, db: AsyncSession = Depends(get_async_db)):
    """
    Test webhook by sending a test payload
    """
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()
    
    if not webhook:
        raise NotFoundException("Webhook not found")
    
    test_payload = {
        "event": "test",
        "message": "This is a test webhook",
        "webhook_id": webhook.id
    }
    
    try:
        status_code = send_webhook(webhook.url, test_payload, webhook.secret_key)
        return {
            "success": True,
            "status_code": status_code,
            "message": "Webhook test successful"
        }
    except Exception as e:
        logger.error(f"Webhook test failed: {e}")
        raise InternalServerException("Webhook test failed")