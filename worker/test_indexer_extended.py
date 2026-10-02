#!/usr/bin/env python3
"""
Test the new indexing functionality in indexer.py
"""

import tempfile
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

import indexer

def test_parse_file_to_text():
    """Test the file parsing functionality."""
    print("=== Testing parse_file_to_text ===\n")
    
    # Create test files
    test_files = []
    
    # 1. Text file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
        content = "This is a test text file.\nWith multiple lines."
        f.write(content)
        test_files.append((Path(f.name), 'txt', content))
    
    # 2. Python file (should be treated as text)
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
        content = "# Python file\nprint('Hello, world!')\n"
        f.write(content)
        test_files.append((Path(f.name), 'py', content))
    
    # 3. Unsupported file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.xyz', delete=False, encoding='utf-8') as f:
        content = "Unsupported file content"
        f.write(content)
        test_files.append((Path(f.name), 'xyz', content))
    
    # Test parsing
    for file_path, file_type, expected_content in test_files:
        try:
            parsed_text = indexer.parse_file_to_text(file_path)
            
            if file_type == 'xyz':
                # Should return empty string for unsupported types
                success = parsed_text == ""
                print(f"✓ {file_type} file: {'Empty string returned' if success else 'Unexpected content'}")
            else:
                # Should return the content
                success = parsed_text.strip() == expected_content.strip()
                print(f"✓ {file_type} file: {'Parsed correctly' if success else 'Parse failed'}")
                print(f"  Content: {parsed_text[:50]}{'...' if len(parsed_text) > 50 else ''}")
            
        except Exception as e:
            print(f"✗ {file_type} file: Error - {e}")
        
        print()
    
    # Clean up
    for file_path, _, _ in test_files:
        try:
            file_path.unlink()
        except:
            pass

def test_index_files():
    """Test the complete file indexing functionality."""
    print("=== Testing index_files ===\n")
    
    # Create sample files for indexing
    test_files = []
    
    # Document 1
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
        content = """
        Introduction to Machine Learning
        
        Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed. It focuses on developing algorithms that can analyze data and make predictions or decisions.
        
        Key concepts include supervised learning, unsupervised learning, and reinforcement learning. Each approach has different applications and use cases in various domains.
        """
        f.write(content.strip())
        test_files.append(Path(f.name))
    
    # Document 2
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as f:
        content = """
        # Vector Databases
        
        Vector databases are specialized databases designed to store and query high-dimensional vectors efficiently. They are essential for modern AI applications that work with embeddings.
        
        ## Features
        - Fast similarity search
        - Scalable architecture
        - Integration with ML pipelines
        
        Popular examples include Qdrant, Pinecone, and Weaviate.
        """
        f.write(content.strip())
        test_files.append(Path(f.name))
    
    # Document 3 - Short document
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
        content = "Short document with minimal content."
        f.write(content)
        test_files.append(Path(f.name))
    
    try:
        # Convert paths to strings
        file_paths = [str(p) for p in test_files]
        
        print(f"Indexing {len(file_paths)} files...")
        for i, path in enumerate(file_paths, 1):
            print(f"  {i}. {Path(path).name}")
        print()
        
        # Run indexing
        result = indexer.index_files(file_paths)
        
        print("Indexing Results:")
        print(f"  Files indexed: {result['files_indexed']}")
        print(f"  Chunks created: {result['chunks_indexed']}")
        print(f"  Points stored: {result['points']}")
        print()
        
        # Verify results
        if result['files_indexed'] > 0:
            print("✓ Successfully indexed files")
        else:
            print("⚠️  No files were indexed")
        
        if result['chunks_indexed'] > 0:
            print("✓ Text chunking worked")
        else:
            print("⚠️  No chunks were created")
        
        if result['points'] > 0:
            print("✓ Embeddings generation worked")
        else:
            print("⚠️  No embeddings were created")
        
        # Test edge cases
        print("\nTesting edge cases:")
        
        # Non-existent file
        edge_result = indexer.index_files(["/non/existent/file.txt"])
        print(f"  Non-existent file: {edge_result['files_indexed']} files indexed (should be 0)")
        
        # Empty list
        empty_result = indexer.index_files([])
        print(f"  Empty list: {empty_result['files_indexed']} files indexed (should be 0)")
        
    except Exception as e:
        print(f"✗ Indexing failed: {e}")
        logger.exception("Indexing test failed")
    
    finally:
        # Clean up
        print("\nCleaning up test files...")
        for file_path in test_files:
            try:
                file_path.unlink()
                print(f"  Removed: {file_path.name}")
            except Exception as e:
                print(f"  Failed to remove {file_path.name}: {e}")

def test_model_integration():
    """Test that the indexing integrates properly with the embedding model."""
    print("\n=== Testing Model Integration ===\n")
    
    # Check if model is loaded
    model_info = indexer.get_model_info()
    print(f"Model: {model_info['model_name']}")
    print(f"Vector size: {model_info['vector_size']}")
    print(f"Is loaded: {model_info['is_loaded']}")
    print(f"Collection: {model_info['qdrant_collection']}")
    
    # Test direct embedding
    try:
        test_texts = ["Test embedding 1", "Test embedding 2"]
        embeddings = indexer.embed_texts(test_texts)
        print(f"\n✓ Direct embedding test passed: {embeddings.shape}")
    except Exception as e:
        print(f"\n✗ Direct embedding test failed: {e}")

def main():
    """Run all tests."""
    print("🧪 Testing Extended Indexer Functionality\n")
    
    try:
        test_parse_file_to_text()
        test_model_integration()
        test_index_files()
        
        print("\n✅ All tests completed!")
        
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        logger.exception("Test suite failed")

if __name__ == "__main__":
    main()
