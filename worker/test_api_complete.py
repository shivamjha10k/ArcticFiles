#!/usr/bin/env python3
"""
Final comprehensive test of the Semantic Worker API
"""

import requests
import json
import time

BASE_URL = "http://localhost:8081"

def test_health():
    """Test health endpoint"""
    print("=== Testing Health Endpoint ===")
    try:
        response = requests.get(f"{BASE_URL}/health")
        data = response.json()
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(data, indent=2)}")
        
        model_info = data.get('model_info', {})
        is_loaded = model_info.get('is_loaded', False)
        vector_size = model_info.get('vector_size')
        
        print(f"✅ Model loaded: {is_loaded}")
        print(f"✅ Vector size: {vector_size}")
        
        return is_loaded and vector_size is not None
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_indexing():
    """Test document indexing"""
    print("\n=== Testing Document Indexing ===")
    try:
        payload = {
            "paths": ["/Users/shivam/Desktop/arcticfiles/worker/sample_document.txt"]
        }
        
        response = requests.post(f"{BASE_URL}/index", json=payload)
        data = response.json()
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(data, indent=2)}")
        
        files_indexed = data.get('files_indexed', 0)
        chunks_indexed = data.get('chunks_indexed', 0)
        points = data.get('points', 0)
        
        success = files_indexed > 0 and chunks_indexed > 0 and points > 0
        print(f"{'✅' if success else '❌'} Indexing result: {files_indexed} files, {chunks_indexed} chunks, {points} points")
        
        return success
    except Exception as e:
        print(f"❌ Indexing failed: {e}")
        return False

def test_search():
    """Test semantic search"""
    print("\n=== Testing Semantic Search ===")
    try:
        payload = {
            "query": "machine learning algorithms",
            "top_k": 3
        }
        
        response = requests.post(f"{BASE_URL}/search", json=payload)
        data = response.json()
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(data, indent=2)}")
        
        total_results = data.get('total_results', 0)
        results = data.get('results', [])
        
        success = total_results > 0 and len(results) > 0
        print(f"{'✅' if success else '❌'} Search result: {total_results} results found")
        
        if results:
            print(f"Top result score: {results[0].get('score', 0):.3f}")
        
        return success
    except Exception as e:
        print(f"❌ Search failed: {e}")
        return False

def main():
    print("🚀 Testing Semantic Worker API...")
    print("Make sure the server is running on http://localhost:8081\n")
    
    # Wait a moment for server to be ready
    time.sleep(2)
    
    # Run tests
    health_ok = test_health()
    if not health_ok:
        print("\n❌ Health check failed. Make sure the server is running and model is loaded.")
        return
    
    index_ok = test_indexing()
    if not index_ok:
        print("\n❌ Indexing failed. Check server logs for errors.")
        return
    
    search_ok = test_search()
    
    print(f"\n=== Final Results ===")
    print(f"Health: {'✅' if health_ok else '❌'}")
    print(f"Indexing: {'✅' if index_ok else '❌'}")
    print(f"Search: {'✅' if search_ok else '❌'}")
    
    if health_ok and index_ok and search_ok:
        print("\n🎉 All tests passed! The API is working correctly.")
    else:
        print("\n❌ Some tests failed. Check the logs above.")

if __name__ == "__main__":
    main()
