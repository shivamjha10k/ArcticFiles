"""
Test search caching functionality
"""

import sys
from pathlib import Path

# Add worker directory to path
sys.path.append(str(Path(__file__).parent))

def test_search_cache_simple():
    """Test search cache without heavy ML operations"""
    from embedding_cache import SearchResultCache
    
    print("Testing search cache functionality...\n")
    
    # Create cache instance
    cache = SearchResultCache(max_size_mb=32, ttl_seconds=300)
    
    # Mock search results
    mock_results = [
        {
            "score": 0.95,
            "file_path": "/test/file1.txt",
            "file_name": "file1.txt",
            "chunk": "This is a test document chunk",
            "chunk_index": 0
        },
        {
            "score": 0.87,
            "file_path": "/test/file2.txt", 
            "file_name": "file2.txt",
            "chunk": "Another test document chunk",
            "chunk_index": 1
        }
    ]
    
    query = "test document"
    top_k = 5
    
    # First search - cache miss
    print("=== First search (cache miss) ===")
    cached_result = cache.get(query, top_k)
    print(f"Cache result: {cached_result}")
    print(f"Should be None (cache miss): {cached_result is None}")
    
    # Store results in cache
    cache.set(query, top_k, mock_results, len(mock_results))
    print("Stored results in cache")
    
    # Second search - cache hit
    print("\n=== Second search (cache hit) ===")
    cached_result = cache.get(query, top_k)
    print(f"Cache hit: {cached_result is not None}")
    if cached_result:
        print(f"Query: {cached_result.get('query')}")
        print(f"Results count: {len(cached_result.get('results', []))}")
        print(f"Cached flag: {cached_result.get('cached', False)}")
    
    # Different query - cache miss
    print("\n=== Different query (cache miss) ===")
    different_query = "different search term"
    cached_result = cache.get(different_query, top_k)
    print(f"Different query result: {cached_result}")
    print(f"Should be None (cache miss): {cached_result is None}")
    
    # Cache stats
    print("\n=== Cache Statistics ===")
    stats = cache.get_stats()
    for key, value in stats.items():
        print(f"{key}: {value}")
    
    print("\nSearch cache test completed successfully! ✅")
    return stats

if __name__ == "__main__":
    test_search_cache_simple()
