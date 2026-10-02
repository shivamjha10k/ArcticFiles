"""
Embedding Cache Module

High-performance LRU cache for storing and retrieving embeddings to avoid recomputation.
Uses memory-efficient caching with configurable size limits and TTL.
"""

import hashlib
import logging
import time
from typing import Optional, Tuple, Dict, Any, List
import numpy as np
from dataclasses import dataclass, asdict
from threading import Lock

# Try to import cachetools, fallback to dict if not available
try:
    from cachetools import LRUCache
    CACHETOOLS_AVAILABLE = True
except ImportError:
    CACHETOOLS_AVAILABLE = False
    logging.warning("cachetools not available, using fallback implementation")

from config import get_settings

logger = logging.getLogger(__name__)

class SimpleLRUCache:
    """
    Simple LRU cache implementation when cachetools is not available
    """
    def __init__(self, maxsize=1000):
        self.maxsize = maxsize
        self.cache = {}
        self.access_order = []
        
    def get(self, key, default=None):
        if key in self.cache:
            # Move to end (most recently used)
            self.access_order.remove(key)
            self.access_order.append(key)
            return self.cache[key]
        return default
    
    def __setitem__(self, key, value):
        if key in self.cache:
            self.access_order.remove(key)
        elif len(self.cache) >= self.maxsize:
            # Remove least recently used
            lru_key = self.access_order.pop(0)
            del self.cache[lru_key]
        
        self.cache[key] = value
        self.access_order.append(key)
    
    def __getitem__(self, key):
        value = self.get(key)
        if value is None:
            raise KeyError(key)
        return value
    
    def __contains__(self, key):
        return key in self.cache
    
    def __len__(self):
        return len(self.cache)
    
    def keys(self):
        return self.cache.keys()
    
    def clear(self):
        self.cache.clear()
        self.access_order.clear()
    
    def move_to_end(self, key):
        if key in self.cache:
            self.access_order.remove(key)
            self.access_order.append(key)
    
    def popitem(self, last=True):
        if not self.cache:
            raise KeyError("cache is empty")
        
        if last:
            key = self.access_order.pop()
        else:
            key = self.access_order.pop(0)
        
        value = self.cache.pop(key)
        return key, value

@dataclass
class CachedEmbedding:
    """Container for cached embedding with metadata"""
    embedding: np.ndarray
    timestamp: float
    file_hash: Optional[str] = None
    chunk_id: Optional[str] = None
    text_hash: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            **asdict(self),
            'embedding': self.embedding.tolist(),
            'embedding_shape': self.embedding.shape,
            'embedding_dtype': str(self.embedding.dtype)
        }

@dataclass
class CachedSearchResult:
    """Container for cached search results with metadata"""
    results: List[Dict[str, Any]]
    timestamp: float
    query: str
    top_k: int
    query_hash: str
    total_results: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return asdict(self)

class EmbeddingCache:
    """
    LRU cache for embeddings with size-based eviction and TTL support.
    
    Features:
    - Memory-based size calculation (bytes)
    - LRU eviction when cache is full
    - Optional TTL for cache entries
    - Thread-safe operations
    - Cache hit/miss statistics
    """
    
    def __init__(self, max_size_mb: int = 512, ttl_seconds: Optional[int] = 3600):
        """
        Initialize embedding cache.
        
        Args:
            max_size_mb: Maximum cache size in megabytes
            ttl_seconds: Time-to-live for cache entries in seconds (None = no expiry)
        """
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.ttl_seconds = ttl_seconds
        self.lock = Lock()
        
        # Initialize LRU cache with custom size calculation
        if CACHETOOLS_AVAILABLE:
            self._cache = LRUCache(maxsize=10000)  # Max items as fallback
        else:
            self._cache = SimpleLRUCache(maxsize=1000)  # Smaller fallback
        
        self._current_size = 0
        
        # Statistics
        self.stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'size_evictions': 0,
            'ttl_evictions': 0
        }
        
        logger.info(f"🚀 Initialized embedding cache: {max_size_mb}MB max, TTL: {ttl_seconds}s")
    
    def _calculate_size(self, cached_embedding: CachedEmbedding) -> int:
        """Calculate memory size of cached embedding in bytes"""
        # Base size of numpy array
        embedding_size = cached_embedding.embedding.nbytes
        
        # Add overhead for metadata (rough estimate)
        metadata_size = 200  # timestamp, hashes, etc.
        
        return embedding_size + metadata_size
    
    def _generate_key(self, text: str, file_path: Optional[str] = None, chunk_id: Optional[str] = None) -> str:
        """Generate deterministic cache key"""
        # Create composite key from available identifiers
        key_components = []
        
        if file_path and chunk_id:
            key_components.append(f"file:{file_path}:chunk:{chunk_id}")
        
        # Always include text hash for content-based caching
        text_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()[:16]
        key_components.append(f"text:{text_hash}")
        
        return ":".join(key_components)
    
    def _is_expired(self, cached_embedding: CachedEmbedding) -> bool:
        """Check if cache entry has expired"""
        if self.ttl_seconds is None:
            return False
        
        age = time.time() - cached_embedding.timestamp
        return age > self.ttl_seconds
    
    def _evict_if_needed(self, new_size: int):
        """Evict entries if adding new_size would exceed max_size"""
        while self._current_size + new_size > self.max_size_bytes and self._cache:
            # Remove least recently used item
            if CACHETOOLS_AVAILABLE:
                key, cached_embedding = self._cache.popitem(last=False)
            else:
                key, cached_embedding = self._cache.popitem(last=False)
            
            removed_size = self._calculate_size(cached_embedding)
            self._current_size -= removed_size
            self.stats['evictions'] += 1
            self.stats['size_evictions'] += 1
            
            logger.info(f"Evicted cache entry {key} ({removed_size} bytes)")
    
    def get(self, text: str, file_path: Optional[str] = None, chunk_id: Optional[str] = None) -> Optional[np.ndarray]:
        """
        Retrieve embedding from cache if available and valid.
        
        Args:
            text: Text content to look up
            file_path: Optional file path for file-based caching
            chunk_id: Optional chunk identifier
            
        Returns:
            Cached embedding array or None if not found/expired
        """
        key = self._generate_key(text, file_path, chunk_id)
        
        with self.lock:
            cached_embedding = self._cache.get(key)
            
            if cached_embedding is None:
                self.stats['misses'] += 1
                logger.info(f"❌ Cache miss for key: {key}")
                return None
            
            # Check if entry has expired
            if self._is_expired(cached_embedding):
                del self._cache[key]
                size = self._calculate_size(cached_embedding)
                self._current_size -= size
                self.stats['misses'] += 1
                self.stats['ttl_evictions'] += 1
                logger.info(f"⏰ Cache entry expired for key: {key}")
                return None
            
            # Cache hit - move to end (most recently used)
            if CACHETOOLS_AVAILABLE:
                # For cachetools.LRUCache, just access the item again to mark as recently used
                pass  # LRUCache automatically handles LRU on get/set
            else:
                self._cache.move_to_end(key)
            
            self.stats['hits'] += 1
            logger.info(f"✅ Cache hit for key: {key}")
            
            return cached_embedding.embedding.copy()  # Return copy to prevent modification
    
    def set(self, text: str, embedding: np.ndarray, file_path: Optional[str] = None, 
            chunk_id: Optional[str] = None, file_hash: Optional[str] = None):
        """
        Store embedding in cache.
        
        Args:
            text: Text content
            embedding: Embedding array to cache
            file_path: Optional file path
            chunk_id: Optional chunk identifier  
            file_hash: Optional file hash for invalidation
        """
        key = self._generate_key(text, file_path, chunk_id)
        
        # Create cached embedding entry
        cached_embedding = CachedEmbedding(
            embedding=embedding.copy(),  # Store copy to prevent external modification
            timestamp=time.time(),
            file_hash=file_hash,
            chunk_id=chunk_id,
            text_hash=hashlib.sha256(text.encode('utf-8')).hexdigest()[:16]
        )
        
        entry_size = self._calculate_size(cached_embedding)
        
        with self.lock:
            # Check if key already exists and update current size
            if key in self._cache:
                old_embedding = self._cache[key]
                old_size = self._calculate_size(old_embedding)
                self._current_size -= old_size
            
            # Evict entries if needed to make room
            self._evict_if_needed(entry_size)
            
            # Store in cache
            self._cache[key] = cached_embedding
            self._current_size += entry_size
            
            logger.info(f"💾 Cached embedding for key: {key} ({entry_size} bytes)")
    
    def invalidate_file(self, file_path: str):
        """Remove all cache entries for a specific file"""
        with self.lock:
            keys_to_remove = []
            for key in self._cache.keys():
                if f"file:{file_path}:" in key:
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                cached_embedding = self._cache[key]
                size = self._calculate_size(cached_embedding)
                del self._cache[key]
                self._current_size -= size
                self.stats['evictions'] += 1
            
            if keys_to_remove:
                logger.info(f"Invalidated {len(keys_to_remove)} cache entries for file: {file_path}")
    
    def clear(self):
        """Clear all cache entries"""
        with self.lock:
            self._cache.clear()
            self._current_size = 0
            logger.info("Cache cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self.lock:
            hit_rate = self.stats['hits'] / max(self.stats['hits'] + self.stats['misses'], 1)
            
            return {
                **self.stats.copy(),
                'hit_rate': hit_rate,
                'current_size_bytes': self._current_size,
                'current_size_mb': self._current_size / (1024 * 1024),
                'max_size_mb': self.max_size_bytes / (1024 * 1024),
                'entry_count': len(self._cache),
                'utilization': self._current_size / self.max_size_bytes if self.max_size_bytes > 0 else 0
            }

class SearchResultCache:
    """
    LRU cache for search results to avoid repeated vector database queries.
    
    Features:
    - Cache search results by query hash
    - TTL-based expiration for freshness
    - Memory-efficient storage
    - Thread-safe operations
    """
    
    def __init__(self, max_size_mb: int = 128, ttl_seconds: int = 1800):  # 30 minutes default TTL
        """
        Initialize search result cache.
        
        Args:
            max_size_mb: Maximum cache size in megabytes
            ttl_seconds: Time-to-live for search results in seconds
        """
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.ttl_seconds = ttl_seconds
        self.lock = Lock()
        
        # Use simple implementation for search results (lighter than full LRU)
        if CACHETOOLS_AVAILABLE:
            self._cache = LRUCache(maxsize=1000)  # Max 1000 different queries
        else:
            self._cache = FallbackLRUCache(maxsize=1000)
        
        self._current_size = 0
        
        # Statistics
        self.stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'ttl_evictions': 0
        }
        
        logger.info(f"💾 Initialized search cache: {max_size_mb}MB max, TTL: {ttl_seconds}s")
    
    def _generate_query_key(self, query: str, top_k: int) -> str:
        """Generate cache key for search query"""
        query_normalized = query.strip().lower()
        query_hash = hashlib.sha256(f"{query_normalized}:{top_k}".encode('utf-8')).hexdigest()[:16]
        return f"search:{query_hash}"
    
    def _calculate_result_size(self, cached_result: CachedSearchResult) -> int:
        """Calculate memory size of cached search result in bytes"""
        # Rough estimate based on result content
        base_size = 500  # Base overhead
        results_size = len(str(cached_result.results)) * 2  # Rough string size estimate
        return base_size + results_size
    
    def _is_expired(self, cached_result: CachedSearchResult) -> bool:
        """Check if search result has expired"""
        age = time.time() - cached_result.timestamp
        return age > self.ttl_seconds
    
    def _evict_if_needed(self, new_size: int):
        """Evict entries if adding new_size would exceed max_size"""
        while self._current_size + new_size > self.max_size_bytes and self._cache:
            # Remove least recently used item
            try:
                if CACHETOOLS_AVAILABLE:
                    # cachetools.LRUCache popitem() removes LRU by default
                    key, cached_result = self._cache.popitem()
                else:
                    key, cached_result = self._cache.popitem()
            except TypeError:
                # Fallback if popitem doesn't support last parameter
                key, cached_result = self._cache.popitem()
                
            removed_size = self._calculate_result_size(cached_result)
            self._current_size -= removed_size
            self.stats['evictions'] += 1
            
            logger.info(f"Evicted search cache entry {key} ({removed_size} bytes)")
    
    def get(self, query: str, top_k: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve search results from cache if available and valid.
        
        Args:
            query: Search query string
            top_k: Number of results requested
            
        Returns:
            Cached search results or None if not found/expired
        """
        key = self._generate_query_key(query, top_k)
        
        with self.lock:
            cached_result = self._cache.get(key)
            
            if cached_result is None:
                self.stats['misses'] += 1
                logger.info(f"❌ Search cache miss for query: {query[:50]}...")
                return None
            
            # Check if entry has expired
            if self._is_expired(cached_result):
                del self._cache[key]
                size = self._calculate_result_size(cached_result)
                self._current_size -= size
                self.stats['misses'] += 1
                self.stats['ttl_evictions'] += 1
                logger.info(f"⏰ Search cache entry expired for query: {query[:50]}...")
                return None
            
            # Cache hit - move to end (most recently used) if supported
            if hasattr(self._cache, 'move_to_end'):
                self._cache.move_to_end(key)
            
            self.stats['hits'] += 1
            logger.info(f"⚡ Search cache hit for query: {query[:50]}...")
            
            # Return the search results
            return {
                "query": cached_result.query,
                "top_k": cached_result.top_k,
                "results": cached_result.results,
                "total_results": cached_result.total_results,
                "cached": True,
                "cached_at": cached_result.timestamp
            }
    
    def set(self, query: str, top_k: int, results: List[Dict[str, Any]], total_results: int):
        """
        Store search results in cache.
        
        Args:
            query: Search query string
            top_k: Number of results requested
            results: Search results to cache
            total_results: Total number of results
        """
        key = self._generate_query_key(query, top_k)
        
        # Create cached search result entry
        cached_result = CachedSearchResult(
            results=results,
            timestamp=time.time(),
            query=query,
            top_k=top_k,
            query_hash=key,
            total_results=total_results
        )
        
        entry_size = self._calculate_result_size(cached_result)
        
        with self.lock:
            # Check if key already exists and update current size
            if key in self._cache:
                old_result = self._cache[key]
                old_size = self._calculate_result_size(old_result)
                self._current_size -= old_size
            
            # Evict entries if needed to make room
            self._evict_if_needed(entry_size)
            
            # Store in cache
            self._cache[key] = cached_result
            self._current_size += entry_size
            
            logger.info(f"💾 Cached search results for query: {query[:50]}... ({entry_size} bytes)")
    
    def clear(self):
        """Clear all search cache entries"""
        with self.lock:
            self._cache.clear()
            self._current_size = 0
            logger.info("Search cache cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get search cache statistics"""
        with self.lock:
            hit_rate = self.stats['hits'] / max(self.stats['hits'] + self.stats['misses'], 1)
            
            return {
                **self.stats.copy(),
                'hit_rate': hit_rate,
                'current_size_bytes': self._current_size,
                'current_size_mb': self._current_size / (1024 * 1024),
                'max_size_mb': self.max_size_bytes / (1024 * 1024),
                'entry_count': len(self._cache),
                'utilization': self._current_size / self.max_size_bytes if self.max_size_bytes > 0 else 0
            }

# Global cache instance
_embedding_cache: Optional[EmbeddingCache] = None

def get_embedding_cache() -> EmbeddingCache:
    """Get global embedding cache instance"""
    global _embedding_cache
    
    if _embedding_cache is None:
        settings = get_settings()
        cache_size_mb = getattr(settings, 'EMBEDDING_CACHE_SIZE_MB', 512)
        cache_ttl = getattr(settings, 'EMBEDDING_CACHE_TTL_SECONDS', 3600)
        
        _embedding_cache = EmbeddingCache(
            max_size_mb=cache_size_mb,
            ttl_seconds=cache_ttl
        )
    
    return _embedding_cache

def cached_embed_text(text: str, file_path: Optional[str] = None, 
                     chunk_id: Optional[str] = None, 
                     compute_fn=None) -> np.ndarray:
    """
    Get embedding from cache or compute and store if not found.
    
    Args:
        text: Text to embed
        file_path: Optional file path for cache key
        chunk_id: Optional chunk ID for cache key
        compute_fn: Function to compute embedding if not cached
        
    Returns:
        Embedding array
    """
    cache = get_embedding_cache()
    
    # Try to get from cache first
    cached_embedding = cache.get(text, file_path, chunk_id)
    if cached_embedding is not None:
        return cached_embedding
    
    # Compute embedding if not cached
    if compute_fn is None:
        # Import here to avoid circular imports and use direct model access
        from indexer import get_model
        model = get_model()
        # Compute embedding directly without caching to avoid recursion
        embedding = model.encode([text], convert_to_numpy=True, normalize_embeddings=True)[0]
        # Ensure normalization
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
    else:
        embedding = compute_fn(text)
    
    # Store in cache
    cache.set(text, embedding, file_path, chunk_id)
    
    return embedding

# Global search cache instance
_search_cache: Optional[SearchResultCache] = None

def get_search_cache() -> SearchResultCache:
    """Get global search result cache instance"""
    global _search_cache
    
    if _search_cache is None:
        settings = get_settings()
        cache_size_mb = getattr(settings, 'SEARCH_CACHE_SIZE_MB', 128)
        cache_ttl = getattr(settings, 'SEARCH_CACHE_TTL_SECONDS', 1800)  # 30 minutes
        
        _search_cache = SearchResultCache(
            max_size_mb=cache_size_mb,
            ttl_seconds=cache_ttl
        )
    
    return _search_cache

def cached_search(query: str, top_k: int, search_fn) -> Dict[str, Any]:
    """
    Perform search with caching - check cache first, then search if not found.
    
    Args:
        query: Search query string
        top_k: Number of results to return
        search_fn: Function to call if not in cache (should return search results dict)
        
    Returns:
        Search results dictionary with caching metadata
    """
    cache = get_search_cache()
    
    # Try to get from cache first
    cached_results = cache.get(query, top_k)
    if cached_results is not None:
        logger.info(f"Search cache hit for query: {query[:50]}...")
        return cached_results
    
    # Not in cache, perform actual search
    logger.info(f"Search cache miss, performing vector search for: {query[:50]}...")
    results = search_fn(query, top_k)
    
    # Store in cache if results are valid
    if results and 'results' in results:
        cache.set(
            query=query,
            top_k=top_k,
            results=results['results'],
            total_results=results.get('total_results', len(results['results']))
        )
    
    # Add cache metadata to results
    if isinstance(results, dict):
        results['cached'] = False
        results['from_cache'] = False
    
    return results

def clear_search_cache():
    """Clear all search cache entries"""
    cache = get_search_cache()
    cache.clear()
    logger.info("Search cache cleared")

def get_search_cache_stats() -> Dict[str, Any]:
    """Get search cache statistics for monitoring"""
    cache = get_search_cache()
    return cache.get_stats()

def invalidate_search_cache():
    """Invalidate all search cache entries (when index is updated)"""
    clear_search_cache()
    logger.info("Search cache invalidated due to index update")
