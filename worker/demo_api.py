#!/usr/bin/env python3
"""
Demo script to test the Semantic Worker API functionality.
"""

import requests
import json
from pathlib import Path
import time

API_BASE_URL = "http://localhost:8081"

def test_api_demo():
    """Comprehensive demo of the API functionality."""
    
    print("🚀 Semantic Worker API Demo")
    print("=" * 50)
    
    # Test 1: Health Check
    print("\n1. Testing Health Endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        if response.status_code == 200:
            health_data = response.json()
            print("✅ API is healthy!")
            print(f"   Model: {health_data['model_info']['model_name']}")
            print(f"   Vector Size: {health_data['model_info']['vector_size']}")
            print(f"   Status: {health_data['status']}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Failed to connect to API: {e}")
        return
    
    # Test 2: Index Sample Document
    print("\n2. Indexing Sample Document...")
    sample_file = Path("/Users/shivam/Desktop/arcticfiles/worker/sample_document.txt")
    
    if not sample_file.exists():
        print(f"❌ Sample file not found: {sample_file}")
        return
    
    try:
        index_payload = {
            "paths": [str(sample_file.resolve())]
        }
        
        response = requests.post(
            f"{API_BASE_URL}/index",
            json=index_payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            index_data = response.json()
            print("✅ Document indexed successfully!")
            print(f"   Files indexed: {index_data['files_indexed']}")
            print(f"   Chunks created: {index_data['chunks_indexed']}")
            print(f"   Vector points: {index_data['points']}")
        else:
            print(f"❌ Indexing failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return
    except Exception as e:
        print(f"❌ Indexing error: {e}")
        return
    
    # Wait a moment for indexing to complete
    time.sleep(2)
    
    # Test 3: Semantic Search
    print("\n3. Testing Semantic Search...")
    
    search_queries = [
        {"query": "machine learning algorithms", "description": "ML Algorithms"},
        {"query": "deep learning neural networks", "description": "Deep Learning"},
        {"query": "supervised learning examples", "description": "Supervised Learning"},
        {"query": "artificial intelligence applications", "description": "AI Applications"}
    ]
    
    for search_test in search_queries:
        print(f"\n   🔍 Searching: \"{search_test['query']}\"")
        
        try:
            search_payload = {
                "query": search_test["query"],
                "top_k": 3
            }
            
            response = requests.post(
                f"{API_BASE_URL}/search",
                json=search_payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                search_data = response.json()
                print(f"   ✅ Found {search_data['total_results']} results")
                
                for i, result in enumerate(search_data['results'][:2], 1):  # Show top 2
                    print(f"      {i}. Score: {result['score']:.4f}")
                    print(f"         File: {result['file_name']}")
                    print(f"         Chunk: {result['chunk'][:100]}...")
                    print()
            else:
                print(f"   ❌ Search failed: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Search error: {e}")
    
    # Test 4: Search without top_k (uses default)
    print("\n4. Testing Search with Default top_k...")
    try:
        search_payload = {
            "query": "reinforcement learning applications"
        }
        
        response = requests.post(
            f"{API_BASE_URL}/search",
            json=search_payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            search_data = response.json()
            print(f"✅ Default search successful!")
            print(f"   Query: {search_data['query']}")
            print(f"   Top K used: {search_data['top_k']}")
            print(f"   Results found: {search_data['total_results']}")
        else:
            print(f"❌ Default search failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Default search error: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Demo completed! Check the results above.")
    print("\n📋 API Endpoints Summary:")
    print(f"   Health: GET {API_BASE_URL}/health")
    print(f"   Index:  POST {API_BASE_URL}/index")
    print(f"   Search: POST {API_BASE_URL}/search")
    print(f"   Docs:   {API_BASE_URL}/docs")

if __name__ == "__main__":
    test_api_demo()
