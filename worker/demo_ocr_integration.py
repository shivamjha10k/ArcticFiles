#!/usr/bin/env python3
"""
Demo script to show OCR integration with the indexing system.
"""

import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# Import the indexer functions
from indexer import index_files, parse_file_to_text

def create_sample_document_image():
    """Create a sample document image for OCR testing."""
    
    # Create a larger image with multiple lines of text
    img_width, img_height = 1000, 400
    image = Image.new('RGB', (img_width, img_height), color='white')
    draw = ImageDraw.Draw(image)
    
    # Try to use a better font
    try:
        font_large = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 32)
        font_small = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 24)
    except:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Document content
    title = "ArcticFiles OCR Integration Demo"
    body_text = [
        "This document demonstrates OCR capabilities in ArcticFiles.",
        "The system can extract text from images and make it searchable.",
        "Key features include:",
        "• Automatic text recognition from images",
        "• Integration with semantic search",
        "• Support for multiple image formats (PNG, JPG, etc.)",
        "Test data: Project started on 2024-01-15",
        "Contact: support@arcticfiles.com"
    ]
    
    # Draw title
    y_pos = 30
    draw.text((50, y_pos), title, fill='black', font=font_large)
    y_pos += 60
    
    # Draw body text
    for line in body_text:
        draw.text((50, y_pos), line, fill='black', font=font_small)
        y_pos += 35
    
    return image

def main():
    """Demonstrate OCR integration with indexing."""
    print("🖼️  ArcticFiles OCR Integration Demo")
    print("=" * 50)
    
    # Create a temporary image file
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        temp_path = Path(f.name)
    
    try:
        # Create sample document image
        print("📄 Creating sample document image...")
        image = create_sample_document_image()
        image.save(temp_path, 'PNG')
        
        file_size = temp_path.stat().st_size
        print(f"✅ Created test document: {temp_path.name} ({file_size} bytes)")
        
        # Test direct OCR parsing
        print(f"\n🔍 Testing OCR text extraction...")
        extracted_text = parse_file_to_text(temp_path)
        
        if extracted_text:
            print(f"✅ OCR extraction successful!")
            print(f"📄 Extracted text ({len(extracted_text)} characters):")
            print("-" * 40)
            print(extracted_text)
            print("-" * 40)
        else:
            print(f"❌ No text extracted from image")
            return
        
        # Test full indexing pipeline
        print(f"\n🔄 Testing full indexing pipeline...")
        result = index_files([str(temp_path)])
        
        if result['files_indexed'] > 0:
            print(f"✅ Image indexed successfully!")
            print(f"📊 Statistics:")
            print(f"   • Files indexed: {result['files_indexed']}")
            print(f"   • Chunks created: {result['chunks_indexed']}")
            print(f"   • Points in database: {result['points']}")
        else:
            print(f"❌ Indexing failed")
        
        print(f"\n🎯 OCR Integration Test Complete!")
        print(f"💡 The image text is now searchable in your ArcticFiles system!")
        
    except Exception as e:
        print(f"❌ Demo failed: {e}")
    
    finally:
        # Clean up
        try:
            temp_path.unlink()
            print(f"🗑️  Cleaned up temporary file")
        except Exception:
            pass

if __name__ == "__main__":
    main()
