# 🧪 LongCat API Integration Test

## Prerequisites
1. **LongCat API Key**: Get your API key from the LongCat platform
2. **uv**: Fast Python package manager (https://github.com/astral-sh/uv)

## Setup Instructions

### 1. Install uv (if not already installed)
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.cargo/env
```

### 2. Configure API Key
```bash
cd backend
# Edit .env file and add your LongCat API key
nano .env
```

Your `.env` file should contain:
```
LONGCHAT_API_KEY=your_actual_api_key_here
```

### 3. Run the Test

**Option A: Automated Test Script**
```bash
# Make the script executable
chmod +x test_setup.sh

# Run the test
./test_setup.sh
```

**Option B: Manual Test**
```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
cd ..
python test_longcat.py
```

## Expected Output

If everything is working correctly, you should see:
```
🔍 Testing LongCat API integration...
API URL: https://api.longcat.chat/openai/v1/chat/completions
Model: LongCat-Flash-Chat

📝 Testing with phrase: '你好'
🎯 Target language: en

✅ API call successful!

📋 Response structure:
  ✓ translation: Hello...
  ✓ context: Common greeting used in both formal and informal...
  ✓ grammar: Two-character greeting, no particles or tones...
  ✓ example: 你好吗？ (How are you?)...

🎉 LongCat API integration is working correctly!
```

## Troubleshooting

### ❌ "API key not set" error
- Make sure your `.env` file contains a valid LongCat API key
- Don't leave the placeholder `your_longcat_api_key_here`

### ❌ "401 Unauthorized" error
- Your API key might be invalid or expired
- Check if you have sufficient credits/access

### ❌ "404 Not Found" error
- The API URL or model name might be incorrect
- Verify the URL: `https://api.longcat.chat/openai/v1/chat/completions`
- Verify the model: `LongCat-Flash-Chat`

### ❌ "Timeout" error
- Check your internet connection
- The API might be temporarily unavailable

## Next Steps

Once the API test passes:
1. Start the backend server: `uv run python app.py`
2. Start the frontend: `npm run dev`
3. Test the complete image processing pipeline

🎉 Happy testing! 🎉