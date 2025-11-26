from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

# Product Schemas
class ProductBase(BaseModel):
    sku: str = Field(..., min_length=1, max_length=255)
    name: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    is_active: bool = True
    
    @field_validator('sku', 'name')
    def strip_whitespace(cls, v):
        return v.strip() if v else v

class ProductCreate(ProductBase):
    sku: str
    name: str
    description: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ProductListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    products: list[ProductResponse]

# Webhook Schemas
class WebhookBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., min_length=1, max_length=1000)
    event_type: str = Field(..., min_length=1, max_length=100)
    is_enabled: bool = True
    secret_key: Optional[str] = None

class WebhookCreate(WebhookBase):
    pass

class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    event_type: Optional[str] = None
    is_enabled: Optional[bool] = None
    secret_key: Optional[str] = None

class WebhookResponse(WebhookBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Upload Schemas
class UploadResponse(BaseModel):
    task_id: str
    message: str

class ProgressResponse(BaseModel):
    task_id: str
    status: str
    progress: float
    total_rows: int
    processed_rows: int
    failed_rows: int
    duplicate_rows: int
    error_message: Optional[str] = None
