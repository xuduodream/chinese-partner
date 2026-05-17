from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
import os
import shutil
import asyncio
import threading
import uuid
import time
from typing import Dict
from ocr import extract_text_from_image
from segment import split_sentences
from ai_explain import explain_phrase
from pinyin_helper import get_pinyin

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Job management storage
jobs_store: Dict[str, dict] = {}

class JobManager:
    def __init__(self):
        self.jobs = jobs_store

    def create_job(self, file_path: str, lang: str) -> str:
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {
            "file_path": file_path,
            "lang": lang,
            "progress": 0,
            "step": "uploading",
            "message": "Upload complete, starting processing...",
            "complete": False,
            "results": None,
            "error": None,
            "created_at": time.time()
        }
        return job_id

    def update_job(self, job_id: str, progress: int, step: str, message: str, results=None, error=None):
        if job_id in self.jobs:
            self.jobs[job_id].update({
                "progress": progress,
                "step": step,
                "message": message,
                "results": results,
                "error": error,
                "complete": progress >= 100
            })

    def get_job(self, job_id: str):
        return self.jobs.get(job_id)

    def cleanup_old_jobs(self):
        """Remove jobs older than 1 hour"""
        current_time = time.time()
        expired_jobs = [
            job_id for job_id, job in self.jobs.items()
            if current_time - job["created_at"] > 3600
        ]
        for job_id in expired_jobs:
            del self.jobs[job_id]

job_manager = JobManager()

def process_image_async(job_id: str, file_path: str, lang: str):
    """Background processing function"""
    try:
        # Step 1: OCR
        job_manager.update_job(job_id, 15, "ocr", "Extracting text with OCR...")
        raw_text = extract_text_from_image(file_path)
        if not raw_text:
            job_manager.update_job(job_id, 0, "error", "No Chinese text found in image", error="No Chinese text found")
            return

        # Step 2: Segment sentences
        job_manager.update_job(job_id, 30, "segment", "Segmenting sentences...")
        sentences = split_sentences(raw_text)
        if not sentences:
            job_manager.update_job(job_id, 0, "error", "No valid sentences found", error="No valid sentences found")
            return

        # Step 3: Process each sentence
        results = []
        total_sentences = min(len(sentences), 5)

        for i, sentence in enumerate(sentences[:5]):
            progress = 40 + int((i / total_sentences) * 45)  # 40-85% range
            job_manager.update_job(
                job_id,
                progress,
                "ai_processing",
                f"Processing sentence {i+1}/{total_sentences}"
            )

            # Get explanation from AI
            explanation = asyncio.run(explain_phrase(sentence, lang))

            # Get pinyin
            pinyin = get_pinyin(sentence)

            results.append({
                "original": sentence,
                "pinyin": pinyin,
                "translation": explanation["translation"],
                "context": explanation["context"],
                "grammar": explanation["grammar"],
                "example": explanation["example"]
            })

        # Complete
        job_manager.update_job(
            job_id,
            100,
            "complete",
            f"Processing complete! Generated {len(results)} flashcards",
            results=results
        )

    except Exception as e:
        job_manager.update_job(job_id, 0, "error", f"Processing failed: {str(e)}", error=str(e))
    finally:
        # Clean up temp file
        try:
            os.unlink(file_path)
        except:
            pass

@app.post("/api/start-processing")
async def start_processing(
    file: UploadFile = File(...),
    lang: str = Form("en")
):
    """
    Start image processing and return job ID immediately
    """
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    # Create job and return ID immediately
    job_id = job_manager.create_job(tmp_path, lang)

    # Start background processing
    thread = threading.Thread(
        target=process_image_async,
        args=(job_id, tmp_path, lang)
    )
    thread.daemon = True
    thread.start()

    return {"job_id": job_id}

@app.get("/api/job-status/{job_id}")
async def get_job_status(job_id: str):
    """
    Get current job status and progress
    """
    # Clean up old jobs periodically
    job_manager.cleanup_old_jobs()

    job = job_manager.get_job(job_id)
    if not job:
        return JSONResponse(
            status_code=404,
            content={"error": "Job not found"}
        )

    return {
        "job_id": job_id,
        "progress": job["progress"],
        "step": job["step"],
        "message": job["message"],
        "complete": job["complete"],
        "results": job["results"],
        "error": job["error"]
    }

@app.post("/api/process-image")
async def process_image_legacy(
    file: UploadFile = File(...),
    lang: str = Form("en")
):
    """
    Legacy endpoint - redirects to new job-based system
    """
    # For backward compatibility, use the new system
    response = await start_processing(file, lang)
    job_id = response["job_id"]

    # Wait for completion (not ideal but maintains compatibility)
    max_wait = 60  # 60 seconds max
    wait_interval = 0.5
    elapsed = 0

    while elapsed < max_wait:
        job = job_manager.get_job(job_id)
        if job and job["complete"]:
            if job["error"]:
                return JSONResponse(status_code=400, content={"error": job["error"]})
            return {"sentences": job["results"]}

        await asyncio.sleep(wait_interval)
        elapsed += wait_interval

    return JSONResponse(
        status_code=408,
        content={"error": "Processing timeout"}
    )

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)