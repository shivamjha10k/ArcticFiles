#!/usr/bin/env python3
"""
Complete document processing pipeline demonstration.

This example shows how to:
1. Parse documents of different formats
2. Chunk the text appropriately
3. Generate embeddings
4. Store in vector database
5. Perform searches

This demonstrates the integration of parsers.py, indexer.py, and qdrant_client_util.py
"""

import logging
import tempfile
import uuid
from pathlib import Path
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from config import get_settings
import parsers
import indexer
import qdrant_client_util

def create_sample_documents() -> List[Path]:
    """Create sample documents for testing the pipeline."""
    documents = []
    
    # Document 1: Research paper excerpt
    doc1_content = """
    Transformer Architecture in Natural Language Processing
    
    The Transformer architecture, introduced by Vaswani et al. in 2017, has revolutionized natural language processing. Unlike traditional recurrent neural networks, Transformers rely entirely on attention mechanisms to draw global dependencies between input and output.
    
    The key innovation of the Transformer is the self-attention mechanism, which allows the model to weigh the importance of different words in a sequence when encoding each word. This enables parallel processing and better capture of long-range dependencies in text.
    
    Applications of Transformers include machine translation, text summarization, question answering, and language modeling. Modern models like BERT, GPT, and T5 are all based on the Transformer architecture.
    """
    
    # Document 2: Technical documentation
    doc2_content = """
    Vector Database Implementation Guide
    
    Vector databases are specialized databases designed to store and query high-dimensional vectors efficiently. They are essential for applications involving machine learning, particularly in similarity search and recommendation systems.
    
    Key Features:
    - Approximate Nearest Neighbor (ANN) search
    - Cosine similarity and Euclidean distance metrics
    - Horizontal scaling capabilities
    - Integration with machine learning pipelines
    
    Popular vector databases include Qdrant, Pinecone, Weaviate, and Chroma. Each offers different features and performance characteristics suitable for various use cases.
    """
    
    # Document 3: Tutorial content
    doc3_content = """
    Getting Started with Text Embeddings
    
    Text embeddings are numerical representations of text that capture semantic meaning. They convert words, sentences, or entire documents into dense vectors in a high-dimensional space.
    
    Common embedding models:
    1. Word2Vec - learns word embeddings from large text corpora
    2. GloVe - global vectors for word representation
    3. BERT - bidirectional encoder representations from transformers
    4. Sentence-BERT - generates sentence-level embeddings
    
    Applications include semantic search, document clustering, recommendation systems, and sentiment analysis. The quality of embeddings directly impacts the performance of downstream tasks.
    """
    
    # Create temporary files
    contents = [doc1_content, doc2_content, doc3_content]
    filenames = ["transformer_paper.txt", "vector_db_guide.txt", "embeddings_tutorial.txt"]
    
    for content, filename in zip(contents, filenames):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
            f.write(content.strip())
            temp_path = Path(f.name)
            # Rename to have meaningful name for demo
            new_path = temp_path.parent / filename
            temp_path.rename(new_path)
            documents.append(new_path)
    
    return documents

def process_document_pipeline(file_path: Path) -> List[Dict[str, Any]]:
    """
    Complete document processing pipeline.
    
    Args:
        file_path: Path to document to process
        
    Returns:
        List of processed chunks with metadata
    """
    settings = get_settings()
    
    # Step 1: Parse document
    logger.info(f"Parsing document: {file_path.name}")
    try:
        text_content = parsers.parse_file(file_path)
        logger.info(f"Extracted {len(text_content)} characters from {file_path.name}")
    except Exception as e:
        logger.error(f"Failed to parse {file_path}: {e}")
        return []
    
    # Step 2: Chunk text
    logger.info("Chunking text...")
    chunks = parsers.chunk_text(text_content, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
    logger.info(f"Created {len(chunks)} chunks")
    
    # Step 3: Generate embeddings
    logger.info("Generating embeddings...")
    try:
        embeddings = indexer.embed_texts(chunks)
        logger.info(f"Generated embeddings: {embeddings.shape}")
    except Exception as e:
        logger.error(f"Failed to generate embeddings: {e}")
        return []
    
    # Step 4: Prepare data for storage
    processed_chunks = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        chunk_id = f"{file_path.stem}_chunk_{i}"
        
        chunk_data = {
            "id": chunk_id,
            "text": chunk,
            "embedding": embedding,
            "metadata": {
                "source_file": file_path.name,
                "chunk_index": i,
                "char_count": len(chunk),
                "file_type": file_path.suffix,
                "processed_by": "document_pipeline"
            }
        }
        processed_chunks.append(chunk_data)
    
    return processed_chunks

def store_in_vector_db(processed_chunks: List[Dict[str, Any]]) -> bool:
    """Store processed chunks in vector database."""
    if not processed_chunks:
        return False
    
    try:
        # Extract data for storage
        ids = [chunk["id"] for chunk in processed_chunks]
        embeddings = [chunk["embedding"] for chunk in processed_chunks]
        payloads = []
        
        for chunk in processed_chunks:
            payload = chunk["metadata"].copy()
            payload["text"] = chunk["text"]  # Include text in payload for retrieval
            payloads.append(payload)
        
        # Convert embeddings list to numpy array
        import numpy as np
        embeddings_array = np.array(embeddings)
        
        # Store in Qdrant
        logger.info(f"Storing {len(ids)} chunks in vector database...")
        success = qdrant_client_util.upsert_embeddings(ids, embeddings_array, payloads)
        
        if success:
            logger.info("✓ Successfully stored chunks in vector database")
        else:
            logger.warning("✗ Failed to store chunks in vector database")
        
        return success
        
    except Exception as e:
        logger.error(f"Error storing in vector database: {e}")
        return False

def search_documents(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """Search for relevant document chunks."""
    try:
        # Generate query embedding
        logger.info(f"Searching for: '{query}'")
        query_embedding = indexer.embed_single_text(query)
        
        # Search in vector database
        results = qdrant_client_util.search(
            query_vector=query_embedding,
            top_k=top_k,
            score_threshold=0.1
        )
        
        logger.info(f"Found {len(results)} results")
        return results
        
    except Exception as e:
        logger.error(f"Search failed: {e}")
        return []

def main():
    """Run the complete document processing pipeline demo."""
    print("🔄 Complete Document Processing Pipeline Demo\n")
    
    # Create sample documents
    print("1. Creating sample documents...")
    documents = create_sample_documents()
    print(f"   Created {len(documents)} sample documents")
    
    try:
        all_processed_chunks = []
        
        # Process each document
        print("\n2. Processing documents through pipeline...")
        for doc_path in documents:
            print(f"\n   Processing: {doc_path.name}")
            chunks = process_document_pipeline(doc_path)
            if chunks:
                print(f"   ✓ Generated {len(chunks)} chunks")
                all_processed_chunks.extend(chunks)
            else:
                print(f"   ✗ Failed to process {doc_path.name}")
        
        print(f"\n   Total processed chunks: {len(all_processed_chunks)}")
        
        # Store in vector database
        print("\n3. Storing in vector database...")
        storage_success = store_in_vector_db(all_processed_chunks)
        
        if storage_success:
            # Demonstrate search
            print("\n4. Demonstrating search capabilities...")
            
            test_queries = [
                "What is the Transformer architecture?",
                "How do vector databases work?",
                "What are text embeddings used for?",
                "Machine learning applications"
            ]
            
            for query in test_queries:
                print(f"\n   Query: '{query}'")
                results = search_documents(query, top_k=2)
                
                if results:
                    for i, result in enumerate(results, 1):
                        score = result['score']
                        source = result['payload'].get('source_file', 'Unknown')
                        text_preview = result['payload'].get('text', '')[:100]
                        print(f"      {i}. Score: {score:.3f} | Source: {source}")
                        print(f"         Preview: {text_preview}...")
                else:
                    print("      No results found")
        
        else:
            print("   ⚠️  Vector database not available - showing processed chunks:")
            for chunk in all_processed_chunks[:3]:  # Show first 3 chunks
                print(f"      {chunk['id']}: {chunk['text'][:80]}...")
        
        # Show configuration used
        print("\n5. Configuration Summary:")
        settings = get_settings()
        print(f"   Chunk Size: {settings.CHUNK_SIZE}")
        print(f"   Chunk Overlap: {settings.CHUNK_OVERLAP}")
        print(f"   Embedding Model: {settings.EMBEDDING_MODEL}")
        print(f"   Vector Size: {indexer.get_vector_size()}")
        
        print("\n✅ Pipeline demo completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Pipeline demo failed: {e}")
        logger.exception("Pipeline demo failed")
    
    finally:
        # Clean up temporary files
        print("\n6. Cleaning up...")
        for doc_path in documents:
            try:
                doc_path.unlink()
                print(f"   Removed: {doc_path.name}")
            except Exception:
                pass

if __name__ == "__main__":
    main()
