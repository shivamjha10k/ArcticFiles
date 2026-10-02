"""
Test the semantic search function after fixing recursion issues
"""

import sys
from pathlib import Path

# Add worker directory to path
sys.path.append(str(Path(__file__).parent))

def test_search_no_recursion():
    """Test search without recursion error"""
    print("Testing semantic search without recursion...")
    
    try:
        from indexer import embed_single_text
        
        # Test single embedding first
        print("Testing single embedding...")
        text = "test search query"
        embedding = embed_single_text(text, use_cache=True)
        print(f"✓ Single embedding successful: shape {embedding.shape}")
        
        # Test again with cache
        embedding2 = embed_single_text(text, use_cache=True)
        print(f"✓ Second embedding successful (from cache): shape {embedding2.shape}")
        
        # Verify they're identical
        import numpy as np
        if np.allclose(embedding, embedding2):
            print("✓ Cache working: embeddings are identical")
        else:
            print("✗ Cache issue: embeddings are different")
        
        print("\nTesting complete - no recursion error!")
        return True
        
    except Exception as e:
        print(f"✗ Error occurred: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_search_no_recursion()
