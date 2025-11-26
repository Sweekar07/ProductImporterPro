from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PGHOST: str
    PGPORT: str
    PGUSER: str
    PGPASSWORD: str
    PGDATABASE: str
    
    # Redis
    REDIS_URL: str
    
    # Celery
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str
    
    # App
    CORS_ORIGINS: str = "*"
    UPLOAD_DIR: str = "/tmp/uploads"
    MAX_UPLOAD_SIZE: int = 524288000  # 500MB
    
    # Environment
    ENV: str = "production"
    
    @property
    def DATABASE_URL(self) -> str:
        """Build async DATABASE_URL from components"""
        url = f"postgresql+asyncpg://{self.PGUSER}:{self.PGPASSWORD}@{self.PGHOST}:{self.PGPORT}/{self.PGDATABASE}"
        return url
    
    @property
    def SYNC_DATABASE_URL(self) -> str:
        """Build sync DATABASE_URL for Celery"""
        url = f"postgresql://{self.PGUSER}:{self.PGPASSWORD}@{self.PGHOST}:{self.PGPORT}/{self.PGDATABASE}"
        return url
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = True


settings = Settings()
