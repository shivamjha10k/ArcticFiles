#!/usr/bin/env python3
"""
Example demonstrating how to use the configuration system.

This shows how to import and use settings in different parts of your application.
"""

from config import get_settings

def main():
    """Example usage of the configuration system."""
    
    # Get settings (this will be cached after first call)
    settings = get_settings()
    
    print("=== Configuration Example ===")
    print(f"Connecting to Qdrant at: {settings.QDRANT_URL}")
    print(f"Using collection: {settings.QDRANT_COLLECTION}")
    print(f"Embedding model: {settings.EMBEDDING_MODEL}")
    
    # Example: Configure chunking
    print(f"\nText will be chunked with:")
    print(f"  - Chunk size: {settings.CHUNK_SIZE} characters")
    print(f"  - Overlap: {settings.CHUNK_OVERLAP} characters")
    
    # Example: File processing limits
    print(f"\nFile processing limits:")
    print(f"  - Supported types: {', '.join(settings.SUPPORTED_FILE_TYPES)}")
    print(f"  - Max file size: {settings.MAX_FILE_SIZE_MB} MB")
    
    # Example: API configuration
    print(f"\nAPI will run on:")
    print(f"  - Host: {settings.API_HOST}")
    print(f"  - Port: {settings.API_PORT}")
    print(f"  - URL: http://{settings.API_HOST}:{settings.API_PORT}")
    
    # Example: Conditional logic based on settings
    if settings.QDRANT_API_KEY:
        print(f"\n✓ Qdrant authentication enabled")
    else:
        print(f"\n⚠️  Qdrant running without authentication")
    
    # Example: Using settings for validation
    max_results = min(settings.MAX_TOP_K, 20)  # Cap at 20 even if config allows more
    print(f"\nSearch will return max {max_results} results")

if __name__ == "__main__":
    main()
