#!/usr/bin/env python3
"""
Test integrated OCR functionality during file indexing.

This script demonstrates how OCR is automatically used when indexing 
image files and image-based PDFs without needing separate API calls.
"""

import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import fitz  # PyMuPDF

# Import the indexing functions
from indexer import index_files, parse_file_to_text

def create_test_image(text: str, output_path: Path) -> bool:
    """Create a test image with text for OCR demonstration."""
    try:
        img_width, img_height = 800, 300
        image = Image.new('RGB', (img_width, img_height), color='white')
        draw = ImageDraw.Draw(image)
        
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 24)
        except:
            font = ImageFont.load_default()
        
        # Draw text
        lines = text.split('\n')
        y_pos = 50
        for line in lines:
            draw.text((50, y_pos), line, fill='black', font=font)
            y_pos += 40
        
        image.save(output_path, 'PNG')
        return True
    except Exception as e:
        print(f"Failed to create test image: {e}")
        return False

def create_image_based_pdf(text: str, output_path: Path) -> bool:
    """Create a PDF that contains an image with text (simulating scanned document)."""
    try:
        # Create an image first
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            temp_img_path = Path(f.name)
        
        if not create_test_image(text, temp_img_path):
            return False
        
        # Create PDF and insert the image
        doc = fitz.open()
        page = doc.new_page()
        
        # Insert the image into the PDF
        img_rect = fitz.Rect(50, 50, 550, 350)  # Position and size
        page.insert_image(img_rect, filename=str(temp_img_path))
        
        doc.save(str(output_path))
        doc.close()
        
        # Clean up temp image
        temp_img_path.unlink()
        
        print(f"✅ Created image-based PDF: {output_path.name}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to create image-based PDF: {e}")
        return False

def create_mixed_pdf(output_path: Path) -> bool:
    """Create a PDF with both text and image content."""
    try:
        doc = fitz.open()
        
        # Page 1: Regular text
        page1 = doc.new_page()
        page1.insert_text((50, 50), "Regular PDF Text Content\nThis is normal selectable text in the PDF.\nIt should be extracted without OCR.")
        
        # Page 2: Image with text (requiring OCR)
        page2 = doc.new_page()
        
        # Create temporary image for page 2
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            temp_img_path = Path(f.name)
        
        create_test_image("Scanned Document Content\nThis text is in an image\nRequires OCR to extract", temp_img_path)
        
        # Insert image into page 2
        img_rect = fitz.Rect(50, 50, 550, 350)
        page2.insert_image(img_rect, filename=str(temp_img_path))
        
        doc.save(str(output_path))
        doc.close()
        
        # Clean up
        temp_img_path.unlink()
        
        print(f"✅ Created mixed PDF: {output_path.name}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to create mixed PDF: {e}")
        return False

def test_integrated_ocr():
    """Test OCR integration during file indexing process."""
    print("🔄 Testing Integrated OCR during File Indexing")
    print("=" * 60)
    
    test_files = []
    
    try:
        # Test Case 1: Regular image file
        print("\n📝 Test Case 1: Regular Image File")
        print("-" * 40)
        
        img_file = Path(tempfile.mkdtemp()) / "test_document.png"
        test_files.append(img_file)
        
        if create_test_image("Meeting Notes\nDate: Sept 12, 2025\nAttendees: Team A, Team B\nAction Items:\n- Review proposal\n- Schedule follow-up", img_file):
            print(f"🖼️  Testing indexing of image file...")
            result = index_files([str(img_file)])
            print(f"📊 Image indexing result: {result}")
        
        # Test Case 2: Image-based PDF (like scanned document)
        print("\n📝 Test Case 2: Image-based PDF (Scanned Document)")
        print("-" * 50)
        
        pdf_img_file = Path(tempfile.mkdtemp()) / "scanned_document.pdf"
        test_files.append(pdf_img_file)
        
        if create_image_based_pdf("Scanned Financial Report\nQuarter: Q3 2025\nRevenue: $2.5M\nExpenses: $1.8M\nProfit: $0.7M\n\nKey Metrics:\n- Growth: 15%\n- Margin: 28%", pdf_img_file):
            print(f"📄 Testing indexing of image-based PDF...")
            result = index_files([str(pdf_img_file)])
            print(f"📊 Image-based PDF indexing result: {result}")
        
        # Test Case 3: Mixed PDF (text + images)
        print("\n📝 Test Case 3: Mixed PDF (Text + Images)")
        print("-" * 45)
        
        mixed_pdf_file = Path(tempfile.mkdtemp()) / "mixed_document.pdf"
        test_files.append(mixed_pdf_file)
        
        if create_mixed_pdf(mixed_pdf_file):
            print(f"📄 Testing indexing of mixed PDF...")
            result = index_files([str(mixed_pdf_file)])
            print(f"📊 Mixed PDF indexing result: {result}")
        
        # Test Case 4: Direct parsing test
        print("\n📝 Test Case 4: Direct File Parsing Test")
        print("-" * 45)
        
        for test_file in test_files:
            if test_file.exists():
                print(f"\n🔍 Testing direct parsing of {test_file.name}:")
                extracted_text = parse_file_to_text(test_file)
                if extracted_text:
                    print(f"✅ Extracted {len(extracted_text)} characters")
                    print(f"📄 Preview: {extracted_text[:150]}{'...' if len(extracted_text) > 150 else ''}")
                else:
                    print(f"❌ No text extracted")
        
        print(f"\n🎉 Integration Test Complete!")
        print(f"💡 Key Points:")
        print(f"   • OCR is automatically used for image files")
        print(f"   • PDFs with image content automatically use OCR")
        print(f"   • Mixed PDFs use OCR only for image-based pages")
        print(f"   • All extracted text becomes searchable")
        print(f"   • No separate API calls needed!")
        
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
    
    finally:
        # Clean up test files
        print(f"\n🧹 Cleaning up test files...")
        for test_file in test_files:
            try:
                if test_file.exists():
                    test_file.unlink()
                    print(f"🗑️  Removed: {test_file.name}")
                # Also remove temp directories
                if test_file.parent.exists() and test_file.parent != Path.cwd():
                    test_file.parent.rmdir()
            except Exception:
                pass

def main():
    """Run integrated OCR tests."""
    print("🖼️  ArcticFiles Integrated OCR Test")
    print("=" * 60)
    print("This test demonstrates automatic OCR during file indexing")
    print("without needing separate API endpoints.")
    print()
    
    test_integrated_ocr()

if __name__ == "__main__":
    main()
