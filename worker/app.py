import os
os.environ["CURL_CA_BUNDLE"] = ""
os.environ["REQUESTS_CA_BUNDLE"] = ""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging
from pathlib import Path
from indexer import (
    index_files, semantic_search, parse_file_to_text,
    invalidate_file_cache, get_cache_stats, clear_embedding_cache,
    reindex_file_with_cache_invalidation, get_search_cache_stats, 
    clear_search_cache, get_combined_cache_stats
)
from qdrant_client_util import search, delete_points, search_by_file_path
from utils import sha256_file
from chunker import chunk_text
from config import get_settings

# Set up logging with better formatting
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s:%(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Print startup banner
print("="*80)
print("🚀 ARCTICFILES SEMANTIC WORKER API STARTING...")
print("="*80)

app = FastAPI(
    title="Semantic Worker API", 
    version="0.1.0",
    description="API for indexing documents and performing semantic search"
)

@app.on_event("startup")
async def startup_event():
    """Initialize the embedding model on startup."""
    try:
        print("🧠 Loading AI embedding model for semantic search...")
        logger.info("📥 Initializing SentenceTransformer model...")
        
        from indexer import get_model
        model = get_model()
        
        print(f"✅ AI Model loaded successfully!")
        print(f"📏 Vector dimensions: {model.get_sentence_embedding_dimension()}")
        print(f"🎯 Ready to process semantic searches!")
        logger.info(f"🎉 Model initialization completed: {model.get_sentence_embedding_dimension()} dimensions")
        
        print("="*60)
        print("🔥 SEMANTIC WORKER API IS READY FOR ACTION!")
        print("🔍 Available endpoints:")
        print("   • POST /search - Semantic document search")
        print("   • POST /index-file - Index single file (with auto-OCR)")
        print("   • POST /index-directory - Index entire directory (with auto-OCR)")
        print("   • GET /cache/stats - View cache performance")
        print("🖼️  Auto-OCR Support: Images & Image-based PDFs processed automatically")
        print("="*60)
        
    except Exception as e:
        print(f"❌ CRITICAL: Failed to load AI model!")
        logger.error(f"💥 Model loading failed: {e}")
        print("🚨 Worker service may not function properly without the model!")
        # Don't fail startup, let individual endpoints handle the error

class IndexRequest(BaseModel):
    paths: List[str]
    user_id: Optional[int] = None

class IndexDirectoryRequest(BaseModel):
    path: str
    user_id: Optional[int] = None

class IndexFileRequest(BaseModel):
    path: str
    user_id: Optional[int] = None

class ReindexFileRequest(BaseModel):
    path: str
    user_id: Optional[int] = None

class RemoveFileRequest(BaseModel):
    path: str
    user_id: Optional[int] = None

class FileContentRequest(BaseModel):
    path: str
    user_id: Optional[int] = None

class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = None
    user_id: Optional[int] = None

class IndexResponse(BaseModel):
    files_indexed: int
    chunks_indexed: int
    points: int

class SearchResponse(BaseModel):
    query: str
    top_k: int
    results: List[dict]
    total_results: int

@app.get("/")
def root():
    """Health check endpoint."""
    return {"message": "Semantic Worker API is running", "status": "healthy"}

@app.get("/health")
def health_check():
    """Detailed health check endpoint."""
    try:
        from indexer import get_model_info
        model_info = get_model_info()
        return {
            "status": "healthy",
            "model_info": model_info
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

@app.post("/index", response_model=IndexResponse)
def index_api(req: IndexRequest):
    """
    Index multiple files by parsing, chunking, embedding, and storing in Qdrant.
    
    Args:
        req: IndexRequest containing list of file paths
        
    Returns:
        IndexResponse with indexing statistics
    """
    try:
        logger.info(f"Indexing request for {len(req.paths)} files")
        result = index_files(req.paths)
        return result
    except Exception as e:
        logger.error(f"Indexing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")

@app.post("/search")
def search_api(req: SearchRequest):
    """
    Perform semantic search using query embedding and Qdrant vector search.
    
    Args:
        req: SearchRequest containing query and optional top_k
        
    Returns:
        Search results with scores and metadata
    """
    try:
        query_display = req.query[:50] + ('...' if len(req.query) > 50 else '')
        print(f"🔍 Search requested: '{query_display}'")
        logger.info(f"🔎 Processing search query: '{req.query}' (top_k: {req.top_k})")
        
        result = semantic_search(req.query, req.top_k, req.user_id)
        
        if result.get('cached'):
            print(f"⚡ Search served from cache! Lightning fast response")
        else:
            print(f"🧮 Search computed via AI embeddings")
        
        results_count = result.get('total_results', 0)
        print(f"📋 Found {results_count} relevant document chunks")
        
        return result
    except Exception as e:
        print(f"❌ Search failed: {str(e)}")
        logger.error(f"💥 Search operation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.post("/index-directory")
def index_directory_api(req: IndexDirectoryRequest):
    """
    Index all supported files in a directory recursively.
    
    Args:
        req: IndexDirectoryRequest containing directory path
        
    Returns:
        Dictionary with success status and processing statistics
    """
    try:
        directory_path = Path(req.path)
        
        if not directory_path.exists():
            raise HTTPException(status_code=404, detail=f"Directory not found: {req.path}")
        
        if not directory_path.is_dir():
            raise HTTPException(status_code=400, detail=f"Path is not a directory: {req.path}")
        
        # Find all supported files in directory and subdirectories
        supported_extensions = {
            '.txt', '.md', '.py', '.js', '.ts', '.json', '.csv', '.log', 
            '.pdf', '.docx', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.tiff',
            '.mp3', '.wav', '.m4a', '.mp4', '.webm',
            '.xlsx', '.xls', '.zip',
            '.c', '.cpp', '.h', '.java', '.html', '.css', '.jsx', '.tsx'
        }
        
        file_paths = []
        for file_path in directory_path.rglob('*'):
            if file_path.is_file() and file_path.suffix.lower() in supported_extensions:
                file_paths.append(str(file_path))
        
        if not file_paths:
            return {
                "success": True,
                "filesProcessed": 0,
                "chunksIndexed": 0,
                "message": "No supported files found in directory"
            }
        
        logger.info(f"Found {len(file_paths)} supported files in directory: {req.path}")
        
        # Index all found files
        result = index_files(file_paths, req.user_id)
        
        return {
            "success": True,
            "filesProcessed": result["files_indexed"],
            "chunksIndexed": result["chunks_indexed"],
            "totalFiles": len(file_paths),
            "directory": str(directory_path.resolve())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Directory indexing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Directory indexing failed: {str(e)}")

@app.post("/index-file")
def index_file_api(req: IndexFileRequest):
    """
    Index a single file.
    
    Args:
        req: IndexFileRequest containing file path
        
    Returns:
        Dictionary with file metadata and processing status
    """
    try:
        file_path = Path(req.path)
        
        if not file_path.exists():
            print(f"❌ File not found: {req.path}")
            raise HTTPException(status_code=404, detail=f"File not found: {req.path}")
        
        if not file_path.is_file():
            print(f"❌ Path is not a file: {req.path}")
            raise HTTPException(status_code=400, detail=f"Path is not a file: {req.path}")
        
        print(f"📄 Indexing file: {file_path.name}")
        logger.info(f"📥 Starting file indexing: {req.path}")
        
        # Calculate file metadata
        file_size = file_path.stat().st_size
        checksum = sha256_file(str(file_path))
        
        print(f"🔢 File size: {file_size} bytes, Checksum: {checksum[:12]}...")
        
        # Index the single file
        result = index_files([str(file_path)], req.user_id)
        
        if result["files_indexed"] > 0:
            print(f"✅ File indexed successfully!")
            print(f"📊 Created {result['chunks_indexed']} searchable chunks")
        else:
            print(f"⚠️  File indexing completed but no content was indexed")
        
        return {
            "success": result["files_indexed"] > 0,
            "checksum": checksum,
            "size": file_size,
            "chunksIndexed": result["chunks_indexed"],
            "filePath": str(file_path.resolve()),
            "fileName": file_path.name,
            "fileType": file_path.suffix.lower()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ File indexing failed: {str(e)}")
        logger.error(f"💥 File indexing error: {e}")
        raise HTTPException(status_code=500, detail=f"File indexing failed: {str(e)}")

@app.post("/reindex-file")
def reindex_file_api(req: ReindexFileRequest):
    """
    Re-index a modified file (removes old entries and adds new ones).
    
    Args:
        req: ReindexFileRequest containing file path
        
    Returns:
        Dictionary with updated file metadata and processing status
    """
    try:
        file_path = Path(req.path)
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {req.path}")
        
        if not file_path.is_file():
            raise HTTPException(status_code=400, detail=f"Path is not a file: {req.path}")
        
        # Calculate new file metadata
        file_size = file_path.stat().st_size
        checksum = sha256_file(str(file_path))
        
        # Use cache invalidation and reindexing
        logger.info(f"Reindexing file with cache invalidation: {file_path.name}")
        result = reindex_file_with_cache_invalidation(str(file_path), req.user_id)
        
        # Also remove existing entries from vector database
        try:
            # Try multiple path formats to find existing entries
            file_path_str = str(file_path.resolve())
            file_path_original = str(file_path)
            
            existing_results = []
            
            # Search with resolved path first
            existing_results = search_by_file_path(file_path_str)
            
            # If no results, try with original path
            if not existing_results and file_path_original != file_path_str:
                existing_results = search_by_file_path(file_path_original)
            
            # If still no results, try with normalized path separators
            if not existing_results:
                normalized_path = file_path_str.replace('\\', '/')
                existing_results = search_by_file_path(normalized_path)
            
            if existing_results:
                existing_ids = [r["id"] for r in existing_results]
                if existing_ids:
                    delete_points(existing_ids)
                    logger.info(f"Removed {len(existing_ids)} existing chunks for file: {file_path.name}")
                else:
                    logger.warning(f"Found existing entries but no IDs for file: {file_path.name}")
            else:
                logger.info(f"No existing entries found for file: {file_path.name}")
            
        except Exception as delete_error:
            logger.warning(f"Could not remove existing entries for {file_path.name}: {delete_error}")
        
        return {
            "success": result["files_indexed"] > 0,
            "checksum": checksum,
            "size": file_size,
            "chunksIndexed": result["chunks_indexed"],
            "filePath": str(file_path.resolve()),
            "fileName": file_path.name,
            "fileType": file_path.suffix.lower(),
            "reindexed": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File re-indexing failed: {e}")
        raise HTTPException(status_code=500, detail=f"File re-indexing failed: {str(e)}")

@app.post("/file-content")
def get_file_content_api(req: FileContentRequest):
    """
    Get all indexed content for a specific file by aggregating its chunks.
    
    Args:
        req: FileContentRequest containing file path
        
    Returns:
        Dictionary with aggregated file content and metadata
    """
    try:
        file_path = Path(req.path)
        # Use the original path as provided instead of resolving it
        file_path_str = req.path
        
        # Search for all chunks from this file
        try:
            file_path_str = str(file_path.resolve())
            file_path_original = str(file_path)
            
            results = search_by_file_path(file_path_str)
            
            if not results and file_path_original != file_path_str:
                results = search_by_file_path(file_path_original)
                
            if not results:
                normalized_path = file_path_str.replace('\\', '/')
                results = search_by_file_path(normalized_path)
                
            if not results:
                normalized_original = file_path_original.replace('\\', '/')
                results = search_by_file_path(normalized_original)
                
            if not results:
                # One last try with the exact req.path string
                results = search_by_file_path(req.path)
            
            if not results:
                raise HTTPException(status_code=404, detail=f"No indexed content found for file: {req.path}")
            
            # Sort chunks by index if available, otherwise by score
            sorted_results = sorted(results, key=lambda x: x.get("payload", {}).get("chunk_index", 0))
            
            # Aggregate all text content
            content_chunks = []
            for result in sorted_results:
                payload = result.get("payload", {})
                # The actual text content is stored in the 'chunk' field
                text = payload.get("chunk", payload.get("text", payload.get("content", "")))
                if text:
                    content_chunks.append(text)
            
            full_content = "\n\n".join(content_chunks)
            
            return {
                "success": True,
                "filePath": file_path_str,
                "fileName": file_path.name,
                "content": full_content,
                "totalChunks": len(results),
                "contentLength": len(full_content)
            }
            
        except HTTPException:
            raise
        except Exception as search_error:
            logger.error(f"Error retrieving file content: {search_error}")
            raise HTTPException(status_code=500, detail=f"Failed to retrieve file content: {str(search_error)}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File content retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"File content retrieval failed: {str(e)}")

@app.get("/debug/indexed-files")
def debug_indexed_files():
    """
    Debug endpoint to list all indexed files and their chunks count.
    """
    try:
        from qdrant_client_util import get_collection_info
        
        # Get collection info
        collection_info = get_collection_info()
        if not collection_info:
            return {"error": "Collection not found"}
        
        # Get all points with file information
        from qdrant_client import QdrantClient
        from config import get_settings
        
        settings = get_settings()
        client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
        
        # Scroll through all points
        points, _ = client.scroll(
            collection_name=settings.QDRANT_COLLECTION,
            limit=10000,
            with_payload=True,
            with_vectors=False
        )
        
        # Group by file path
        files_info = {}
        for point in points:
            payload = point.payload or {}
            file_path = payload.get("file_path", "unknown")
            
            if file_path not in files_info:
                files_info[file_path] = {
                    "file_path": file_path,
                    "file_name": payload.get("file_name", "unknown"),
                    "chunks": 0,
                    "total_size": 0,
                    "file_type": payload.get("file_type", "unknown")
                }
            
            files_info[file_path]["chunks"] += 1
            files_info[file_path]["total_size"] += payload.get("chunk_size", 0)
        
        return {
            "total_files": len(files_info),
            "total_points": len(points),
            "files": list(files_info.values())
        }
        
    except Exception as e:
        logger.error(f"Debug endpoint error: {e}")
        return {"error": str(e)}

@app.delete("/remove-file")
def remove_file_api(req: RemoveFileRequest):
    """
    Remove a file from the index.
    
    Args:
        req: RemoveFileRequest containing file path
        
    Returns:
        Dictionary with removal status
    """
    try:
        file_path = Path(req.path)
        file_path_str = str(file_path.resolve())
        
        # Search for entries with this file path
        try:
            results = search_by_file_path(file_path_str)
            
            if not results:
                return {
                    "success": True,
                    "message": f"No indexed content found for file: {req.path}",
                    "chunksRemoved": 0
                }
            
            # Extract IDs for deletion
            matching_ids = [r["id"] for r in results]
            
            # Delete the matching points
            success = delete_points(matching_ids)
            
            if success:
                logger.info(f"Successfully removed {len(matching_ids)} chunks for file: {file_path.name}")
                return {
                    "success": True,
                    "chunksRemoved": len(matching_ids),
                    "filePath": file_path_str,
                    "fileName": file_path.name
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to delete file entries from index")
                
        except Exception as search_error:
            logger.error(f"Error searching/deleting file entries: {search_error}")
            raise HTTPException(status_code=500, detail=f"Failed to remove file from index: {str(search_error)}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File removal failed: {e}")
        raise HTTPException(status_code=500, detail=f"File removal failed: {str(e)}")

# Cache Management Endpoints

@app.get("/cache/stats")
def get_cache_stats_api():
    """
    Get combined embedding and search cache statistics.
    
    Returns:
        Dictionary with cache performance metrics for both caches
    """
    try:
        stats = get_combined_cache_stats()
        return {
            "success": True,
            "cache_stats": stats
        }
    except Exception as e:
        logger.error(f"Cache stats error: {e}")
        raise HTTPException(status_code=500, detail=f"Cache stats failed: {str(e)}")

@app.get("/cache/embedding/stats")
def get_embedding_cache_stats_api():
    """
    Get embedding cache statistics.
    
    Returns:
        Dictionary with embedding cache performance metrics
    """
    try:
        stats = get_cache_stats()
        return {
            "success": True,
            "embedding_cache_stats": stats
        }
    except Exception as e:
        logger.error(f"Embedding cache stats error: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding cache stats failed: {str(e)}")

@app.get("/cache/search/stats")
def get_search_cache_stats_api():
    """
    Get search cache statistics.
    
    Returns:
        Dictionary with search cache performance metrics
    """
    try:
        stats = get_search_cache_stats()
        return {
            "success": True,
            "search_cache_stats": stats
        }
    except Exception as e:
        logger.error(f"Search cache stats error: {e}")
        raise HTTPException(status_code=500, detail=f"Search cache stats failed: {str(e)}")

@app.post("/cache/clear")
def clear_all_caches_api():
    """
    Clear all cache entries (both embedding and search caches).
    
    Returns:
        Dictionary with clearing status
    """
    try:
        clear_embedding_cache()
        clear_search_cache()
        return {
            "success": True,
            "message": "All caches cleared successfully"
        }
    except Exception as e:
        logger.error(f"Cache clear error: {e}")
        raise HTTPException(status_code=500, detail=f"Cache clear failed: {str(e)}")

@app.post("/cache/embedding/clear")
def clear_embedding_cache_api():
    """
    Clear embedding cache entries only.
    
    Returns:
        Dictionary with clearing status
    """
    try:
        clear_embedding_cache()
        return {
            "success": True,
            "message": "Embedding cache cleared successfully"
        }
    except Exception as e:
        logger.error(f"Embedding cache clear error: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding cache clear failed: {str(e)}")

@app.post("/cache/search/clear")
def clear_search_cache_api():
    """
    Clear search cache entries only.
    
    Returns:
        Dictionary with clearing status
    """
    try:
        clear_search_cache()
        return {
            "success": True,
            "message": "Search cache cleared successfully"
        }
    except Exception as e:
        logger.error(f"Search cache clear error: {e}")
        raise HTTPException(status_code=500, detail=f"Search cache clear failed: {str(e)}")

class CacheInvalidateFileRequest(BaseModel):
    path: str

@app.post("/cache/invalidate-file")
def invalidate_file_cache_api(req: CacheInvalidateFileRequest):
    """
    Invalidate cache entries for a specific file.
    
    Args:
        req: CacheInvalidateFileRequest containing file path
        
    Returns:
        Dictionary with invalidation status
    """
    try:
        invalidate_file_cache(req.path)
        return {
            "success": True,
            "message": f"Cache invalidated for file: {req.path}"
        }
    except Exception as e:
        logger.error(f"Cache invalidate error: {e}")
        raise HTTPException(status_code=500, detail=f"Cache invalidate failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("Starting Semantic Worker API...")
    uvicorn.run("app:app", host="0.0.0.0", port=8081, reload=True)
