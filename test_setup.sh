#!/bin/bash

# Test setup script for LongCat API integration
echo "🚀 Setting up test environment for LongCat API integration..."

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "❌ uv is not installed. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source $HOME/.cargo/env
fi

# Navigate to backend directory
cd backend

# Create virtual environment
echo "📦 Creating virtual environment..."
uv venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
uv pip install -r requirements.txt

# Check if .env file exists and has the API key
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create .env file with your LongCat API key:"
    echo "LONGCHAT_API_KEY=your_actual_api_key_here"
    exit 1
fi

# Check if API key is set
if grep -q "your_longcat_api_key_here" .env; then
    echo "❌ API key not configured!"
    echo "Please update .env file with your actual LongCat API key"
    exit 1
fi

echo "✅ Environment setup complete!"
echo "🧪 Running LongCat API test..."

# Run the test
cd ..
python test_longcat.py