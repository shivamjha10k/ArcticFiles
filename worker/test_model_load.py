#!/usr/bin/env python3
"""
Force model loading and test indexing functionality.
"""

import sys
import os
import json

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_model_loading():
    """Test model loading with detailed logging."""
    print("=== Forcing Model Loading ===")
    
    try:
        from indexer import get_model, get_model_info
        
        print("Attempting to load model...")
        model = get_model()
        print(f"Model loaded successfully: {model}")
        
        model_info = get_model_info()
        print(f"Model info after loading: {json.dumps(model_info, indent=2)}")
        
        return True
        
    except Exception as e:
        print(f"Error loading model: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_indexing():
    """Test indexing after model is loaded."""
    print("\n=== Testing Indexing ===")
    
    try:
        from indexer import index_files
        
        # Get absolute path to sample document
        sample_path = os.path.join(os.path.dirname(__file__), "sample_document.txt")
        if not os.path.exists(sample_path):
            print(f"Sample document not found at: {sample_path}")
            return None
        
        print(f"Indexing file: {sample_path}")
        
        result = index_files([sample_path])
        print(f"Indexing result: {json.dumps(result, indent=2)}")
        return result
        
    except Exception as e:
        print(f"Error during indexing: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("Starting model loading and indexing tests...\n")
    
    # Force model loading
    model_loaded = test_model_loading()
    
    if not model_loaded:
        print("Failed to load model.")
        sys.exit(1)
    
    # Test indexing
    index_result = test_indexing()
    
    print(f"\n=== Results ===")
    print(f"Model loaded: {model_loaded}")
    if index_result:
        print(f"Files indexed: {index_result.get('files_indexed', 0)}")
        print(f"Chunks indexed: {index_result.get('chunks_indexed', 0)}")
        print(f"Points created: {index_result.get('points', 0)}")
    else:
        print("Indexing failed")
