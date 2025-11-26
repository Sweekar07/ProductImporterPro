import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession


logger = logging.getLogger(__name__)
Base = declarative_base()


# Global variables
async_engine = None
sync_engine = None
AsyncSessionLocal = None
SyncSessionLocal = None


def _build_database_url(async_driver=True):    
    
    host = os.getenv("PGHOST") or os.getenv("POSTGRES_HOST", "postgres.railway.internal")
    port = os.getenv("PGPORT") or os.getenv("POSTGRES_PORT", "5432")
    user = os.getenv("PGUSER") or os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("PGPASSWORD") or os.getenv("POSTGRES_PASSWORD", "")
    database = os.getenv("PGDATABASE") or os.getenv("POSTGRES_DB", "railway")
    
    logger.info(f"Building URL from components: {user}@{host}:{port}/{database}")
    
    if async_driver:
        url = f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{database}"
    else:
        url = f"postgresql://{user}:{password}@{host}:{port}/{database}"
    return url


def _init_engines():
    """Initialize database engines"""
    global async_engine, sync_engine, AsyncSessionLocal, SyncSessionLocal
    
    if async_engine is not None:
        logger.info("Database engines already initialized")
        return
    
    env = os.getenv("ENV", "production")
    
    try:
        # Create async engine
        logger.info("Initializing async engine...")
        async_url = _build_database_url(async_driver=True)
        logger.info(f"Async URL: {async_url}...")

        async_engine = create_async_engine(
            async_url,
            echo=env == "development",
            pool_size=20,
            max_overflow=40,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        
        AsyncSessionLocal = async_sessionmaker(
            async_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
        
        # Create sync engine
        logger.info("Initializing sync engine...")
        sync_url = _build_database_url(async_driver=False)
        
        sync_engine = create_engine(
            sync_url,
            echo=env == "development",
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        
        SyncSessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=sync_engine,
        )
        
        logger.info("✅ Database engines initialized successfully!")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize database engines: {e}")
        raise

async def get_async_db():
    if async_engine is None:
        _init_engines()
    
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            await session.close()


def get_sync_db():
    if sync_engine is None:
        _init_engines()
    
    db = SyncSessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        db.close()


async def init_db():
    if async_engine is None:
        _init_engines()
    
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)
    logger.info("✅ Database tables created successfully")

def get_sync_session_local():
    global SyncSessionLocal
    if SyncSessionLocal is None:
        _init_engines()
    return SyncSessionLocal
