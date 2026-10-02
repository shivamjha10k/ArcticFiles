"""
Test script to verify embedding cache functionality
"""

import sys
import time
from pathlib import Path

# Add worker directory to path
sys.path.append(str(Path(__file__).parent))

from embedding_cache import get_embedding_cache, cached_embed_text
from indexer import get_model

def test_cache_performance():
    """Test cache performance with repeated embeddings"""
    print("Testing embedding cache performance...\n")
    
    # Initialize model first
    print("Loading embedding model...")
    model = get_model()
    print(f"Model loaded with dimension: {model.get_sentence_embedding_dimension()}\n")
    
    # Test texts
    test_texts = [
        "This is a test document for caching embeddings.",
        "Machine learning and artificial intelligence are transforming technology.",
        "File watching with chokidar enables automatic reindexing.",
        "Vector databases like Qdrant store high-dimensional embeddings efficiently."
    ]
    
    cache = get_embedding_cache()
    
    # First run - cache misses (cold cache)
    print("=== First run (cache misses) ===")
    start_time = time.time()
    embeddings_1 = []
    
    for i, text in enumerate(test_texts):
        embedding = cached_embed_text(text, file_path="test_file.txt", chunk_id=f"chunk_{i}")
        embeddings_1.append(embedding)
        print(f"Embedded text {i+1}/{len(test_texts)}")
    
    cold_time = time.time() - start_time
    print(f"Cold cache time: {cold_time:.3f}s")
    print(f"Cache stats: {cache.get_stats()}")
    print()
    
    # Second run - cache hits (warm cache)
    print("=== Second run (cache hits) ===")
    start_time = time.time()
    embeddings_2 = []
    
    for i, text in enumerate(test_texts):
        embedding = cached_embed_text(text, file_path="test_file.txt", chunk_id=f"chunk_{i}")
        embeddings_2.append(embedding)
        print(f"Embedded text {i+1}/{len(test_texts)} (from cache)")
    
    warm_time = time.time() - start_time
    print(f"Warm cache time: {warm_time:.3f}s")
    print(f"Cache stats: {cache.get_stats()}")
    print()
    
    # Verify embeddings are identical
    identical = True
    for i, (emb1, emb2) in enumerate(zip(embeddings_1, embeddings_2)):
        if not (emb1 == emb2).all():
            identical = False
            break
    
    # Performance improvement
    speedup = cold_time / warm_time if warm_time > 0 else float('inf')
    
    print("=== Results ===")
    print(f"Embeddings identical: {identical}")
    print(f"Cold cache time: {cold_time:.3f}s")
    print(f"Warm cache time: {warm_time:.3f}s") 
    print(f"Speedup: {speedup:.2f}x")
    
    final_stats = cache.get_stats()
    print(f"Final hit rate: {final_stats['hit_rate']:.2%}")
    print(f"Cache size: {final_stats['current_size_mb']:.2f}MB")
    print(f"Cache utilization: {final_stats['utilization']:.2%}")
    
    return final_stats

if __name__ == "__main__":
    test_cache_performance()
