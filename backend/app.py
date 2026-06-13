import os
import asyncio
import shutil
import tempfile
import threading
import time
import uuid
import logging
from typing import Dict

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from ocr import extract_text_from_image
from segment import split_sentences
from ai_explain import explain_phrase
from pinyin_helper import get_pinyin

load_dotenv()

# ── Configuration ──────────────────────────────────────────────────────────

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
API_KEY = os.getenv("API_KEY", "")
CORS_ORIGINS_ENV = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173")
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

is_dev = ENVIRONMENT == "development"

# ── Logging ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.DEBUG if is_dev else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("memboost")

# ── App & Rate Limiter ─────────────────────────────────────────────────────

def _get_client_ip(request: Request) -> str:
    """Extract real client IP, respecting reverse-proxy headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

limiter = Limiter(key_func=_get_client_ip)

app = FastAPI(title="MemBoost API", version="2.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS (environment-aware) ──────────────────────────────────────────────

if is_dev:
    cors_origins = ["*"]
    logger.info("CORS: allowing all origins (development mode)")
else:
    cors_origins = [o.strip() for o in CORS_ORIGINS_ENV.split(",") if o.strip()]
    logger.info("CORS: restricted to %s", cors_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request Logging Middleware ─────────────────────────────────────────────

@app.middleware("http")
async def log_requests(request: Request, call_next):
    req_id = str(uuid.uuid4())[:8]
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(
        "[%s] %s %s → %s (%.3fs) [%s]",
        req_id,
        request.method,
        request.url.path,
        response.status_code,
        duration,
        _get_client_ip(request),
    )
    return response

# ── Auth Dependency ────────────────────────────────────────────────────────

async def verify_api_key(x_api_key: str = Header(None)):
    """Require X-API-Key in production/staging; skip check in development."""
    if is_dev:
        return x_api_key  # optional, not validated
    if not API_KEY:
        logger.critical("API_KEY environment variable is not set!")
        raise HTTPException(status_code=500, detail="Server misconfiguration")
    if not x_api_key:
        raise HTTPException(
            status_code=401, detail="Missing X-API-Key header"
        )
    if x_api_key != API_KEY:
        raise HTTPException(
            status_code=401, detail="Invalid API key"
        )
    return x_api_key

# ── File Upload Validation ────────────────────────────────────────────────

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/bmp",
}


def _check_magic_bytes(data: bytes) -> bool:
    """Check the first bytes of an image file to confirm it's a real image."""
    if len(data) < 4:
        return False
    # JPEG: starts with \xFF\xD8\xFF
    if data[:3] == b"\xff\xd8\xff":
        return True
    # PNG: starts with \x89PNG\r\n\x1a\n
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return True
    # WebP (RIFF .... WEBP)
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return True
    # BMP: starts with BM
    if data[:2] == b"BM":
        return True
    return False


async def validate_upload(file: UploadFile) -> bytes:
    """Validate file extension, MIME type, size and magic bytes.
    Returns the raw bytes on success, raises HTTPException otherwise."""
    # ── 1. Extension check ──
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # ── 2. MIME type check ──
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content type '{file.content_type}'. Allowed image types only.",
        )

    # ── 3. Size check + read into memory ──
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(contents)} bytes). Maximum allowed: {MAX_FILE_SIZE_MB} MB",
        )

    # ── 4. Magic-bytes check ──
    if not _check_magic_bytes(contents):
        raise HTTPException(
            status_code=400,
            detail="File does not appear to be a valid image (magic bytes mismatch)",
        )

    return contents


# ── Job Management ─────────────────────────────────────────────────────────

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
            "created_at": time.time(),
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
                "complete": progress >= 100,
            })

    def get_job(self, job_id: str):
        return self.jobs.get(job_id)

    def cleanup_old_jobs(self):
        """Remove jobs older than 1 hour."""
        current_time = time.time()
        expired = [jid for jid, j in self.jobs.items()
                   if current_time - j["created_at"] > 3600]
        for jid in expired:
            del self.jobs[jid]


job_manager = JobManager()


def process_image_async(job_id: str, file_path: str, lang: str):
    """Background processing function."""
    try:
        # Step 1: OCR
        job_manager.update_job(job_id, 15, "ocr", "Extracting text with OCR...")
        raw_text = extract_text_from_image(file_path)
        if not raw_text:
            job_manager.update_job(job_id, 0, "error",
                                   "No Chinese text found in image",
                                   error="No Chinese text found")
            return

        # Step 2: Segment sentences
        job_manager.update_job(job_id, 30, "segment",
                               "Segmenting sentences...")
        sentences = split_sentences(raw_text)
        if not sentences:
            job_manager.update_job(job_id, 0, "error",
                                   "No valid sentences found",
                                   error="No valid sentences found")
            return

        # Step 3: Process each sentence (max 5)
        results = []
        total = min(len(sentences), 5)

        for i, sentence in enumerate(sentences[:5]):
            progress = 40 + int((i / total) * 45)  # 40–85 %
            job_manager.update_job(
                job_id,
                progress,
                "ai_processing",
                f"Processing sentence {i+1}/{total}",
            )

            explanation = asyncio.run(explain_phrase(sentence, lang))
            pinyin = get_pinyin(sentence)

            results.append({
                "original": sentence,
                "pinyin": pinyin,
                "translation": explanation["translation"],
                "context": explanation["context"],
                "grammar": explanation["grammar"],
                "example": explanation["example"],
            })

        # Done
        job_manager.update_job(
            job_id,
            100,
            "complete",
            f"Processing complete! Generated {len(results)} flashcards",
            results=results,
        )

    except Exception as e:
        logger.exception("Job %s failed", job_id)
        job_manager.update_job(
            job_id, 0, "error",
            f"Processing failed: {str(e)}",
            error=str(e),
        )
    finally:
        try:
            os.unlink(file_path)
        except Exception:
            pass


# ── Shared Helpers ──────────────────────────────────────────────────────────

async def _create_processing_job(file: UploadFile, lang: str) -> dict:
    """Validate an upload, save it to a temp file, and create a processing job.
    Returns {'job_id': ...}."""
    contents = await validate_upload(file)

    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    job_id = job_manager.create_job(tmp_path, lang)

    thread = threading.Thread(
        target=process_image_async,
        args=(job_id, tmp_path, lang),
    )
    thread.daemon = True
    thread.start()

    return {"job_id": job_id}


# ── Routes ─────────────────────────────────────────────────────────────────

@app.get("/api/health")
@limiter.limit("30/minute")
async def health_check(request: Request):
    return {"status": "ok", "environment": ENVIRONMENT}


@app.post("/api/start-processing")
@limiter.limit(f"{RATE_LIMIT_PER_MINUTE}/minute")
async def start_processing(
    request: Request,
    file: UploadFile = File(...),
    lang: str = Form("en"),
    _auth: str = Depends(verify_api_key),
):
    """
    Upload an image and start processing.
    Returns a job ID immediately; poll /api/job-status/{id} for progress.
    """
    return await _create_processing_job(file, lang)


@app.get("/api/job-status/{job_id}")
@limiter.limit(f"{RATE_LIMIT_PER_MINUTE}/minute")
async def get_job_status(
    request: Request,
    job_id: str,
    _auth: str = Depends(verify_api_key),
):
    """Get current job status and progress."""
    job_manager.cleanup_old_jobs()

    job = job_manager.get_job(job_id)
    if not job:
        return JSONResponse(status_code=404, content={"error": "Job not found"})

    return {
        "job_id": job_id,
        "progress": job["progress"],
        "step": job["step"],
        "message": job["message"],
        "complete": job["complete"],
        "results": job["results"],
        "error": job["error"],
    }


@app.post("/api/process-image")
@limiter.limit(f"{RATE_LIMIT_PER_MINUTE}/minute")
async def process_image_legacy(
    request: Request,
    file: UploadFile = File(...),
    lang: str = Form("en"),
    _auth: str = Depends(verify_api_key),
):
    """
    Legacy synchronous endpoint.
    Delegates to the job-based system and polls until complete (max 60 s).
    """
    result = await _create_processing_job(file, lang)
    job_id = result["job_id"]

    max_wait = 60
    interval = 0.5
    elapsed = 0

    while elapsed < max_wait:
        job = job_manager.get_job(job_id)
        if job and job["complete"]:
            if job["error"]:
                return JSONResponse(status_code=400, content={"error": job["error"]})
            return {"sentences": job["results"]}
        await asyncio.sleep(interval)
        elapsed += interval

    return JSONResponse(status_code=408, content={"error": "Processing timeout"})


# ── Entrypoint ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    host = "127.0.0.1" if not is_dev else "0.0.0.0"
    log_level = "debug" if is_dev else "info"

    logger.info("Starting MemBoost API (environment=%s)", ENVIRONMENT)
    uvicorn.run(
        "app:app",
        host=host,
        port=8000,
        reload=is_dev,
        log_level=log_level,
        proxy_headers=True,
        forwarded_allow_ips="*" if not is_dev else "",
    )
