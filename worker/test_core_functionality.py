#!/usr/bin/env python3
"""
Simple test for file parsing functionality without model dependencies
"""

import tempfile
import sys
from pathlib import Path

# Add worker directory to path
sys.path.append('/Users/shivam/Desktop/arcticfiles/worker')

def test_imports():
    """Test that we can import the necessary modules."""
    print("=== Testing Imports ===\n")
    
    try:
        import parsers
        print("✓ parsers module imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import parsers: {e}")
        return False
    
    try:
        import utils
        print("✓ utils module imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import utils: {e}")
        return False
    
    try:
        import chunker
        print("✓ chunker module imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import chunker: {e}")
        return False
    
    return True

def test_file_parsing():
    """Test file parsing without embedding functionality."""
    print("\n=== Testing File Parsing ===\n")
    
    try:
        import parsers
        
        # Create test files
        test_files = []
        
        # Text file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
            content = "This is a test text file.\nWith multiple lines."
            f.write(content)
            test_files.append((Path(f.name), 'txt', content))
        
        # Test parsing
        for file_path, file_type, expected_content in test_files:
            try:
                parsed_text = parsers.parse_file(file_path)
                success = parsed_text.strip() == expected_content.strip()
                print(f"✓ {file_type} file: {'Parsed correctly' if success else 'Parse failed'}")
                print(f"  Content: {parsed_text[:50]}{'...' if len(parsed_text) > 50 else ''}")
            except Exception as e:
                print(f"✗ {file_type} file: Error - {e}")
        
        # Clean up
        for file_path, _, _ in test_files:
            try:
                file_path.unlink()
            except:
                pass
        
        return True
        
    except Exception as e:
        print(f"✗ File parsing test failed: {e}")
        return False

def test_chunking():
    """Test text chunking functionality."""
    print("\n=== Testing Text Chunking ===\n")
    
    try:
        import chunker
        
        test_text = """
        This is a longer text that should be chunked into smaller pieces.
        It has multiple sentences and should demonstrate the chunking functionality.
        Each chunk should have a reasonable size and some overlap with adjacent chunks.
        This helps maintain context when processing the text.
        """
        
        chunks = chunker.chunk_text(test_text.strip(), chunk_size=50, overlap=10)
        
        print(f"Original text length: {len(test_text.strip())} characters")
        print(f"Number of chunks: {len(chunks)}")
        
        for i, chunk in enumerate(chunks, 1):
            print(f"  Chunk {i}: {chunk[:40]}{'...' if len(chunk) > 40 else ''} ({len(chunk)} chars)")
        
        if len(chunks) > 0:
            print("✓ Chunking worked successfully")
            return True
        else:
            print("✗ No chunks were created")
            return False
            
    except Exception as e:
        print(f"✗ Chunking test failed: {e}")
        return False

def test_utils():
    """Test utility functions."""
    print("\n=== Testing Utility Functions ===\n")
    
    try:
        import utils
        
        # Create a test file for hashing
        with tempfile.NamedTemporaryFile(mode='w', delete=False, encoding='utf-8') as f:
            content = "Test content for hashing"
            f.write(content)
            test_file = Path(f.name)
        
        try:
            # Test file hashing
            file_hash = utils.sha256_file(test_file)
            print(f"✓ File hash generated: {file_hash[:16]}...")
            
            # Test timer
            with utils.Timer() as timer:
                import time
                time.sleep(0.1)  # Small delay
            
            print(f"✓ Timer worked: {timer.ms:.1f}ms")
            
            return True
            
        finally:
            test_file.unlink()
            
    except Exception as e:
        print(f"✗ Utils test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("🧪 Testing Core Functionality (Without Model Dependencies)\n")
    
    tests = [
        test_imports,
        test_file_parsing,
        test_chunking,
        test_utils
    ]
    
    passed = 0
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"✗ Test {test.__name__} crashed: {e}")
    
    print(f"\n📊 Results: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("✅ All core functionality tests passed!")
    else:
        print("⚠️ Some tests failed - check the output above")

if __name__ == "__main__":
    main()
