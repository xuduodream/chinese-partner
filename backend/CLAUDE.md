# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the backend code in this repository.

## Project Overview

Chinese Partner Backend is a Python + FastAPI application that handles Chinese text extraction from images, sentence processing, AI explanations, and real-time progress tracking. The backend uses a job-based system for asynchronous processing with progress polling.

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

# Run with auto-reload for development
uv run uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# Run on custom port
uv run uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

### Environment Setup
```bash
# Create environment file for backend
cd backend
cp .env.example .env  # Add your LongCat API key to .env
```

## Code Architecture

### Backend Structure
- `backend/app.py` - Main FastAPI application with CORS, job management, and API endpoints
- `backend/ocr.py` - PaddleOCR integration for Chinese text extraction
- `backend/segment.py` - Chinese sentence segmentation using punctuation
- `backend/pinyin_helper.py` - Pinyin generation using pypinyin
- `backend/ai_explain.py` - LongCat API integration for explanations
- `backend/requirements.txt` - Python dependencies (FastAPI, PaddleOCR, pypinyin, etc.)

### Key Components
- **JobManager**: Handles job creation, progress tracking, and cleanup
- **ProgressTracker**: Real-time progress updates for frontend polling
- **Background Processing**: Asynchronous image processing with threading
- **CORS Configuration**: Allows requests from all origins for development

### API Endpoints
- `POST /api/start-processing` - Upload image and start processing job
- `GET /api/job-status/{job_id}` - Get real-time job progress and status
- `POST /api/process-image` - Legacy endpoint for backward compatibility
- `GET /api/health` - Health check endpoint

### Data Flow
1. Frontend uploads image to `/api/start-processing`
2. Backend creates job, saves file temporarily, returns job ID immediately
3. Background thread starts processing with progress tracking
4. Frontend polls `/api/job-status/{job_id}` every 500ms
5. Backend updates progress at each processing step
6. When complete, results are available via polling endpoint
7. Temporary files are cleaned up automatically

## Configuration Requirements

### Environment Variables
- `LONGCHAT_API_KEY` - Required API key from LongCat platform

### File Structure Requirements
```
backend/
├── app.py                 # Main FastAPI app with job management
├── ocr.py                 # OCR processing with PaddleOCR
├── segment.py             # Text segmentation
├── pinyin_helper.py       # Pinyin generation
├── ai_explain.py          # AI explanations via LongCat API
├── requirements.txt       # Python dependencies
└── .env                   # API keys and configuration
```

## Job Management System

### Job Lifecycle
1. **Created**: Job initialized with file path and language
2. **Processing**: Background thread processes image step-by-step
3. **Complete**: Results stored, progress set to 100%
4. **Cleanup**: Jobs older than 1 hour are automatically removed

### Progress Tracking
- **Upload**: 0-15% (file upload and job creation)
- **OCR**: 15-30% (text extraction with PaddleOCR)
- **Segment**: 30-50% (sentence segmentation)
- **AI Process**: 50-85% (processing each sentence with LongCat API)
- **Pinyin**: 85-95% (pinyin generation)
- **Complete**: 100% (results ready)

### Background Processing
```python
# Job creation
job_id = job_manager.create_job(file_path, lang)

# Background processing thread
thread = threading.Thread(target=process_image_async, args=(job_id, file_path, lang))
thread.daemon = True
thread.start()

# Progress updates during processing
job_manager.update_job(job_id, 25, "ocr", "Extracting text with OCR...")
```

## Testing

### Backend Testing Commands
```bash
# Test OCR functionality
python -c "from ocr import extract_text_from_image; print(extract_text_from_image('test.jpg'))"

# Test sentence segmentation
python -c "from segment import split_sentences; print(split_sentences('你好。再见！'))"

# Test pinyin generation
python -c "from pinyin_helper import get_pinyin; print(get_pinyin('你好'))"

# Test API endpoints
curl -X GET http://localhost:8000/api/health
curl -X POST http://localhost:8000/api/start-processing \
  -F "file=@test.jpg" \
  -F "lang=en"

# Test job status
curl -X GET http://localhost:8000/api/job-status/{job_id}
```

### Manual Testing Checklist
1. Image upload returns job ID immediately
2. Job status endpoint returns progress updates
3. OCR processes Chinese text correctly
4. Sentence segmentation works properly
5. AI explanations are generated for each sentence
6. Pinyin is added to all sentences
7. Progress updates occur at expected intervals
8. Temporary files are cleaned up after processing
9. Error handling works for invalid images
10. CORS allows requests from frontend

## Common Development Tasks

### Adding New Language Support
1. Update `ai_explain.py` to add new language prompts
2. Update language parameter in job creation
3. Test with new language code

### Extending Processing Steps
1. Add new step to `process_image_async` function
2. Update progress percentages for new step
3. Add step tracking to job updates
4. Update frontend to display new step

### Performance Optimizations
- **Job Cleanup**: Automatic removal of old jobs (1 hour)
- **Background Processing**: Non-blocking image processing
- **Progress Polling**: Efficient status updates every 500ms
- **Memory Management**: Temporary file cleanup
- **Thread Management**: Daemon threads for automatic cleanup

### Error Handling
1. Add error catching in `process_image_async`
2. Update job status with error information
3. Ensure temporary file cleanup on errors
4. Return appropriate HTTP status codes

## Deployment Notes

### Production Considerations
- Set up proper CORS configuration for production domains
- Add rate limiting for API endpoints
- Implement proper error handling and logging
- Configure production build for frontend
- Set up monitoring for job processing times

### Environment Setup
```bash
# Production backend setup
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uv run uvicorn app:app --host 0.0.0.0 --port 8000

# With production settings
uv run uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4
```

### Scaling Considerations
- **Job Storage**: Consider Redis for distributed job management
- **File Storage**: Use cloud storage for uploaded images
- **Background Workers**: Consider Celery for heavy processing
- **Caching**: Add Redis caching for AI explanations
- **Load Balancing**: Multiple backend instances with shared job storage

## Troubleshooting

### Common Issues
- **OCR not detecting text**: Check image quality and Chinese text presence
- **API errors**: Verify LongCat API key in `.env` file
- **CORS errors**: Ensure frontend URL matches CORS configuration
- **Job not found**: Check if job was cleaned up (1 hour timeout)
- **Processing timeout**: Large images may take longer than expected
- **Memory issues**: Monitor temporary file cleanup
- **Thread errors**: Check daemon thread status

### Debug Commands
```bash
# Check backend logs
uv run python app.py

# Test API endpoints
curl -X GET http://localhost:8000/api/health
curl -X POST http://localhost:8000/api/start-processing \
  -F "file=@test.jpg" \
  -F "lang=en"

# Monitor job status
curl -X GET http://localhost:8000/api/job-status/{job_id}

# Check running processes
ps aux | grep python

# Monitor memory usage
top -p $(pgrep -f "python app.py")

# Test with different image sizes
for size in small.jpg medium.jpg large.jpg; do
  time curl -X POST http://localhost:8000/api/start-processing \
    -F "file=@$size" \
    -F "lang=en"
  echo "Processed $size"
  echo "---"
done
```

### Performance Monitoring
```bash
# Check job processing times
grep "Processing complete" backend.log | tail -10

# Monitor memory usage during processing
watch -n 1 'ps aux | grep python | grep -v grep'

# Check for stuck jobs
python -c "
from app import jobs_store
import time
current_time = time.time()
for job_id, job in jobs_store.items():
    age = current_time - job['created_at']
    if age > 120:  # 2 minutes
        print(f'Stuck job: {job_id}, age: {age:.1f}s, step: {job["step"]}')
"
```