#!/usr/bin/env python3
"""
Test script to verify provider refresh functionality.
"""

import requests
import json

# Test configuration
BASE_URL = "http://localhost:8000"

def test_provider_refresh():
    """Test adding a provider and verifying models are refreshed."""
    
    print("🧪 Testing Provider Refresh Functionality")
    print("=" * 50)
    
    # Test data - replace with your actual API keys for testing
    test_providers = [
        {
            "name": "openai",
            "api_key": "sk-test-key-openai"  # Replace with real key for testing
        },
        {
            "name": "groq", 
            "api_key": "gsk-test-key-groq"   # Replace with real key for testing
        }
    ]
    
    for provider_data in test_providers:
        print(f"\n📝 Testing {provider_data['name'].upper()} provider...")
        
        try:
            # Add provider (this should automatically refresh models)
            response = requests.post(
                f"{BASE_URL}/api/providers",
                json=provider_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 201:
                result = response.json()
                print(f"✅ Provider added successfully!")
                print(f"   Message: {result.get('message', 'N/A')}")
                print(f"   Models refreshed: {result.get('models_refreshed', 0)}")
                
                # Get models for this provider
                models_response = requests.get(f"{BASE_URL}/api/models?provider={provider_data['name']}")
                if models_response.status_code == 200:
                    models = models_response.json()
                    print(f"   Available models: {len(models)}")
                    for model in models[:3]:  # Show first 3 models
                        print(f"     - {model['name']}")
                    if len(models) > 3:
                        print(f"     ... and {len(models) - 3} more")
                else:
                    print(f"   ⚠️  Could not fetch models: {models_response.status_code}")
                    
            else:
                print(f"❌ Failed to add provider: {response.status_code}")
                print(f"   Error: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print(f"❌ Could not connect to {BASE_URL}")
            print("   Make sure the backend server is running!")
            break
        except Exception as e:
            print(f"❌ Error: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🏁 Test completed!")

if __name__ == "__main__":
    test_provider_refresh()
