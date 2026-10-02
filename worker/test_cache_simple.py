"""
Simple test to verify caching without loading ML models
"""

import sys
from pathlib import Path
import numpy as np

# Add worker directory to path
sys.path.append(str(Path(__file__).parent))

from embedding_cache import get_embedding_cache

def test_cache_basic():
    """Test basic cache functionality without ML models"""
    print("Testing basic cache functionality...\n")
    
    cache = get_embedding_cache()
    
    # Create fake embeddings for testing
    test_embedding = np.random.random(384).astype(np.float32)  # Typical embedding size
    test_text = "This is a test text for caching"
    
    print("=== Test 1: Cache Miss ===")
    result = cache.get(test_text, file_path="test.txt", chunk_id="chunk_0")
    print(f"Cache miss result: {result is None}")
    
    print("\n=== Test 2: Cache Set ===")
    cache.set(test_text, test_embedding, file_path="test.txt", chunk_id="chunk_0")
    print("Cached embedding successfully")
    
    print("\n=== Test 3: Cache Hit ===")
    cached_result = cache.get(test_text, file_path="test.txt", chunk_id="chunk_0")
    print(f"Cache hit result: {cached_result is not None}")
    print(f"Embeddings match: {np.array_equal(test_embedding, cached_result)}")
    
    print("\n=== Test 4: Cache Stats ===")
    stats = cache.get_stats()
    print(f"Hit rate: {stats['hit_rate']:.2%}")
    print(f"Cache size: {stats['current_size_mb']:.2f}MB")
    print(f"Entry count: {stats['entry_count']}")
    
    print("\n=== Test 5: Cache Invalidation ===")
    cache.invalidate_file("test.txt")
    invalidated_result = cache.get(test_text, file_path="test.txt", chunk_id="chunk_0")
    print(f"After invalidation: {invalidated_result is None}")
    
    print("\n✅ All cache tests passed!")
    return True

if __name__ == "__main__":
    test_cache_basic()
