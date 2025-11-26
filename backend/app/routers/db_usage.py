import logging
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.exceptions.custom_exceptions import InternalServerException

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["database"])

@router.get("/db-usage")
async def get_db_usage(db: AsyncSession = Depends(get_async_db)):
    try:
        result = await db.execute(text("SELECT pg_database_size(current_database()) AS size_bytes"))
        size_bytes = result.scalar_one()
        return {"database_size_bytes": size_bytes}
    except Exception as e:
        logger.error(f"Error fetching database usage: {e}")
        raise InternalServerException("Failed to retrieve database usage")