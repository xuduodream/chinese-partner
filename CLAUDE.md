# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chinese Partner is a web application that extracts Chinese text from images, explains each sentence with AI, and creates audio-enhanced flashcards for review. The app follows a client-server architecture with:

- **Backend**: Python + FastAPI for OCR, text processing, and AI explanations
- **Frontend**: React + Vite for the user interface
- **Storage**: Browser localStorage for flashcards (no database required)

## Development Commands

### Backend Development
```bash
# Setup virtual environment and install dependencies using uv
cd backend
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -r requirements.txt

# Run the FastAPI server
uv run python app.py

# Run on custom port
uv run uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Development
```bash
# Install dependencies and start development server
cd frontend
npm install
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Setup
```bash
# Create environment file for backend
cd backend
cp .env.example .env  # Add your LongCat API key to .env
```

## Code Architecture

### Backend Structure
- `backend/app.py` - Main FastAPI application with CORS and API endpoints
- `backend/ocr.py` - PaddleOCR integration for Chinese text extraction
- `backend/segment.py` - Chinese sentence segmentation using punctuation
- `backend/pinyin_helper.py` - Pinyin generation using pypinyin
- `backend/ai_explain.py` - LongCat API integration for explanations
- `backend/requirements.txt` - Python dependencies (FastAPI, PaddleOCR, pypinyin, etc.)

### Frontend Structure
- `frontend/src/App.jsx` - Main application component with routing logic
- `frontend/src/components/ImageUpload.jsx` - Image upload and processing
- `frontend/src/components/Flashcard.jsx` - Individual flashcard display
- `frontend/src/components/RevisionPage.jsx` - Flashcard review interface
- `frontend/src/utils/storage.js` - localStorage utilities for flashcards
- `frontend/src/index.css` - Responsive styling

### Key API Endpoints
- `POST /api/start-processing` - Upload image and start processing (returns job ID immediately)
- `GET /api/job-status/{job_id}` - Get real-time processing progress and status
- `POST /api/process-image` - Legacy endpoint for backward compatibility
- `GET /api/health` - Health check endpoint

### Data Flow
1. User uploads image with language selection
2. Frontend uploads image and receives job ID immediately
3. Backend processes image asynchronously with real-time progress:
   - OCR text extraction (15-30%)
   - Sentence segmentation (30-50%)
   - AI explanation generation (50-85%)
   - Pinyin generation (85-95%)
4. Frontend polls for progress updates every 500ms showing live status
5. Backend returns structured data when complete (100%)
6. Frontend displays results as interactive flashcards
7. Users can save cards to localStorage for later review
8. Review page provides audio playback and card management

## Configuration Requirements

### Environment Variables
- `LONGCHAT_API_KEY` - Required API key from LongCat platform

### File Structure Requirements
```
backend/
├── app.py                 # Main FastAPI app
├── ocr.py                 # OCR processing
├── segment.py             # Text segmentation
├── pinyin_helper.py       # Pinyin generation
├── ai_explain.py          # AI explanations
├── requirements.txt       # Dependencies
└── .env                   # API keys

frontend/
├── src/
│   ├── App.jsx           # Main component
│   ├── components/       # React components
│   ├── utils/storage.js  # LocalStorage utilities
│   └── index.css         # Styling
├── package.json          # Frontend dependencies
└── vite.config.js        # Vite configuration
```

## Testing

### Backend Testing
```bash
# Test OCR functionality
python -c "from ocr import extract_text_from_image; print(extract_text_from_image('test.jpg'))"

# Test sentence segmentation
python -c "from segment import split_sentences; print(split_sentences('你好。再见！'))"

# Test pinyin generation
python -c "from pinyin_helper import get_pinyin; print(get_pinyin('你好'))"

# Test API endpoints
curl -X GET http://localhost:8000/api/health
```

### Frontend Testing
```bash
# Test storage utilities
cd frontend
npm run build  # Verify build succeeds

# Manual testing checklist:
# 1. Image upload functionality
# 2. Language switching
# 3. Flashcard saving/deletion
# 4. Audio playback
# 5. Responsive design
```

## Common Development Tasks

### Adding New Language Support
1. Update `ai_explain.py` to add new language prompts
2. Update `App.jsx` language selector
3. Update audio language codes in flashcard components

### Extending AI Features
1. Modify prompt templates in `ai_explain.py`
2. Update response parsing in `app.py`
3. Extend flashcard data structure in frontend components

### Performance Optimizations
- Limit OCR processing to first 5 sentences (current implementation)
- Implement image preprocessing for better OCR accuracy
- Add caching for AI explanations
- **Progress Tracking**: Real-time progress updates via polling system
- **Background Processing**: Asynchronous job processing prevents UI blocking
- **Job Management**: Automatic cleanup of completed jobs after 1 hour

## Deployment Notes

### Production Considerations
- Set up proper CORS configuration
- Add rate limiting for API endpoints
- Implement proper error handling and logging
- Configure production build for frontend

### Environment Setup
```bash
# Production backend setup
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uv run uvicorn app:app --host 0.0.0.0 --port 8000

# Production frontend build
npm run build
# Serve with nginx or similar
```

## Troubleshooting

### Common Issues
- **OCR not detecting text**: Check image quality and Chinese text presence
- **API errors**: Verify LongCat API key in `.env` file
- **CORS errors**: Ensure frontend URL matches CORS configuration (default: http://localhost:5173)
- **Audio not working**: Browser may block autoplay; user interaction required
- **Missing dependencies**: Ensure all packages in requirements.txt are installed
- **Progress not updating**: Check browser console for polling errors
- **Job timeout**: Large images may take longer than 60 seconds to process

### Debug Commands
```bash
# Check backend logs
uv run python app.py

# Test API endpoints
curl -X GET http://localhost:8000/api/health
curl -X GET http://localhost:8000/api/job-status/test-job-id

# Check frontend build
cd frontend && npm run build

# Test new processing endpoints
curl -X POST http://localhost:8000/api/start-processing \
  -F "file=@test.jpg" \
  -F "lang=en"

# Test legacy endpoint
curl -X POST http://localhost:8000/api/process-image \
  -F "file=@test.jpg" \
  -F "lang=en"
```