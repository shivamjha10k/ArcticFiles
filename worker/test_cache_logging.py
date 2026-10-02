"""
Test cache logging - should show cache messages in console
"""

import sys
import logging
from pathlib import Path

# Add worker directory to path
sys.path.append(str(Path(__file__).parent))

# Set up logging to show info messages
logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')

def test_cache_logging():
    """Test that cache messages appear in console"""
    print("Testing cache logging visibility...")
    
    try:
        from embedding_cache import get_embedding_cache
        
        # Get cache instance (should show initialization message)
        cache = get_embedding_cache()
        
        # Test cache operations
        print("\n=== Testing Cache Operations ===")
        
        # Cache miss (should show miss message)
        print("1. Testing cache miss...")
        result = cache.get("test text", "test_file.txt", "chunk_0")
        print(f"Result: {result}")
        
        # Set cache (should show caching message) 
        print("\n2. Testing cache set...")
        import numpy as np
        dummy_embedding = np.random.rand(384).astype(np.float32)
        cache.set("test text", dummy_embedding, "test_file.txt", "chunk_0")
        
        # Cache hit (should show hit message)
        print("\n3. Testing cache hit...")
        result = cache.get("test text", "test_file.txt", "chunk_0")
        print(f"Cache hit result shape: {result.shape if result is not None else 'None'}")
        
        # Test search cache
        print("\n=== Testing Search Cache ===")
        from embedding_cache import get_search_cache
        
        search_cache = get_search_cache()
        
        # Search cache miss
        print("4. Testing search cache miss...")
        search_result = search_cache.get("test query", 5)
        print(f"Search result: {search_result}")
        
        # Set search cache
        print("\n5. Testing search cache set...")
        mock_results = [{"score": 0.9, "text": "test result"}]
        search_cache.set("test query", 5, mock_results, 1)
        
        # Search cache hit
        print("\n6. Testing search cache hit...")
        search_result = search_cache.get("test query", 5)
        print(f"Search cache hit: {search_result is not None}")
        
        print("\nCache logging test completed! ✅")
        print("You should see cache-related INFO messages above.")
        
        return True
        
    except Exception as e:
        print(f"✗ Error occurred: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_cache_logging()
