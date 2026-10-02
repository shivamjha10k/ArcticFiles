#!/usr/bin/env python3
"""
Direct test of the indexing functionality to debug the issue.
"""

import sys
import os
import json

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from indexer import index_files, semantic_search, get_model_info
from config import get_settings

def test_model_loading():
    """Test if the model loads correctly."""
    print("=== Testing Model Loading ===")
    try:
        model_info = get_model_info()
        print(f"Model info: {json.dumps(model_info, indent=2)}")
        return model_info.get('is_loaded', False)
    except Exception as e:
        print(f"Error getting model info: {e}")
        return False

def test_indexing():
    """Test indexing of the sample document."""
    print("\n=== Testing Indexing ===")
    
    # Get absolute path to sample document
    sample_path = os.path.join(os.path.dirname(__file__), "sample_document.txt")
    if not os.path.exists(sample_path):
        print(f"Sample document not found at: {sample_path}")
        return None
    
    print(f"Indexing file: {sample_path}")
    
    try:
        result = index_files([sample_path])
        print(f"Indexing result: {json.dumps(result, indent=2)}")
        return result
    except Exception as e:
        print(f"Error during indexing: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_search():
    """Test semantic search."""
    print("\n=== Testing Search ===")
    
    try:
        result = semantic_search("machine learning algorithms", 3)
        print(f"Search result: {json.dumps(result, indent=2)}")
        return result
    except Exception as e:
        print(f"Error during search: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("Starting direct tests...\n")
    
    # Test 1: Model loading
    model_loaded = test_model_loading()
    
    if not model_loaded:
        print("Model not loaded, cannot proceed with indexing tests.")
        sys.exit(1)
    
    # Test 2: Indexing
    index_result = test_indexing()
    
    if index_result is None:
        print("Indexing failed, cannot proceed with search tests.")
        sys.exit(1)
    
    # Test 3: Search
    search_result = test_search()
    
    print("\n=== Test Summary ===")
    print(f"Model loaded: {model_loaded}")
    print(f"Files indexed: {index_result.get('files_indexed', 0) if index_result else 0}")
    print(f"Chunks indexed: {index_result.get('chunks_indexed', 0) if index_result else 0}")
    print(f"Search results found: {search_result.get('total_results', 0) if search_result else 0}")
