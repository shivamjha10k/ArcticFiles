#!/usr/bin/env python3
"""
Test script for the new worker service endpoints.

This script demonstrates how to use the new endpoints:
- POST /index-directory
- POST /index-file  
- POST /reindex-file
- DELETE /remove-file
- POST /search

Usage:
    python test_new_endpoints.py
"""

import requests
import json
import os
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8081"
SAMPLE_FILE = "sample_document.txt"

def test_endpoint(method, endpoint, data=None):
    """Helper function to test an endpoint."""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url)
        elif method.upper() == "POST":
            response = requests.post(url, json=data)
        elif method.upper() == "DELETE":
            response = requests.delete(url, json=data)
        else:
            print(f"Unsupported method: {method}")
            return
        
        print(f"\n{method.upper()} {endpoint}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Error calling {endpoint}: {e}")

def main():
    """Test all the new endpoints."""
    print("Testing Semantic Worker API New Endpoints")
    print("=" * 50)
    
    # Test health check first
    test_endpoint("GET", "/health")
    
    # Get the current directory for testing
    current_dir = Path(__file__).parent
    sample_file_path = current_dir / SAMPLE_FILE
    
    # Test 1: Index a single file
    print(f"\n1. Testing /index-file with {SAMPLE_FILE}")
    if sample_file_path.exists():
        test_endpoint("POST", "/index-file", {"path": str(sample_file_path)})
    else:
        print(f"Sample file {SAMPLE_FILE} not found, skipping test")
    
    # Test 2: Search for content
    print("\n2. Testing /search")
    test_endpoint("POST", "/search", {
        "query": "machine learning",
        "top_k": 3
    })
    
    # Test 3: Re-index the same file
    print(f"\n3. Testing /reindex-file with {SAMPLE_FILE}")
    if sample_file_path.exists():
        test_endpoint("POST", "/reindex-file", {"path": str(sample_file_path)})
    
    # Test 4: Index a directory (use current directory as example)
    print(f"\n4. Testing /index-directory with current directory")
    test_endpoint("POST", "/index-directory", {"path": str(current_dir)})
    
    # Test 5: Search again to see more results
    print("\n5. Testing /search again after directory indexing")
    test_endpoint("POST", "/search", {
        "query": "API endpoints",
        "top_k": 5
    })
    
    # Test 6: Remove a file from index
    print(f"\n6. Testing /remove-file with {SAMPLE_FILE}")
    if sample_file_path.exists():
        test_endpoint("DELETE", "/remove-file", {"path": str(sample_file_path)})
    
    # Test 7: Search to verify file was removed
    print("\n7. Testing /search after file removal")
    test_endpoint("POST", "/search", {
        "query": "machine learning",
        "top_k": 3
    })
    
    print("\n" + "=" * 50)
    print("Testing completed!")

if __name__ == "__main__":
    main()
