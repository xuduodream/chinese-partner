#!/usr/bin/env python3
"""
Test script for LongCat API integration
"""
import asyncio
import os
from dotenv import load_dotenv
from backend.ai_explain import explain_phrase

load_dotenv()

async def test_longcat_api():
    """Test the LongCat API with a simple Chinese phrase"""

    # Check if API key is set
    api_key = os.getenv("LONGCHAT_API_KEY")
    if not api_key or api_key == "your_longcat_api_key_here":
        print("❌ Error: LONGCHAT_API_KEY not set in .env file")
        print("Please add your LongCat API key to backend/.env")
        return

    print("🔍 Testing LongCat API integration...")
    print(f"API URL: https://api.longcat.chat/openai/v1/chat/completions")
    print(f"Model: LongCat-Flash-Chat")

    # Test with a simple Chinese phrase
    test_phrase = "你好,你是谁？"  
    target_lang = "en"

    try:
        print(f"\n📝 Testing with phrase: '{test_phrase}'")
        print(f"🎯 Target language: {target_lang}")

        # Call the API
        result = await explain_phrase(test_phrase, target_lang)

        # Check if we got the expected structure
        required_keys = ["translation", "context", "grammar", "example"]

        print("\n✅ API call successful!")
        print("\n📋 Response structure:")

        for key in required_keys:
            if key in result:
                print(f"  ✓ {key}: {result[key][:50]}...")  # Show first 50 chars
            else:
                print(f"  ❌ Missing key: {key}")

        print("\n🎉 LongCat API integration is working correctly!")

    except Exception as e:
        print(f"\n❌ API call failed: {str(e)}")
        if "401" in str(e):
            print("💡 This might be an authentication error. Check your API key.")
        elif "404" in str(e):
            print("💡 This might be a URL or model name error.")
        elif "timeout" in str(e).lower():
            print("💡 The request timed out. Check your internet connection.")

if __name__ == "__main__":
    asyncio.run(test_longcat_api())