#!/usr/bin/env python3
"""
OCR Testing Script for ArcticFiles

This script tests the OCR (Optical Character Recognition) functionality
for extracting text from images in the ArcticFiles project.
"""

import logging
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import requests
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import the local parsers module
from parsers import parse_image_ocr, parse_file

def create_test_image_with_text(text: str, output_path: Path) -> bool:
    """
    Create a test image with text for OCR testing.
    
    Args:
        text: Text to render in the image
        output_path: Where to save the test image
        
    Returns:
        bool: True if image was created successfully
    """
    try:
        # Create a white image
        img_width, img_height = 800, 200
        image = Image.new('RGB', (img_width, img_height), color='white')
        draw = ImageDraw.Draw(image)
        
        # Try to use a default font, fallback to basic if not available
        try:
            # Try to use a larger font for better OCR results
            font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 40)
        except:
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
            except:
                font = ImageFont.load_default()
        
        # Calculate text position to center it
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        x = (img_width - text_width) // 2
        y = (img_height - text_height) // 2
        
        # Draw the text in black
        draw.text((x, y), text, fill='black', font=font)
        
        # Save the image
        image.save(output_path, 'PNG')
        print(f"✅ Created test image: {output_path.name}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to create test image: {e}")
        return False

def test_ocr_locally():
    """Test OCR functionality locally using the parsers module."""
    print("\n🧪 Testing OCR Functionality Locally")
    print("=" * 50)
    
    # Create temporary test images
    test_cases = [
        "Hello World! This is a test.",
        "The quick brown fox jumps over the lazy dog.",
        "OCR Testing: 123 ABC xyz!",
        "Multi-line text\nSecond line here\nThird line with numbers: 456"
    ]
    
    temp_files = []
    
    try:
        for i, test_text in enumerate(test_cases, 1):
            print(f"\n📝 Test Case {i}: {test_text.replace(chr(10), ' | ')}")
            
            # Create temporary image file
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
                temp_path = Path(f.name)
                temp_files.append(temp_path)
            
            # Create test image
            if not create_test_image_with_text(test_text, temp_path):
                continue
            
            # Test OCR
            print(f"🔍 Running OCR on {temp_path.name}...")
            extracted_text = parse_image_ocr(temp_path)
            
            if extracted_text:
                print(f"✅ OCR Result: '{extracted_text}'")
                
                # Simple accuracy check
                original_words = set(test_text.lower().split())
                extracted_words = set(extracted_text.lower().split())
                
                if original_words.intersection(extracted_words):
                    print(f"🎯 OCR appears to be working correctly!")
                else:
                    print(f"⚠️  OCR result differs significantly from input")
            else:
                print(f"❌ No text extracted")
        
        print(f"\n🔄 Testing parse_file function...")
        if temp_files:
            # Test the general parse_file function
            test_file = temp_files[0]
            print(f"📄 Testing parse_file on {test_file.name}")
            result = parse_file(test_file)
            if result:
                print(f"✅ parse_file successfully extracted: '{result}'")
            else:
                print(f"❌ parse_file returned empty result")
        
    except Exception as e:
        print(f"❌ OCR test failed: {e}")
    
    finally:
        # Clean up temporary files
        print(f"\n🧹 Cleaning up test files...")
        for temp_file in temp_files:
            try:
                temp_file.unlink()
                print(f"🗑️  Removed: {temp_file.name}")
            except Exception:
                pass

def test_ocr_api(base_url: str = "http://localhost:8081"):
    """Test OCR functionality via the API endpoint."""
    print(f"\n🌐 Testing OCR API at {base_url}")
    print("=" * 50)
    
    # Create a test image
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        temp_path = Path(f.name)
    
    test_text = "API OCR Test: Hello from the API!"
    
    try:
        # Create test image
        if not create_test_image_with_text(test_text, temp_path):
            print("❌ Failed to create test image for API test")
            return
        
        print(f"📡 Testing /ocr-test endpoint...")
        
        # Test the OCR endpoint
        response = requests.post(
            f"{base_url}/ocr-test",
            json={"path": str(temp_path)},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ API Response: {json.dumps(result, indent=2)}")
            
            if result.get("success"):
                extracted = result.get("extractedText", "")
                print(f"🎯 OCR via API extracted: '{extracted}'")
            else:
                print(f"⚠️  API OCR completed but no text found")
        else:
            print(f"❌ API Error: {response.status_code} - {response.text}")
    
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to API at {base_url}")
        print("💡 Make sure the worker service is running")
    except Exception as e:
        print(f"❌ API test failed: {e}")
    
    finally:
        # Clean up
        try:
            temp_path.unlink()
            print(f"🗑️  Removed test file: {temp_path.name}")
        except Exception:
            pass

def check_ocr_dependencies():
    """Check if OCR dependencies are properly installed."""
    print("\n🔍 Checking OCR Dependencies")
    print("=" * 40)
    
    try:
        from PIL import Image
        print("✅ PIL (Pillow) is available")
    except ImportError:
        print("❌ PIL (Pillow) is NOT available")
        print("💡 Install with: pip install pillow")
        return False
    
    try:
        import pytesseract
        print("✅ pytesseract is available")
        
        # Try to get Tesseract version
        try:
            version = pytesseract.get_tesseract_version()
            print(f"🔢 Tesseract version: {version}")
        except Exception as e:
            print(f"⚠️  Could not get Tesseract version: {e}")
            print("💡 Make sure Tesseract OCR is installed on your system")
            print("   macOS: brew install tesseract")
            print("   Ubuntu: sudo apt-get install tesseract-ocr")
            return False
            
    except ImportError:
        print("❌ pytesseract is NOT available")
        print("💡 Install with: pip install pytesseract")
        return False
    
    print("✅ All OCR dependencies are available!")
    return True

def main():
    """Run all OCR tests."""
    print("🖼️  ArcticFiles OCR Testing Suite")
    print("=" * 60)
    
    # Check dependencies first
    if not check_ocr_dependencies():
        print("\n❌ OCR dependencies are missing. Please install them first.")
        return
    
    # Test OCR locally
    test_ocr_locally()
    
    # Test API if requested
    print(f"\n❓ Would you like to test the API endpoint as well?")
    print(f"   (Make sure the worker service is running first)")
    
    # For automated testing, we'll skip the API test
    # Uncomment the line below if you want to test the API
    # test_ocr_api()
    
    print(f"\n🎉 OCR testing completed!")
    print(f"💡 To test a real image file, use: python -c \"from parsers import parse_image_ocr; print(parse_image_ocr(Path('your_image.png')))\"")

if __name__ == "__main__":
    main()
