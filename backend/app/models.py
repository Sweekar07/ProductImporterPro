import uuid
from enum import Enum
from app.database import Base
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, func

# Enums
class UploadStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class WebhookEvent(str, Enum):
    UPLOAD_COMPLETE = "upload_complete"
    PRODUCT_CREATED = "product_created"
    PRODUCT_UPDATED = "product_updated"
    PRODUCT_DELETED = "product_deleted"
    PRODUCT_BULK_DELETED = "products_bulk_deleted"


class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True)
    sku = Column(String(25), unique=True, nullable=False)
    name = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    

class Webhook(Base):
    __tablename__ = "webhooks"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    url = Column(String(1000), nullable=False)
    event_type = Column(
        ENUM(WebhookEvent, name="webhook_event_enum"),
        nullable=False
    )
    is_enabled = Column(Boolean, default=True)
    secret_key = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class UploadTask(Base):
    __tablename__ = "upload_tasks"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(100), nullable=False)
    status = Column(
        ENUM(UploadStatus, name="upload_status_enum"),
        default=UploadStatus.PENDING,
        nullable=False
    )
    total_rows = Column(Integer, default=0)
    processed_rows = Column(Integer, default=0)
    failed_rows = Column(Integer, default=0)
    duplicate_rows = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
