"""
Text embedding and indexing utilities.

This module provides functionality for loading and caching SentenceTransformer models,
computing embeddings with LRU caching, ensuring proper Qdrant collection setup, and batch indexing files.
"""

from sentence_transformers import SentenceTransformer
import numpy as np
from pathlib import Path
from typing import List, Optional, Iterable
import logging
import uuid
import time
import asyncio
from config import get_settings
from qdrant_client_util import ensure_collection, upsert_embeddings, search
from parsers import parse_txt, parse_pdf, parse_docx, parse_image_ocr
from chunker import chunk_text
from utils import sha256_file
from embedding_cache import (
    get_embedding_cache, cached_embed_text, 
    get_search_cache, cached_search, invalidate_search_cache
)

logger = logging.getLogger(__name__)

# Global cached model and vector size
_model: Optional[SentenceTransformer] = None
_vector_size: Optional[int] = None

def get_model() -> SentenceTransformer:
    """
    Get cached SentenceTransformer model, initialize if needed.
    
    Returns:
        SentenceTransformer: Loaded and cached model instance
        
    Raises:
        RuntimeError: If model fails to load
    """
    global _model, _vector_size
    
    if _model is None:
        try:
            settings = get_settings()
            model_name = settings.EMBEDDING_MODEL
            
            logger.info(f"Loading embedding model: {model_name}")
            _model = SentenceTransformer(model_name)
            
            # Compute vector size with dummy encoding
            logger.info("Computing vector size with dummy encoding...")
            dummy_text = "This is a test sentence to determine vector dimensions."
            test_vec = _model.encode([dummy_text], convert_to_numpy=True, normalize_embeddings=True)
            _vector_size = int(test_vec.shape[-1])
            
            logger.info(f"Model loaded successfully. Vector size: {_vector_size}")
            
            # Try to ensure Qdrant collection exists (optional - don't fail if Qdrant unavailable)
            try:
                logger.info("Ensuring Qdrant collection exists...")
                if ensure_collection(_vector_size):
                    logger.info("Qdrant collection setup completed successfully")
                else:
                    logger.warning("Failed to ensure Qdrant collection - collection may need manual setup")
            except Exception as qdrant_error:
                logger.warning(f"Qdrant collection setup failed (this is OK if Qdrant isn't running): {qdrant_error}")
            
            logger.info("Indexer initialization completed")
            
        except Exception as e:
            logger.error(f"Failed to initialize embedding model: {e}")
            _model = None
            _vector_size = None
            raise RuntimeError(f"Model initialization failed: {e}")
    
    return _model

def get_vector_size() -> Optional[int]:
    """
    Get the vector size of the loaded model.
    
    Returns:
        int: Vector dimension or None if model not loaded
    """
    global _vector_size
    if _vector_size is None and _model is not None:
        # Fallback: compute vector size if not cached
        try:
            dummy_text = "test"
            test_vec = _model.encode([dummy_text], convert_to_numpy=True)
            _vector_size = int(test_vec.shape[-1])
        except Exception as e:
            logger.error(f"Failed to compute vector size: {e}")
    
    return _vector_size

def embed_texts(texts: List[str], file_path: Optional[str] = None, 
               chunk_ids: Optional[List[str]] = None, use_cache: bool = True) -> np.ndarray:
    """
    Convert texts to normalized embedding vectors with optional caching.
    
    Args:
        texts: List of text strings to embed
        file_path: Optional file path for cache key generation
        chunk_ids: Optional list of chunk IDs for cache key generation  
        use_cache: Whether to use embedding cache (default: True)
        
    Returns:
        np.ndarray: Normalized embedding vectors of shape (len(texts), vector_size)
        
    Raises:
        ValueError: If texts list is empty
        RuntimeError: If model is not properly initialized
    """
    if not texts:
        raise ValueError("Cannot embed empty text list")
    
    if not isinstance(texts, list):
        texts = list(texts)
    
    try:
        embeddings = []
        cache_misses = []
        cache_miss_indices = []
        
        if use_cache:
            cache = get_embedding_cache()
            
            # Check cache for each text
            for i, text in enumerate(texts):
                chunk_id = chunk_ids[i] if chunk_ids and i < len(chunk_ids) else None
                cached_embedding = cache.get(text, file_path, chunk_id)
                
                if cached_embedding is not None:
                    embeddings.append(cached_embedding)
                else:
                    embeddings.append(None)  # Placeholder
                    cache_misses.append(text)
                    cache_miss_indices.append(i)
            
            logger.info(f"Cache hits: {len(texts) - len(cache_misses)}, misses: {len(cache_misses)}")
        else:
            # No caching - compute all embeddings
            cache_misses = texts
            cache_miss_indices = list(range(len(texts)))
            embeddings = [None] * len(texts)
        
        # Compute embeddings for cache misses
        if cache_misses:
            model = get_model()
            
            logger.info(f"Computing embeddings for {len(cache_misses)} texts...")
            
            # Batch encode cache misses
            miss_embeddings = model.encode(
                cache_misses, 
                convert_to_numpy=True, 
                normalize_embeddings=True,
                show_progress_bar=len(cache_misses) > 100
            )
            
            # Ensure embeddings are normalized
            norms = np.linalg.norm(miss_embeddings, axis=1, keepdims=True)
            miss_embeddings = miss_embeddings / np.maximum(norms, 1e-8)
            
            # Fill in computed embeddings and cache them
            for i, miss_idx in enumerate(cache_miss_indices):
                embedding = miss_embeddings[i]
                embeddings[miss_idx] = embedding
                
                if use_cache:
                    # Cache the computed embedding
                    text = texts[miss_idx]
                    chunk_id = chunk_ids[miss_idx] if chunk_ids and miss_idx < len(chunk_ids) else None
                    cache.set(text, embedding, file_path, chunk_id)
        
        # Convert to numpy array
        result = np.array(embeddings)
        
        logger.info(f"Generated embeddings with shape: {result.shape}")
        return result
        
    except Exception as e:
        logger.error(f"Failed to embed texts: {e}")
        raise RuntimeError(f"Text embedding failed: {e}")

def embed_single_text(text: str, file_path: Optional[str] = None, 
                     chunk_id: Optional[str] = None, use_cache: bool = True) -> np.ndarray:
    """
    Convert single text to normalized embedding vector with optional caching.
    
    Args:
        text: Text string to embed
        file_path: Optional file path for cache key
        chunk_id: Optional chunk ID for cache key
        use_cache: Whether to use embedding cache (default: True)
        
    Returns:
        np.ndarray: Normalized embedding vector of shape (vector_size,)
    """
    if use_cache:
        # Use direct model access to avoid circular dependency
        cache = get_embedding_cache()
        
        # Try to get from cache first
        cached_embedding = cache.get(text, file_path, chunk_id)
        if cached_embedding is not None:
            return cached_embedding
        
        # Not in cache, compute and store
        model = get_model()
        embedding = model.encode([text], convert_to_numpy=True, normalize_embeddings=True)[0]
        
        # Ensure normalization
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
            
        # Store in cache
        cache.set(text, embedding, file_path, chunk_id)
        
        return embedding
    else:
        embeddings = embed_texts([text], file_path, [chunk_id] if chunk_id else None, use_cache=False)
        return embeddings[0]

def is_model_loaded() -> bool:
    """
    Check if the embedding model is loaded and ready.
    
    Returns:
        bool: True if model is loaded and initialized
    """
    return _model is not None and _vector_size is not None

def reload_model() -> bool:
    """
    Force reload of the embedding model.
    
    Returns:
        bool: True if reload was successful
    """
    global _model, _vector_size
    
    try:
        _model = None
        _vector_size = None
        get_model()
        return True
    except Exception as e:
        logger.error(f"Failed to reload model: {e}")
        return False

def get_model_info() -> dict:
    """
    Get information about the loaded model.
    
    Returns:
        dict: Model information including name, vector size, and status
    """
    settings = get_settings()
    
    return {
        "model_name": settings.EMBEDDING_MODEL,
        "vector_size": get_vector_size(),
        "is_loaded": is_model_loaded(),
        "qdrant_collection": settings.QDRANT_COLLECTION
    }

def parse_file_to_text(path: Path) -> str:
    """
    Parse a file to text based on its extension.
    Uses the enhanced parsers module with OCR support.
    
    Args:
        path: Path to the file to parse
        
    Returns:
        str: Extracted text content, empty string if unsupported or failed
    """
    try:
        # Use the enhanced parsers module instead of local functions
        import parsers
        
        # Show file type being processed
        suffix = path.suffix.lower()
        if suffix in [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff"]:
            print(f"🖼️  Processing image file with OCR: {path.name}")
            
        result = parsers.parse_file(path)
        
        if suffix in [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff"]:
            if result:
                print(f"✅ OCR extraction complete: {len(result)} characters from {path.name}")
            else:
                print(f"⚠️  OCR completed but no text found in {path.name}")
        
        return result
        
    except Exception as e:
        print(f"❌ Failed to parse file {path.name}: {str(e)}")
        logger.warning(f"Failed to parse file {path}: {e}")
        return ""

def index_files(paths: List[str], user_id: Optional[int] = None) -> dict:
    """
    Index multiple files using batch processing for better performance and monitoring.
    
    Args:
        paths: List of file paths to index
        user_id: Optional user ID to scope the indexed files
        
    Returns:
        dict: Summary with files_indexed, chunks_indexed, and points counts
    """
    settings = get_settings()
    
    # Batch processing configuration
    BATCH_SIZE = settings.BATCH_SIZE  # Files per batch
    BATCH_DELAY_MS = settings.BATCH_DELAY_MS  # Delay between batches in milliseconds
    
    total_files = len(paths)
    total_file_count = 0
    total_chunk_count = 0
    total_start_time = time.time()
    
    print(f"\n🚀 BATCH INDEXING STARTED")
    print(f"📊 Total files to process: {total_files}")
    print(f"⚙️  Batch size: {BATCH_SIZE} files")
    print(f"⏱️  Batch delay: {BATCH_DELAY_MS}ms")
    print(f"{'='*60}")
    
    logger.info(f"Starting batch indexing of {total_files} files (batch_size={BATCH_SIZE}, delay={BATCH_DELAY_MS}ms)")
    
    # Split files into batches
    batches = [paths[i:i + BATCH_SIZE] for i in range(0, len(paths), BATCH_SIZE)]
    
    for batch_num, batch_paths in enumerate(batches, 1):
        batch_start_time = time.time()
        batch_file_count = 0
        batch_chunk_count = 0
        
        print(f"\n📦 BATCH {batch_num}/{len(batches)}")
        print(f"📁 Processing files {(batch_num-1)*BATCH_SIZE + 1}-{min(batch_num*BATCH_SIZE, total_files)} of {total_files}")
        print(f"⏰ Started at: {time.strftime('%H:%M:%S')}")
        
        for file_num, path_str in enumerate(batch_paths, 1):
            try:
                path = Path(path_str)
                
                # Skip non-existent or non-file paths
                if not path.exists() or not path.is_file():
                    print(f"  ⚠️  Skipping non-existent file: {path.name}")
                    continue
                
                # Parse file to text
                text = parse_file_to_text(path)
                if not text.strip():
                    print(f"  ⚠️  Skipping file with no text: {path.name}")
                    continue
                
                # Generate file hash for deduplication/tracking
                file_hash = sha256_file(str(path))
                
                # Chunk the text
                chunks = chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
                if not chunks:
                    print(f"  ⚠️  No chunks generated: {path.name}")
                    continue
                
                print(f"  📄 [{file_num:3d}/{len(batch_paths)}] {path.name[:40]:<40} -> {len(chunks):3d} chunks")
                
                # Generate chunk IDs for consistent caching
                chunk_ids = [f"chunk_{i}" for i in range(len(chunks))]
                
                # Generate embeddings for all chunks with caching
                vectors = embed_texts(chunks, file_path=str(path.resolve()), chunk_ids=chunk_ids)
                
                # Prepare metadata for each chunk
                base_meta = {
                    "file_path": str(path.resolve()),
                    "file_name": path.name,
                    "file_hash": file_hash,
                    "file_size": path.stat().st_size,
                    "file_type": path.suffix.lower(),
                }
                
                if user_id is not None:
                    base_meta["user_id"] = user_id
                
                # Generate unique IDs and payloads for each chunk
                these_ids = [str(uuid.uuid4()) for _ in chunks]
                these_payloads = [
                    {
                        **base_meta, 
                        "chunk": chunk, 
                        "chunk_index": i,
                        "chunk_size": len(chunk)
                    } 
                    for i, chunk in enumerate(chunks)
                ]
                
                # Store in Qdrant
                try:
                    success = upsert_embeddings(these_ids, vectors, these_payloads)
                    if success:
                        batch_file_count += 1
                        batch_chunk_count += len(chunks)
                        print(f"    ✅ Indexed successfully")
                    else:
                        print(f"    ❌ Failed to store embeddings")
                        
                except Exception as e:
                    print(f"    ❌ Storage error: {str(e)[:50]}...")
                    continue
                    
            except Exception as e:
                print(f"  ❌ Processing error: {path_str} - {str(e)[:50]}...")
                continue
        
        batch_duration = time.time() - batch_start_time
        total_file_count += batch_file_count
        total_chunk_count += batch_chunk_count
        
        print(f"")
        print(f"📈 BATCH {batch_num} COMPLETED")
        print(f"  ✅ Files indexed: {batch_file_count}/{len(batch_paths)}")
        print(f"  📊 Chunks created: {batch_chunk_count}")
        print(f"  ⏱️  Duration: {batch_duration:.2f}s")
        print(f"  🔥 Speed: {batch_file_count/batch_duration:.1f} files/sec")
        
        # Add delay between batches (except for the last batch)
        if batch_num < len(batches):
            print(f"  ⏸️  Pausing {BATCH_DELAY_MS}ms before next batch...")
            time.sleep(BATCH_DELAY_MS / 1000.0)
    
    total_duration = time.time() - total_start_time
    
    print(f"\n🎉 BATCH INDEXING COMPLETED")
    print(f"{'='*60}")
    print(f"📊 FINAL STATISTICS:")
    print(f"  📁 Total files processed: {total_file_count}/{total_files}")
    print(f"  📝 Total chunks created: {total_chunk_count}")
    print(f"  ⏱️  Total duration: {total_duration:.2f}s")
    print(f"  🔥 Average speed: {total_file_count/total_duration:.1f} files/sec")
    print(f"  📦 Batches processed: {len(batches)}")
    print(f"  ⚙️  Batch efficiency: {(total_file_count/total_files)*100:.1f}%")
    print(f"{'='*60}\n")
    
    summary = {
        "files_indexed": total_file_count,
        "chunks_indexed": total_chunk_count,
        "points": total_chunk_count,
        "batches_processed": len(batches),
        "total_duration": total_duration,
        "average_speed": total_file_count/total_duration if total_duration > 0 else 0
    }
    
    # Invalidate search cache since new content was indexed
    if total_file_count > 0:
        invalidate_search_cache()
        logger.info("Search cache invalidated due to new indexed content")
    
    logger.info(f"Batch indexing completed: {summary}")
    return summary

def semantic_search(query: str, top_k: int | None = None, user_id: int | None = None) -> dict:
    """
    Perform semantic search using query embedding and Qdrant vector search with caching.
    
    Args:
        query: Search query string
        top_k: Maximum number of results to return (uses MAX_TOP_K if None)
        user_id: Optional user ID to filter results
        
    Returns:
        dict: Clean JSON response with query, top_k, and results containing 
              score, file metadata, and matched chunks
    """
    s = get_settings()
    top_k = top_k or s.MAX_TOP_K
    
    def perform_vector_search(query_text: str, k: int) -> dict:
        """Internal function to perform actual vector search"""
        try:
            # Embed the query with caching (queries are often repeated)
            qvec = embed_single_text(query_text, file_path=None, chunk_id=f"query_{hash(query_text)}")
            
            # Prepare filter
            filter_conditions = None
            if user_id is not None:
                filter_conditions = {"user_id": user_id}
                
            # Perform Qdrant search
            results = search(qvec, k, filter_conditions=filter_conditions)
            
            # Format results into clean JSON structure
            items = []
            for r in results:
                payload = r.get("payload", {})
                items.append({
                    "score": float(r.get("score", 0.0)),
                    "file_path": payload.get("file_path"),
                    "file_name": payload.get("file_name"),
                    "chunk": payload.get("chunk"),
                    "chunk_index": payload.get("chunk_index"),
                    "file_type": payload.get("file_type"),
                    "file_size": payload.get("file_size"),
                    "chunk_size": payload.get("chunk_size")
                })
            
            return {
                "query": query_text,
                "top_k": k,
                "results": items,
                "total_results": len(items)
            }
            
        except Exception as e:
            logger.error(f"Error in vector search: {e}")
            return {
                "query": query_text,
                "top_k": k,
                "results": [],
                "total_results": 0,
                "error": str(e)
            }
    
    try:
        # Use cached search - checks cache first, then performs vector search if needed
        return cached_search(query, top_k, perform_vector_search)
        
    except Exception as e:
        logger.error(f"Error in semantic search: {e}")
        return {
            "query": query,
            "top_k": top_k,
            "results": [],
            "total_results": 0,
            "error": str(e)
        }

def invalidate_file_cache(file_path: str):
    """
    Invalidate cache entries for a specific file.
    Call this when a file is updated or deleted.
    
    Args:
        file_path: Path to the file to invalidate
    """
    cache = get_embedding_cache()
    cache.invalidate_file(file_path)
    logger.info(f"Invalidated embedding cache for file: {file_path}")

def get_cache_stats() -> dict:
    """
    Get embedding cache statistics for monitoring.
    
    Returns:
        dict: Cache statistics including hit rate, size, utilization
    """
    cache = get_embedding_cache()
    return cache.get_stats()

def clear_embedding_cache():
    """Clear all embedding cache entries"""
    cache = get_embedding_cache()
    cache.clear()
    logger.info("Embedding cache cleared")

def get_search_cache_stats() -> dict:
    """
    Get search cache statistics for monitoring.
    
    Returns:
        dict: Search cache statistics including hit rate, size, utilization
    """
    from embedding_cache import get_search_cache_stats
    return get_search_cache_stats()

def clear_search_cache():
    """Clear all search cache entries"""
    from embedding_cache import clear_search_cache
    clear_search_cache()

def get_combined_cache_stats() -> dict:
    """Get combined statistics for both embedding and search caches"""
    embedding_stats = get_cache_stats()
    search_stats = get_search_cache_stats()
    
    return {
        "embedding_cache": embedding_stats,
        "search_cache": search_stats,
        "total_cache_size_mb": embedding_stats.get('current_size_mb', 0) + search_stats.get('current_size_mb', 0)
    }

def reindex_file_with_cache_invalidation(file_path: str, user_id: Optional[int] = None) -> dict:
    """
    Reindex a single file with cache invalidation.
    Useful when a file is updated.
    
    Args:
        file_path: Path to file to reindex
        user_id: Optional user ID
        
    Returns:
        dict: Indexing summary
    """
    # First invalidate cache entries for this file
    invalidate_file_cache(file_path)
    
    # Then reindex
    result = index_files([file_path], user_id)
    
    # Search cache is already invalidated by index_files if successful
    return result
