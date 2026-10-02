#!/usr/bin/env python3
"""
Simple test script to validate the API functionality.
"""

import requests
import json
from pathlib import Path

API_BASE_URL = "http://localhost:8081"

def test_health_endpoint():
    """Test the health check endpoint."""
    print("Testing health endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        print(f"Health status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_index_endpoint():
    """Test the index endpoint with sample files."""
    print("\nTesting index endpoint...")
    
    # Create a sample text file for testing
    sample_file = Path("/tmp/test_sample.txt")
    with open(sample_file, "w") as f:
        f.write("This is a sample document for testing semantic search. It contains information about machine learning and artificial intelligence.")
    
    try:
        payload = {
            "paths": [str(sample_file)]
        }
        
        response = requests.post(
            f"{API_BASE_URL}/index",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Index status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Clean up
        sample_file.unlink()
        
        return response.status_code == 200
    except Exception as e:
        print(f"Index test failed: {e}")
        return False

def test_search_endpoint():
    """Test the search endpoint."""
    print("\nTesting search endpoint...")
    try:
        payload = {
            "query": "machine learning",
            "top_k": 5
        }
        
        response = requests.post(
            f"{API_BASE_URL}/search",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Search status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"Search test failed: {e}")
        return False

if __name__ == "__main__":
    print("API Testing Script")
    print("=================")
    print("Make sure the API server is running on http://localhost:8081")
    print()
    
    # Test all endpoints
    health_ok = test_health_endpoint()
    index_ok = test_index_endpoint()
    search_ok = test_search_endpoint()
    
    print(f"\nResults:")
    print(f"Health endpoint: {'✓' if health_ok else '✗'}")
    print(f"Index endpoint: {'✓' if index_ok else '✗'}")
    print(f"Search endpoint: {'✓' if search_ok else '✗'}")
    
    if all([health_ok, index_ok, search_ok]):
        print("\n🎉 All tests passed!")
    else:
        print("\n❌ Some tests failed. Check the server logs.")
