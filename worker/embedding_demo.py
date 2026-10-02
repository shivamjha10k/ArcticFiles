#!/usr/bin/env python3
"""
Example demonstrating the complete embedding and vector search workflow.

This example shows how to:
1. Initialize the embedding model
2. Create embeddings for documents
3. Store them in Qdrant (when available)
4. Perform similarity searches
"""

import logging
from typing import List, Dict, Any
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from config import get_settings
import indexer
import qdrant_client_util

def demonstrate_embedding_workflow():
    """Demonstrate the complete embedding and search workflow."""
    
    print("=== Document Embedding and Search Demo ===\n")
    
    # 1. Initialize and check model
    print("1. Model Initialization:")
    model_info = indexer.get_model_info()
    print(f"   Model: {model_info['model_name']}")
    print(f"   Vector Size: {model_info['vector_size']}")
    print(f"   Loaded: {model_info['is_loaded']}")
    
    # 2. Sample documents
    print("\n2. Sample Documents:")
    documents = [
        "Python is a high-level programming language",
        "Machine learning enables computers to learn from data",
        "Vector databases store and search high-dimensional data",
        "Natural language processing helps computers understand text",
        "Embeddings convert text into numerical representations"
    ]
    
    for i, doc in enumerate(documents, 1):
        print(f"   Doc {i}: {doc}")
    
    # 3. Generate embeddings
    print("\n3. Generating Embeddings:")
    try:
        embeddings = indexer.embed_texts(documents)
        print(f"   ✓ Generated {embeddings.shape[0]} embeddings")
        print(f"   ✓ Vector dimension: {embeddings.shape[1]}")
        print(f"   ✓ All vectors normalized: {np.allclose(np.linalg.norm(embeddings, axis=1), 1.0)}")
    except Exception as e:
        print(f"   ✗ Failed to generate embeddings: {e}")
        return
    
    # 4. Try to store in Qdrant (if available)
    print("\n4. Storing in Vector Database:")
    try:
        # Generate IDs and payloads
        ids = [f"doc_{i}" for i in range(len(documents))]
        payloads = [
            {
                "text": doc,
                "doc_id": i,
                "length": len(doc),
                "category": "demo"
            }
            for i, doc in enumerate(documents)
        ]
        
        # Try to store
        success = qdrant_client_util.upsert_embeddings(ids, embeddings, payloads)
        if success:
            print("   ✓ Documents stored in Qdrant successfully")
            
            # Get collection info
            collection_info = qdrant_client_util.get_collection_info()
            if collection_info:
                print(f"   ✓ Collection: {collection_info['name']}")
                print(f"   ✓ Points count: {collection_info['points_count']}")
        else:
            print("   ✗ Failed to store documents in Qdrant")
            
    except Exception as e:
        print(f"   ⚠️  Qdrant not available: {e}")
        print("   (This is normal if Qdrant server is not running)")
    
    # 5. Demonstrate similarity search
    print("\n5. Similarity Search:")
    query_text = "How do computers process human language?"
    print(f"   Query: {query_text}")
    
    try:
        # Generate query embedding
        query_embedding = indexer.embed_single_text(query_text)
        print(f"   ✓ Query embedding generated: {query_embedding.shape}")
        
        # Try vector search in Qdrant
        search_results = []
        try:
            search_results = qdrant_client_util.search(
                query_vector=query_embedding,
                top_k=3,
                score_threshold=0.1
            )
            
            if search_results:
                print("   ✓ Vector search results from Qdrant:")
                for i, result in enumerate(search_results, 1):
                    score = result['score']
                    text = result['payload'].get('text', 'N/A')
                    print(f"      {i}. Score: {score:.4f} - {text}")
            else:
                print("   ⚠️  No results from Qdrant search")
                
        except Exception as e:
            print(f"   ⚠️  Qdrant search failed: {e}")
        
        # Always show fallback similarity computation for comparison
        if not search_results:
            print("   📊 Fallback: Manual similarity computation:")
            similarities = embeddings @ query_embedding
            
            # Get top 3 most similar
            top_indices = np.argsort(similarities)[::-1][:3]
            
            for i, idx in enumerate(top_indices, 1):
                score = similarities[idx]
                text = documents[idx]
                print(f"      {i}. Score: {score:.4f} - {text}")
        
    except Exception as e:
        print(f"   ✗ Search failed: {e}")
    
    # 6. Configuration summary
    print("\n6. Configuration Summary:")
    settings = get_settings()
    print(f"   Qdrant URL: {settings.QDRANT_URL}")
    print(f"   Collection: {settings.QDRANT_COLLECTION}")
    print(f"   Embedding Model: {settings.EMBEDDING_MODEL}")
    print(f"   Chunk Size: {settings.CHUNK_SIZE}")
    print(f"   Max Results: {settings.MAX_TOP_K}")

def test_edge_cases():
    """Test edge cases and error handling."""
    
    print("\n=== Testing Edge Cases ===\n")
    
    # Test empty text list
    print("1. Testing empty text list:")
    try:
        indexer.embed_texts([])
        print("   ✗ Should have failed")
    except ValueError as e:
        print(f"   ✓ Correctly handled: {e}")
    
    # Test single text
    print("\n2. Testing single text embedding:")
    try:
        embedding = indexer.embed_single_text("Single test")
        print(f"   ✓ Single embedding shape: {embedding.shape}")
    except Exception as e:
        print(f"   ✗ Failed: {e}")
    
    # Test very long text
    print("\n3. Testing long text:")
    try:
        long_text = "Very long text. " * 1000  # 15,000+ chars
        embedding = indexer.embed_single_text(long_text)
        print(f"   ✓ Long text embedding shape: {embedding.shape}")
    except Exception as e:
        print(f"   ✗ Failed: {e}")

if __name__ == "__main__":
    try:
        demonstrate_embedding_workflow()
        test_edge_cases()
        print("\n✅ Demo completed successfully!")
    except Exception as e:
        print(f"\n❌ Demo failed: {e}")
        logger.exception("Demo failed with exception")
