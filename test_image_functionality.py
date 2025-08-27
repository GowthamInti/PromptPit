#!/usr/bin/env python3
"""
Test script to verify image functionality for visual question answering.
"""

import requests
import json
import os

# Test configuration
BASE_URL = "http://localhost:8000"

def test_image_functionality():
    """Test image upload and visual question answering."""
    
    print("🖼️  Testing Image Functionality")
    print("=" * 50)
    
    # Test data
    test_prompt = "What do you see in this image? Please describe it in detail."
    
    # Check if we have a test image
    test_image_path = "test_image.jpg"  # You can create a simple test image
    if not os.path.exists(test_image_path):
        print("⚠️  No test image found. Create a test_image.jpg file to test image functionality.")
        print("   You can use any JPG image for testing.")
        return
    
    try:
        print(f"📝 Testing visual question answering with image: {test_image_path}")
        
        # Prepare the form data
        with open(test_image_path, 'rb') as image_file:
            files = {
                'images': ('test_image.jpg', image_file, 'image/jpeg')
            }
            
            data = {
                'provider_id': '1',  # Replace with actual provider ID
                'model_id': '1',     # Replace with actual model ID (GPT-4 Vision)
                'text': test_prompt,
                'title': 'Visual Question Answering Test',
                'temperature': '0.7',
                'max_tokens': '1000'
            }
            
            # Make the request
            response = requests.post(
                f"{BASE_URL}/api/run",
                files=files,
                data=data
            )
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Visual question answering successful!")
                print(f"   Response: {result.get('output_text', 'No output')}")
                print(f"   Latency: {result.get('latency_ms', 0):.2f}ms")
                print(f"   Cost: ${result.get('cost_usd', 0):.4f}")
                
                if result.get('token_usage'):
                    usage = result['token_usage']
                    print(f"   Tokens: {usage.get('input', 0)} input, {usage.get('output', 0)} output")
                    
            else:
                print(f"❌ Failed: {response.status_code}")
                print(f"   Error: {response.text}")
                
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to {BASE_URL}")
        print("   Make sure the backend server is running!")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🏁 Test completed!")

def test_supported_file_types():
    """Test the supported file types endpoint."""
    
    print("\n📋 Testing Supported File Types")
    print("-" * 30)
    
    try:
        response = requests.get(f"{BASE_URL}/api/supported-file-types")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Supported file types retrieved successfully!")
            print(f"   Document formats: {result.get('supported_formats', [])}")
            print(f"   Image formats: {result.get('supported_images', [])}")
            print(f"   Image extensions: {result.get('image_extensions', [])}")
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"   Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to {BASE_URL}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_vision_models():
    """Test vision model detection."""
    
    print("\n👁️  Testing Vision Model Detection")
    print("-" * 30)
    
    try:
        # Get models
        response = requests.get(f"{BASE_URL}/api/models")
        
        if response.status_code == 200:
            models = response.json()
            vision_models = [m for m in models if m.get('supports_vision')]
            non_vision_models = [m for m in models if not m.get('supports_vision')]
            
            print("✅ Models retrieved successfully!")
            print(f"   Total models: {len(models)}")
            print(f"   Vision-capable models: {len(vision_models)}")
            print(f"   Text-only models: {len(non_vision_models)}")
            
            if vision_models:
                print("   Vision models:")
                for model in vision_models[:3]:  # Show first 3
                    print(f"     - {model['name']}")
                if len(vision_models) > 3:
                    print(f"     ... and {len(vision_models) - 3} more")
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"   Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to {BASE_URL}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_supported_file_types()
    test_vision_models()
    test_image_functionality()
