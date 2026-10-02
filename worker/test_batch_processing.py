#!/usr/bin/env python3
"""
Test script for batch processing functionality.
Creates sample files and tests the batch indexing system.
"""

import os
import tempfile
from pathlib import Path
from indexer import index_files

def create_test_files(count: int = 10) -> list[str]:
    """Create test files for batch processing demonstration."""
    test_dir = Path(tempfile.mkdtemp(prefix="batch_test_"))
    file_paths = []
    
    for i in range(count):
        file_path = test_dir / f"test_file_{i:03d}.txt"
        content = f"""This is test file number {i}.
It contains some sample content for testing batch processing.
The file has multiple sentences to test semantic chunking.
This file was created automatically for testing purposes.
File index: {i}
Total files in batch: {count}
"""
        file_path.write_text(content)
        file_paths.append(str(file_path))
    
    print(f"Created {count} test files in: {test_dir}")
    return file_paths

def main():
    print("🧪 BATCH PROCESSING TEST")
    print("=" * 50)
    
    # Test with different file counts
    test_cases = [
        ("Small batch", 15),
        ("Medium batch", 150),
        ("Large batch", 1250),
    ]
    
    for test_name, file_count in test_cases:
        print(f"\n🔬 {test_name}: {file_count} files")
        print("-" * 30)
        
        # Create test files
        file_paths = create_test_files(file_count)
        
        try:
            # Run batch indexing
            result = index_files(file_paths)
            
            print(f"\n✅ {test_name} completed successfully!")
            print(f"Files indexed: {result['files_indexed']}")
            print(f"Chunks created: {result['chunks_indexed']}")
            
            # Cleanup
            for file_path in file_paths:
                os.unlink(file_path)
            os.rmdir(Path(file_paths[0]).parent)
            
        except Exception as e:
            print(f"❌ {test_name} failed: {e}")
            # Cleanup on error
            for file_path in file_paths:
                try:
                    os.unlink(file_path)
                except:
                    pass
            try:
                os.rmdir(Path(file_paths[0]).parent)
            except:
                pass

if __name__ == "__main__":
    main()
