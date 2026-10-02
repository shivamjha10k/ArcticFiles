from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List

class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""
    
    # Qdrant database configuration
    QDRANT_URL: str = Field(default="http://localhost:6333", description="Qdrant database URL")
    QDRANT_API_KEY: str | None = Field(default=None, description="Qdrant API key for authentication")
    QDRANT_COLLECTION: str = Field(default="files_chunks", description="Name of the Qdrant collection")
    
    # Embedding model configuration
    EMBEDDING_MODEL: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2", 
        description="HuggingFace model name for embeddings"
    )
    
    # Text chunking configuration (character-based semantic chunking)
    CHUNK_SIZE: int = Field(default=1200, description="Maximum size of text chunks in characters", ge=500, le=3000)
    CHUNK_OVERLAP: int = Field(default=200, description="Overlap between consecutive chunks in characters", ge=50, le=500)
    
    # Search configuration
    MAX_TOP_K: int = Field(default=8, description="Maximum number of search results to return", ge=1, le=100)
    
    # Embedding cache configuration
    EMBEDDING_CACHE_SIZE_MB: int = Field(default=512, description="Maximum embedding cache size in MB", ge=64, le=4096)
    EMBEDDING_CACHE_TTL_SECONDS: int = Field(default=3600, description="Cache TTL in seconds (0 = no expiry)", ge=0)
    
    # Search result cache configuration
    SEARCH_CACHE_SIZE_MB: int = Field(default=128, description="Maximum search cache size in MB", ge=32, le=1024)
    SEARCH_CACHE_TTL_SECONDS: int = Field(default=1800, description="Search cache TTL in seconds", ge=300, le=7200)
    
    # Batch processing configuration
    BATCH_SIZE: int = Field(default=500, description="Number of files to process per batch", ge=50, le=2000)
    BATCH_DELAY_MS: int = Field(default=500, description="Delay between batches in milliseconds", ge=100, le=5000)
    
    # File processing configuration
    SUPPORTED_FILE_TYPES: List[str] = Field(
        default=["pdf", "docx", "txt", "md"], 
        description="List of supported file extensions"
    )
    MAX_FILE_SIZE_MB: int = Field(default=50, description="Maximum file size in MB", ge=1, le=500)
    
    # API configuration
    API_HOST: str = Field(default="0.0.0.0", description="API host address")
    API_PORT: int = Field(default=8000, description="API port number", ge=1024, le=65535)
    
    # Logging configuration
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    
    # Model configuration using Pydantic v2 syntax
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )

@lru_cache
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()
