#!/usr/bin/env python3
"""
Simple demonstration of parsers functionality with real examples.
"""

import logging
from pathlib import Path
import tempfile

# Configure logging
logging.basicConfig(level=logging.INFO)

from config import get_settings
import parsers

def demo_text_chunking():
    """Demonstrate text chunking with different parameters."""
    print("=== Text Chunking Demo ===\n")
    
    # Sample document text
    sample_text = """
    Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed. It focuses on the development of computer programs that can access data and use it to learn for themselves.

    The process of learning begins with observations or data, such as examples, direct experience, or instruction, in order to look for patterns in data and make better decisions in the future based on the examples that we provide. The primary aim is to allow the computers to learn automatically without human intervention or assistance and adjust actions accordingly.

    Vector embeddings are a fundamental concept in modern machine learning and natural language processing. They represent words, phrases, or entire documents as dense numerical vectors in a high-dimensional space, where semantically similar items are positioned closer together.
    """.strip()
    
    # Get settings from config
    settings = get_settings()
    
    print(f"Original text length: {len(sample_text)} characters")
    print(f"Using config settings - Chunk size: {settings.CHUNK_SIZE}, Overlap: {settings.CHUNK_OVERLAP}")
    
    # Chunk using config settings
    chunks = parsers.chunk_text(sample_text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
    
    print(f"\nGenerated {len(chunks)} chunks:")
    print("-" * 60)
    
    for i, chunk in enumerate(chunks, 1):
        print(f"Chunk {i} ({len(chunk)} chars):")
        print(f"'{chunk[:100]}{'...' if len(chunk) > 100 else ''}'")
        print()
    
    # Show overlap demonstration
    if len(chunks) > 1:
        print("Overlap demonstration:")
        print(f"End of chunk 1: '...{chunks[0][-50:]}'")
        print(f"Start of chunk 2: '{chunks[1][:50]}...'")

def demo_file_parsing():
    """Demonstrate file parsing capabilities."""
    print("\n=== File Parsing Demo ===\n")
    
    # Create sample files for testing
    test_files = []
    
    # 1. Text file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
        content = "This is a sample text file.\nIt has multiple lines.\nFor testing the parser."
        f.write(content)
        test_files.append((Path(f.name), 'Text', content))
    
    # 2. Markdown file (treated as text)
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as f:
        content = "# Markdown Test\n\nThis is a **markdown** file with *formatting*.\n\n- Item 1\n- Item 2"
        f.write(content)
        test_files.append((Path(f.name), 'Markdown', content))
    
    # Test parsing each file
    for file_path, file_type, expected_content in test_files:
        try:
            print(f"Parsing {file_type} file: {file_path.name}")
            
            # Get parser
            parser = parsers.get_file_parser(file_path)
            if parser:
                print(f"  Parser found: {parser.__name__}")
                
                # Parse file
                parsed_content = parsers.parse_file(file_path)
                print(f"  Parsed length: {len(parsed_content)} chars")
                print(f"  Content preview: {parsed_content[:100]}{'...' if len(parsed_content) > 100 else ''}")
                
                # Check if content matches
                content_matches = expected_content.strip() == parsed_content.strip()
                print(f"  ✓ Content matches expected: {content_matches}")
                
            else:
                print(f"  ✗ No parser found for {file_type}")
                
        except Exception as e:
            print(f"  ✗ Error parsing {file_type}: {e}")
        
        print()
    
    # Clean up
    for file_path, _, _ in test_files:
        try:
            file_path.unlink()
        except:
            pass

def demo_chunking_with_parsing():
    """Demonstrate parsing a file and then chunking the result."""
    print("\n=== File Parsing + Chunking Demo ===\n")
    
    # Create a longer sample document
    long_content = """
    Natural Language Processing (NLP) is a branch of artificial intelligence that gives machines the ability to read, understand and derive meaning from human languages. It combines computational linguistics with statistical, machine learning, and deep learning models.

    The field of NLP has evolved significantly over the past few decades. Early approaches relied heavily on rule-based systems and linguistic knowledge. However, modern NLP leverages machine learning techniques and large datasets to achieve better performance.

    One of the key challenges in NLP is dealing with the ambiguity and complexity of human language. Words can have multiple meanings depending on context, and the same idea can be expressed in many different ways.

    Recent advances in transformer architectures, such as BERT and GPT, have revolutionized the field by enabling models to understand context and generate human-like text. These models are trained on massive amounts of text data and can perform a wide variety of language tasks.

    Vector embeddings play a crucial role in modern NLP systems. They convert words and sentences into numerical representations that capture semantic meaning, enabling machines to work with text in mathematical ways.
    """.strip()
    
    # Save to temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
        f.write(long_content)
        temp_path = Path(f.name)
    
    try:
        # Parse the file
        print("1. Parsing document...")
        parsed_text = parsers.parse_file(temp_path)
        print(f"   Parsed text length: {len(parsed_text)} characters")
        
        # Chunk the parsed text
        print("\n2. Chunking parsed text...")
        settings = get_settings()
        chunks = parsers.chunk_text(parsed_text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
        
        print(f"   Created {len(chunks)} chunks")
        print(f"   Chunk sizes: {[len(chunk) for chunk in chunks]}")
        
        # Show each chunk
        print("\n3. Generated chunks:")
        for i, chunk in enumerate(chunks, 1):
            print(f"   Chunk {i}: {len(chunk)} chars")
            print(f"   Preview: {chunk[:80]}{'...' if len(chunk) > 80 else ''}")
            print()
        
        # Demonstrate how this could be used with embeddings
        print("4. This chunked text is now ready for:")
        print("   - Converting to embeddings with indexer.embed_texts()")
        print("   - Storing in vector database with qdrant_client_util.upsert_embeddings()")
        print("   - Semantic search and retrieval")
        
    except Exception as e:
        print(f"✗ Demo failed: {e}")
    finally:
        temp_path.unlink()

def main():
    """Run all demonstrations."""
    print("📄 Parsers.py Functionality Demo\n")
    
    try:
        demo_text_chunking()
        demo_file_parsing()
        demo_chunking_with_parsing()
        
        print("\n✅ All demos completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Demo failed: {e}")

if __name__ == "__main__":
    main()
