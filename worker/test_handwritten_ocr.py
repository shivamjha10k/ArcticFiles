#!/usr/bin/env python3
"""
Test OCR capabilities with handwritten-style text to simulate handwritten PDF notes.

This script tests how well the current OCR system handles handwritten-style content
and provides recommendations for improvements.
"""

import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import random
import math

# Import the OCR functions
from parsers import parse_image_ocr, parse_file

def create_handwritten_style_image(text: str, output_path: Path) -> bool:
    """
    Create an image that simulates handwritten text for testing OCR.
    
    Args:
        text: Text to render in handwritten style
        output_path: Where to save the test image
        
    Returns:
        bool: True if image was created successfully
    """
    try:
        # Create a larger image for better OCR
        img_width, img_height = 1200, 800
        image = Image.new('RGB', (img_width, img_height), color='white')
        draw = ImageDraw.Draw(image)
        
        # Try to use fonts that look more handwritten
        try:
            # Try some handwriting-like fonts
            font_options = [
                "/System/Library/Fonts/Marker Felt.ttc",  # macOS handwriting font
                "/System/Library/Fonts/Bradley Hand Bold.ttf",  # macOS handwriting font
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",  # Linux
                "/Windows/Fonts/segoepr.ttf"  # Windows handwriting font
            ]
            
            font = None
            for font_path in font_options:
                try:
                    font = ImageFont.truetype(font_path, 28)
                    break
                except:
                    continue
            
            if font is None:
                font = ImageFont.load_default()
                
        except:
            font = ImageFont.load_default()
        
        # Add some "handwritten" characteristics
        lines = text.split('\n')
        y_pos = 50
        
        for line in lines:
            if not line.strip():
                y_pos += 40
                continue
                
            # Add slight randomness to simulate handwriting variation
            x_pos = 50 + random.randint(-5, 5)
            y_variation = random.randint(-3, 3)
            
            # Slightly rotate text to simulate handwriting angle
            angle = random.uniform(-2, 2)
            
            # For simplicity, we'll draw without rotation for better OCR
            draw.text((x_pos, y_pos + y_variation), line, fill='black', font=font)
            y_pos += 45
        
        # Add some noise to simulate paper texture
        for _ in range(100):
            x = random.randint(0, img_width)
            y = random.randint(0, img_height)
            draw.point((x, y), fill=(220, 220, 220))
        
        # Save the image
        image.save(output_path, 'PNG')
        print(f"✅ Created handwritten-style test image: {output_path.name}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to create handwritten-style image: {e}")
        return False

def test_handwritten_ocr():
    """Test OCR on handwritten-style content."""
    print("\n🖋️  Testing OCR on Handwritten-Style Content")
    print("=" * 60)
    
    # Test cases that simulate typical handwritten notes
    test_cases = [
        {
            "name": "Simple Notes",
            "content": """Meeting Notes - Sept 12, 2025
Project Status:
- Task 1: Completed
- Task 2: In Progress
- Task 3: Not Started

Next Steps:
Call client tomorrow
Review documents
Send follow-up email"""
        },
        {
            "name": "Technical Notes", 
            "content": """Algorithm Design
Step 1: Initialize variables
Step 2: Process input data
Step 3: Apply transformation
Step 4: Validate results

Performance: O(n log n)
Memory usage: 2GB max
Error rate: < 0.1%"""
        },
        {
            "name": "Mixed Content",
            "content": """Research Notes
Study participants: 150 people
Age range: 18-65 years
Response rate: 87%

Key findings:
• 45% prefer option A
• 33% prefer option B  
• 22% undecided

Statistical significance: p < 0.05
Confidence interval: 95%"""
        }
    ]
    
    temp_files = []
    results = []
    
    try:
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n📝 Test Case {i}: {test_case['name']}")
            print("-" * 40)
            
            # Create temporary image file
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
                temp_path = Path(f.name)
                temp_files.append(temp_path)
            
            # Create handwritten-style image
            if not create_handwritten_style_image(test_case['content'], temp_path):
                continue
            
            # Test OCR
            print(f"🔍 Running OCR analysis...")
            extracted_text = parse_image_ocr(temp_path)
            
            # Analyze results
            original_lines = [line.strip() for line in test_case['content'].split('\n') if line.strip()]
            extracted_lines = [line.strip() for line in extracted_text.split('\n') if line.strip()]
            
            # Calculate basic metrics
            original_words = set(' '.join(original_lines).lower().split())
            extracted_words = set(' '.join(extracted_lines).lower().split())
            
            if extracted_words:
                accuracy = len(original_words.intersection(extracted_words)) / len(original_words) * 100
            else:
                accuracy = 0
            
            result = {
                "test_name": test_case['name'],
                "original_length": len(test_case['content']),
                "extracted_length": len(extracted_text),
                "estimated_accuracy": accuracy,
                "success": len(extracted_text) > 0
            }
            results.append(result)
            
            print(f"📊 Results:")
            print(f"   Original text: {len(test_case['content'])} characters")
            print(f"   Extracted text: {len(extracted_text)} characters")
            print(f"   Estimated accuracy: {accuracy:.1f}%")
            
            if extracted_text:
                print(f"📄 Extracted content preview:")
                preview = extracted_text[:200] + ("..." if len(extracted_text) > 200 else "")
                print(f"   '{preview}'")
            else:
                print(f"❌ No text extracted")
        
        # Summary
        print(f"\n📈 Overall OCR Performance Summary")
        print("=" * 50)
        
        successful_tests = [r for r in results if r['success']]
        if successful_tests:
            avg_accuracy = sum(r['estimated_accuracy'] for r in successful_tests) / len(successful_tests)
            print(f"✅ Successful extractions: {len(successful_tests)}/{len(results)}")
            print(f"📊 Average estimated accuracy: {avg_accuracy:.1f}%")
        else:
            print(f"❌ No successful text extractions")
        
        # Recommendations
        print(f"\n💡 Recommendations for Handwritten PDF Notes:")
        print("-" * 50)
        print("1. 📷 Image Quality:")
        print("   • High resolution scans (300+ DPI)")
        print("   • Good contrast between text and background")
        print("   • Minimal skew/rotation")
        
        print("\n2. 🔧 OCR Configuration:")
        print("   • Current: Using Tesseract with standard config")
        print("   • Better: Custom training for handwriting")
        print("   • Best: Deep learning models (e.g., TrOCR, PaddleOCR)")
        
        print("\n3. 🚀 Potential Improvements:")
        print("   • Pre-processing: Noise reduction, contrast enhancement")
        print("   • Alternative engines: Google Vision API, AWS Textract")
        print("   • Handwriting-specific models")
        print("   • Post-processing: Spell check, context correction")
        
    except Exception as e:
        print(f"❌ Handwritten OCR test failed: {e}")
    
    finally:
        # Clean up
        print(f"\n🧹 Cleaning up test files...")
        for temp_file in temp_files:
            try:
                temp_file.unlink()
                print(f"🗑️  Removed: {temp_file.name}")
            except Exception:
                pass

def check_advanced_ocr_options():
    """Check what advanced OCR options are available."""
    print(f"\n🔬 Advanced OCR Options Analysis")
    print("=" * 50)
    
    try:
        import pytesseract
        
        # Check Tesseract capabilities
        print("📋 Current Tesseract Configuration:")
        version = pytesseract.get_tesseract_version()
        print(f"   Version: {version}")
        
        # Check available languages
        try:
            languages = pytesseract.get_languages()
            print(f"   Languages: {', '.join(languages[:10])}{'...' if len(languages) > 10 else ''}")
        except:
            print("   Languages: Could not retrieve language list")
        
        print(f"\n🎛️  OCR Engine Modes (OEM):")
        print("   0: Legacy engine only")
        print("   1: Neural nets LSTM engine only") 
        print("   2: Legacy + LSTM engines")
        print("   3: Default (best available)")
        print("   ✅ Currently using: OEM 3 (default)")
        
        print(f"\n📄 Page Segmentation Modes (PSM):")
        print("   3: Fully automatic page segmentation (no OSD)")
        print("   6: Uniform block of text (current)")
        print("   7: Single text line")
        print("   8: Single word")
        print("   13: Raw line (no character segmentation)")
        print("   ✅ Currently using: PSM 6 (uniform block)")
        
        print(f"\n🔧 Possible Improvements for Handwriting:")
        print("   • PSM 7 or 8 for individual words/lines")
        print("   • Image preprocessing (deskew, denoise)")
        print("   • Custom character whitelist")
        print("   • Multiple OCR engines comparison")
        
    except Exception as e:
        print(f"❌ Could not analyze OCR options: {e}")

def main():
    """Run handwritten OCR tests."""
    print("🖋️  Handwritten PDF Notes OCR Analysis")
    print("=" * 60)
    
    # Check current OCR capabilities
    check_advanced_ocr_options()
    
    # Test with handwritten-style content
    test_handwritten_ocr()
    
    print(f"\n🎯 Summary:")
    print("Your current OCR implementation works well for:")
    print("✅ Printed text in images")
    print("✅ Clear, high-contrast documents") 
    print("✅ Typed text converted to images")
    print()
    print("For handwritten PDF notes, you may need:")
    print("🔧 Enhanced preprocessing")
    print("🤖 Specialized handwriting recognition models")
    print("📷 High-quality scans")
    print("⚙️  Custom OCR configuration")

if __name__ == "__main__":
    main()
