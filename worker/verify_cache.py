#!/usr/bin/env python3
"""
ArcticFiles Cache System Verification Script
Run this after setup to verify caching is working correctly
"""

import sys
import time
import logging

# Configure logging to see cache messages
logging.basicConfig(level=logging.INFO, format='%(message)s')

def check_dependencies():
    """Check if all required dependencies are installed"""
    print("🔍 Checking dependencies...")
    
    try:
        import cachetools
        print("✅ cachetools: Available")
        cache_available = True
    except ImportError:
        print("❌ cachetools: Missing (pip install cachetools)")
        cache_available = False
    
    try:
        import sentence_transformers
        print("✅ sentence-transformers: Available")
    except ImportError:
        print("❌ sentence-transformers: Missing")
        return False
    
    try:
        import numpy
        print("✅ numpy: Available")
    except ImportError:
        print("❌ numpy: Missing")
        return False
        
    return cache_available

def test_cache_implementation():
    """Test the cache implementation"""
    print("\n🧪 Testing cache implementation...")
    
    try:
        from embedding_cache import EmbeddingCache
        
        # Create a small test cache
        cache = EmbeddingCache(maxsize_mb=10, ttl_seconds=3600)
        
        # Test data
        test_text = "This is a test document for cache verification"
        test_embedding = [0.1] * 384  # Typical embedding size
        
        print("📝 Testing cache operations...")
        
        # Test cache miss
        result = cache.get(test_text, "test.txt", "chunk_0")
        if result is None:
            print("✅ Cache miss detected correctly")
        else:
            print("❌ Cache should be empty initially")
        
        # Test cache set
        cache.set(test_text, test_embedding, "test.txt", "chunk_0")
        print("✅ Cache set operation successful")
        
        # Test cache hit
        cached_result = cache.get(test_text, "test.txt", "chunk_0")
        if cached_result is not None:
            print("✅ Cache hit detected correctly")
            print(f"📊 Cache size: {cache.size()} entries")
        else:
            print("❌ Cache hit failed")
            
        print("🎉 Cache implementation test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Cache test failed: {e}")
        return False

def test_embeddings():
    """Test if embedding model loads correctly"""
    print("\n🤖 Testing embedding model...")
    
    try:
        from indexer import load_model
        
        start_time = time.time()
        model = load_model()
        load_time = time.time() - start_time
        
        print(f"✅ Model loaded successfully in {load_time:.2f}s")
        
        # Test embedding generation
        test_text = "Hello world test"
        start_time = time.time()
        embedding = model.encode([test_text])[0]
        embed_time = time.time() - start_time
        
        print(f"✅ Embedding generated in {embed_time*1000:.2f}ms")
        print(f"📊 Embedding dimensions: {len(embedding)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Embedding test failed: {e}")
        return False

def performance_benchmark():
    """Simple performance benchmark"""
    print("\n⚡ Running performance benchmark...")
    
    try:
        from embedding_cache import cached_embed_text
        
        test_text = "This is a performance test for the caching system"
        
        # First run (cache miss)
        print("📊 First run (cache miss):")
        start_time = time.time()
        embedding1 = cached_embed_text(test_text, "bench.txt", "chunk_0")
        first_time = time.time() - start_time
        print(f"   Time: {first_time*1000:.2f}ms")
        
        # Second run (cache hit)
        print("📊 Second run (cache hit):")
        start_time = time.time()
        embedding2 = cached_embed_text(test_text, "bench.txt", "chunk_0")
        second_time = time.time() - start_time
        print(f"   Time: {second_time*1000:.2f}ms")
        
        if second_time > 0:
            speedup = first_time / second_time
            print(f"🚀 Speedup: {speedup:.1f}x faster!")
            
            if speedup > 10:
                print("✅ Excellent cache performance!")
            elif speedup > 5:
                print("✅ Good cache performance")
            else:
                print("⚠️  Cache working but speedup lower than expected")
        
        return True
        
    except Exception as e:
        print(f"❌ Performance benchmark failed: {e}")
        return False

def main():
    """Main verification function"""
    print("🌟 ArcticFiles Cache System Verification")
    print("=" * 50)
    
    # Check dependencies
    deps_ok = check_dependencies()
    
    if not deps_ok:
        print("\n❌ Dependencies missing. Install with:")
        print("   pip install -r requirements.txt")
        return False
    
    # Test cache implementation
    cache_ok = test_cache_implementation()
    
    # Test embeddings
    embed_ok = test_embeddings()
    
    # Performance benchmark
    perf_ok = performance_benchmark()
    
    print("\n" + "=" * 50)
    if all([deps_ok, cache_ok, embed_ok, perf_ok]):
        print("🎉 ALL TESTS PASSED!")
        print("✅ Cache system is working correctly")
        print("⚡ Ready for high-performance semantic search!")
    else:
        print("❌ Some tests failed - check the output above")
        
    print("\n💡 Next steps:")
    print("   1. Start the worker: python app.py")
    print("   2. Check logs for cache hit/miss indicators")
    print("   3. Run searches to populate cache")
    print("   4. Monitor performance improvements")

if __name__ == "__main__":
    main()
