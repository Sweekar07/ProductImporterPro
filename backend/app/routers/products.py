from typing import Optional
import logging
from sqlalchemy import select, func
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Product
from app.database import get_async_db
from app.tasks import delete_all_products, trigger_webhooks
from app.schemas import ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
from app.exceptions.custom_exceptions import NotFoundException, ConflictException, InternalServerException


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("/", response_model=ProductListResponse)
async def get_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    sku: Optional[str] = None,
    name: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get paginated products with optional filters
    """
    try:
        query = select(Product)
        
        # Apply filters
        if sku:
            query = query.where(Product.sku.ilike(f"%{sku}%"))
        if name:
            query = query.where(Product.name.ilike(f"%{name}%"))
        if is_active is not None:
            query = query.where(Product.is_active == is_active)
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size).order_by(Product.created_at.desc())
        
        result = await db.execute(query)
        products = result.scalars().all()
        
        return ProductListResponse(
            total=total,
            page=page,
            page_size=page_size,
            products=products
        )
    except Exception as e:
        logger.error(f"Error fetching products: {e}")
        raise InternalServerException("Failed to fetch products")
    

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_async_db)):
    """
    Get single product by ID
    """
    try:
        result = await db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()
        
        if not product:
            raise NotFoundException("Product not found")
        
        return ProductResponse.model_validate(product)
    except Exception as e:
        logger.error(f"Error fetching product {product_id}: {e}")
        raise InternalServerException("Failed to fetch product")
    

@router.post("/", response_model=ProductResponse, status_code=201)
async def create_product(
    product_data: ProductCreate,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Create a new product
    """
    try:
        # Check if SKU already exists
        result = await db.execute(
            select(Product).where(func.lower(Product.sku) == product_data.sku.lower())
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            raise ConflictException("Product with this SKU already exists")
        
        product = Product(**product_data.model_dump())
        db.add(product)
        await db.commit()
        await db.refresh(product)
        
        # Trigger webhooks
        trigger_webhooks.delay("product_created", {
            "message": "A new product has been created",
            "product_id": product.id,
            "sku": product.sku,
            "name": product.name
        })
        
        return ProductResponse.model_validate(product)
    except Exception as e:
        logger.error(f"Error creating product: {e}")
        raise InternalServerException("Failed to create product")


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Update existing product
    """
    try:
        result = await db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()
        
        if not product:
            raise NotFoundException("Product not found")
        
        # Update fields
        update_data = product_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(product, field, value)
        
        await db.commit()
        await db.refresh(product)

        trigger_webhooks.delay("product_updated", {
            "message": "product updated",
            "product_id": product.id,
            "sku": product.sku,
            "name": product.name
        })
        
        return ProductResponse.model_validate(product)
    except Exception as e:
        logger.error(f"Error updating product {product_id}: {e}")
        raise InternalServerException("Failed to update product")

@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: int, db: AsyncSession = Depends(get_async_db)):
    """
    Delete a single product
    """
    try:
        result = await db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()
        
        if not product:
            raise NotFoundException("Product not found")
        
        await db.delete(product)
        await db.commit()

        trigger_webhooks.delay("product_deleted", {
            "message": "product deleted",
            "product_id": product.id,
            "sku": product.sku
        })
        
        return None
    except Exception as e:
        logger.error(f"Error deleting product {product_id}: {e}")
        raise InternalServerException("Failed to delete product")

@router.delete("/")
async def bulk_delete_products(db: AsyncSession = Depends(get_async_db)):
    """
    Delete all products
    """
    try:
        # Queue deletion task
        task = delete_all_products.delay()

        trigger_webhooks.delay("products_bulk_deleted", {
            "task_id": task.id,
            "message": "Bulk deletion of all products completed"
        })
        
        return {
            "message": "Bulk deletion started",
            "task_id": task.id
        }
    except Exception as e:
        logger.error(f"Bulk delete error: {e}")
        raise InternalServerException("Failed to start bulk deletion")
        