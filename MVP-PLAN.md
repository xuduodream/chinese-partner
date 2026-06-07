Excellent idea! Let me create a **detailed MVP plan** that you can feed directly to an AI agent like Claude, Cursor, or GitHub Copilot. This plan is structured for **autonomous execution** by an AI coding assistant.

---

# 📋 MVP Development Plan for AI Agent

## Project Overview
Build a web application that extracts Chinese text from images, explains each sentence, and creates audio-enhanced flashcards for review.

**Tech Stack:**
- Backend: Python + FastAPI with job-based processing
- Frontend: React + Vite with real-time progress polling
- Storage: localStorage (frontend), no database initially
- APIs: LongCat API for explanations with progress tracking

---

## Phase 1: Project Setup (15 minutes)

### Task 1.1: Create directory structure
```
chinese-learning-app/
├── backend/
│   ├── app.py
│   ├── ocr.py
│   ├── segment.py
│   ├── pinyin_helper.py
│   ├── ai_explain.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── components/
│   │   │   ├── ImageUpload.jsx
│   │   │   ├── CardList.jsx
│   │   │   ├── Flashcard.jsx
│   │   │   └── RevisionPage.jsx
│   │   ├── utils/
│   │   │   └── storage.js
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

### Task 1.2: Backend requirements.txt
```txt
fastapi==0.104.1
uvicorn==0.24.0
paddlepaddle==2.6.0
paddleocr==2.7.3
jieba==0.42.1
pypinyin==0.49.0
httpx==0.25.1
python-dotenv==1.0.0
```

### Task 1.3: Frontend package.json (dependencies)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0"
  }
}
```

---

## Phase 2: Backend Development (1 hour)

### Task 2.1: OCR module (`backend/ocr.py`)
```python
from paddleocr import PaddleOCR
import logging

# Initialize once
ocr = PaddleOCR(use_angle_cls=True, lang='ch', show_log=False)

def extract_text_from_image(image_path: str) -> str:
    """
    Extract Chinese text from image file path.
    Returns concatenated text or empty string if none found.
    """
    result = ocr.ocr(image_path, cls=True)
    if not result or not result[0]:
        return ""
    
    texts = [line[1][0] for line in result[0]]
    return "".join(texts)
```

### Task 2.2: Sentence segmentation (`backend/segment.py`)
```python
import re
import jieba

def split_sentences(text: str) -> list:
    """
    Split Chinese text into sentences.
    Uses punctuation: 。！？； as sentence boundaries.
    """
    # Remove extra whitespace
    text = re.sub(r'\s+', '', text)
    
    # Split on sentence-ending punctuation
    sentences = re.split(r'([。！？；])', text)
    
    # Combine delimiter with its sentence
    result = []
    for i in range(0, len(sentences)-1, 2):
        if i+1 < len(sentences):
            result.append(sentences[i] + sentences[i+1])
    
    # Handle case without trailing punctuation
    if len(sentences) % 2 == 1 and sentences[-1]:
        result.append(sentences[-1])
    
    # Filter empty sentences
    result = [s.strip() for s in result if s.strip()]
    
    return result[:10]  # Limit to 10 sentences per image
```

### Task 2.3: Pinyin helper (`backend/pinyin_helper.py`)
```python
from pypinyin import pinyin, Style

def get_pinyin(text: str) -> str:
    """
    Convert Chinese text to pinyin with tone marks.
    Example: "你好" -> "nǐ hǎo"
    """
    result = pinyin(text, style=Style.TONE, heteronym=False)
    return ' '.join([item[0] for item in result])
```

### Task 2.4: AI explanation module (`backend/ai_explain.py`)
```python
import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

def build_prompt(phrase: str, target_lang: str) -> str:
    """Build prompt for AI based on target language."""
    if target_lang == "fr":
        return f"""You are a Chinese teacher. For the Chinese sentence: "{phrase}"

Respond in JSON format exactly like this:
{{
  "translation": "French translation here",
  "context": "Context of use in French (formal/informal, typical situations)",
  "grammar": "Key grammar points in French",
  "example": "Another similar Chinese sentence with French translation"
}}

Use French for all explanations. Output ONLY valid JSON, nothing else."""
    
    elif target_lang == "en":
        return f"""You are a Chinese teacher. For the Chinese sentence: "{phrase}"

Respond in JSON format exactly like this:
{{
  "translation": "English translation here",
  "context": "Context of use in English (formal/informal, typical situations)",
  "grammar": "Key grammar points in English",
  "example": "Another similar Chinese sentence with English translation"
}}

Use English for all explanations. Output ONLY valid JSON, nothing else."""

async def explain_phrase(phrase: str, target_lang: str) -> dict:
    """
    Call DeepSeek API to explain a Chinese phrase.
    Returns dict with keys: translation, context, grammar, example
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            DEEPSEEK_API_URL,
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "user", "content": build_prompt(phrase, target_lang)}
                ],
                "temperature": 0.3,
                "response_format": {"type": "json_object"}
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"API error: {response.text}")
        
        content = response.json()["choices"][0]["message"]["content"]
        return json.loads(content)
```

### Task 2.5: Main FastAPI app with Progress Tracking (`backend/app.py`)
```python
# NEW: Job-based processing with real-time progress tracking
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
import os
import shutil
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

job_manager = JobManager()

# NEW: Two-phase processing endpoints
@app.post("/api/start-processing")
async def start_processing(
    file: UploadFile = File(...),
    lang: str = Form("en")
):
    """Upload image and start processing job"""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

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
    """Get current job status and progress"""
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
        "error": job["error"]
    }

@app.post("/api/process-image")
async def process_image_legacy(
    file: UploadFile = File(...),
    lang: str = Form("en")
):
    """Legacy endpoint for backward compatibility"""
    response = await start_processing(file, lang)
    job_id = response["job_id"]
    
    # Wait for completion
    max_wait = 60
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

    return JSONResponse(status_code=408, content={"error": "Processing timeout"})

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Task 2.6: Environment file (`backend/.env`)
```env
DEEPSEEK_API_KEY=your_api_key_here
```
*Note: User must sign up at platform.deepseek.com to get a free API key*

---

## Phase 3: Frontend Development (1.5 hours)

### Task 3.1: Storage utility (`frontend/src/utils/storage.js`)
```javascript
const STORAGE_KEY = 'chinese_flashcards';

export const saveCard = (card) => {
  const existing = getCards();
  const newCard = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    reviewCount: 0,
    lastReviewed: null,
    ...card
  };
  existing.push(newCard);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return newCard;
};

export const getCards = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const deleteCard = (id) => {
  const cards = getCards().filter(card => card.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
};

export const updateCard = (id, updates) => {
  const cards = getCards().map(card => 
    card.id === id ? { ...card, ...updates } : card
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
};
```

### Task 3.2: Enhanced Image Upload with Progress Tracking (`frontend/src/components/ImageUpload.jsx`)
```jsx
// NEW: Two-phase upload with real-time progress polling
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ImageUpload = ({ onResults, targetLang }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);
  const pollIntervalRef = useRef(null);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('lang', targetLang);

    setLoading(true);
    setProgress('Starting image processing...');
    setProgressPercent(0);
    setCurrentStep('uploading');
    setError(null);

    try {
      // Phase 1: Upload image and get job ID
      const response = await axios.post('http://192.168.1.190:8000/api/start-processing', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const uploadPercent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          const overallProgress = Math.round(uploadPercent * 0.15);
          setProgressPercent(overallProgress);
          setProgress(`Uploading image... ${uploadPercent}%`);
        }
      });

      const jobId = response.data.job_id;
      setProgress('Upload complete! Starting processing...');
      setProgressPercent(15);
      setCurrentStep('processing');

      // Phase 2: Start polling for progress
      startProgressPolling(jobId);

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start processing');
      setLoading(false);
    }
  };

  const startProgressPolling = (jobId) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`http://192.168.1.190:8000/api/job-status/${jobId}`);
        const jobStatus = response.data;

        setProgressPercent(jobStatus.progress);
        setProgress(jobStatus.message);
        setCurrentStep(jobStatus.step);

        if (jobStatus.complete) {
          clearInterval(pollIntervalRef.current);

          if (jobStatus.error) {
            setError(jobStatus.error);
          } else if (jobStatus.results) {
            setProgress('Processing complete!');
            setProgressPercent(100);
            setCurrentStep('complete');

            setTimeout(() => {
              setProgress('');
              setProgressPercent(0);
              setCurrentStep('');
            }, 2000);

            onResults(jobStatus.results);
          }

          setLoading(false);
        }

      } catch (err) {
        console.error('Error polling job status:', err);
        setError('Failed to get processing status');
        clearInterval(pollIntervalRef.current);
        setLoading(false);
      }
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="image-upload">
      <h2>Upload Chinese Text Image</h2>
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleImageUpload}
        disabled={loading}
      />
      
      {loading && (
        <div className="progress-container">
          <div className="progress-steps">
            <div className={`step ${['upload', 'ocr', 'ocr_complete', 'segment', 'segment_complete', 'ai_processing', 'pinyin', 'complete'].some(step => progressPercent >= 15 || currentStep === 'upload') ? 'completed' : ''} ${currentStep === 'upload' ? 'active' : ''}`}>
              <span className="step-icon">📤</span>
              <span className="step-text">Upload</span>
            </div>
            <div className={`step ${['ocr', 'ocr_complete', 'segment', 'segment_complete', 'ai_processing', 'pinyin', 'complete'].some(step => progressPercent >= 30 || ['ocr', 'ocr_complete'].includes(currentStep)) ? 'completed' : ''} ${['ocr', 'ocr_complete'].includes(currentStep) ? 'active' : ''}`}>
              <span className="step-icon">🔍</span>
              <span className="step-text">OCR</span>
            </div>
            <div className={`step ${['segment_complete', 'ai_processing', 'pinyin', 'complete'].some(step => progressPercent >= 50 || ['segment', 'segment_complete'].includes(currentStep)) ? 'completed' : ''} ${['segment', 'segment_complete'].includes(currentStep) ? 'active' : ''}`}>
              <span className="step-icon">📝</span>
              <span className="step-text">Segment</span>
            </div>
            <div className={`step ${['ai_processing', 'pinyin', 'complete'].some(step => progressPercent >= 70 || currentStep === 'ai_processing') ? 'completed' : ''} ${currentStep === 'ai_processing' ? 'active' : ''}`}>
              <span className="step-icon">🤖</span>
              <span className="step-text">AI Explain</span>
            </div>
            <div className={`step ${['pinyin', 'complete'].some(step => progressPercent >= 90 || currentStep === 'pinyin') ? 'completed' : ''} ${currentStep === 'pinyin' ? 'active' : ''}`}>
              <span className="step-icon">🔤</span>
              <span className="step-text">Pinyin</span>
            </div>
            <div className={`step ${progressPercent >= 100 || currentStep === 'complete' ? 'completed' : ''} ${currentStep === 'complete' ? 'active' : ''}`}>
              <span className="step-icon">✅</span>
              <span className="step-text">Complete</span>
            </div>
          </div>

          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>

          <p className="progress-text">{progress}</p>
          <p className="progress-percent">{progressPercent}%</p>
        </div>
      )}
      
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default ImageUpload;
```

### Task 3.3: Flashcard Component (`frontend/src/components/Flashcard.jsx`)
```jsx
import React, { useState } from 'react';

const Flashcard = ({ card, onSave }) => {
  const [showBack, setShowBack] = useState(false);
  const [saved, setSaved] = useState(false);

  const speak = (text, langCode) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleSave = () => {
    onSave(card);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flashcard" onClick={() => setShowBack(!showBack)}>
      <div className="front">
        <h3>{card.original}</h3>
        <p className="pinyin">{card.pinyin}</p>
        {!showBack && <button>Click to see explanation →</button>}
      </div>
      
      {showBack && (
        <div className="back">
          <p><strong>Translation:</strong> {card.translation}</p>
          <p><strong>Context:</strong> {card.context}</p>
          <p><strong>Grammar:</strong> {card.grammar}</p>
          <p><strong>Example:</strong> {card.example}</p>
          
          <div className="audio-buttons">
            <button onClick={(e) => { e.stopPropagation(); speak(card.original, 'zh-CN'); }}>
              🔊 Listen Chinese
            </button>
            <button onClick={(e) => { e.stopPropagation(); speak(card.translation, 'en-US'); }}>
              🔊 Listen Translation
            </button>
          </div>
          
          <button 
            className="save-btn" 
            onClick={(e) => { e.stopPropagation(); handleSave(); }}
            disabled={saved}
          >
            {saved ? '✓ Saved!' : 'Save to Flashcards'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Flashcard;
```

### Task 3.4: Main App Component (`frontend/src/App.jsx`)
```jsx
import React, { useState } from 'react';
import ImageUpload from './components/ImageUpload';
import Flashcard from './components/Flashcard';
import RevisionPage from './components/RevisionPage';
import { saveCard } from './utils/storage';
import './index.css';

function App() {
  const [results, setResults] = useState([]);
  const [targetLang, setTargetLang] = useState('en');
  const [showRevision, setShowRevision] = useState(false);

  const handleResults = (sentences) => {
    setResults(sentences);
    setShowRevision(false);
  };

  const handleSaveCard = (cardData) => {
    saveCard({
      original: cardData.original,
      pinyin: cardData.pinyin,
      targetLang: targetLang,
      translation: cardData.translation,
      context: cardData.context,
      grammar: cardData.grammar,
      example: cardData.example
    });
  };

  return (
    <div className="app">
      <header>
        <h1>🇨🇳 MemBoost</h1>
        <div className="lang-selector">
          <button 
            className={targetLang === 'en' ? 'active' : ''} 
            onClick={() => setTargetLang('en')}
          >
            English
          </button>
          <button 
            className={targetLang === 'fr' ? 'active' : ''} 
            onClick={() => setTargetLang('fr')}
          >
            Français
          </button>
        </div>
        <div className="nav-buttons">
          <button onClick={() => setShowRevision(false)}>Import</button>
          <button onClick={() => setShowRevision(true)}>Review ({JSON.parse(localStorage.getItem('chinese_flashcards') || '[]').length})</button>
        </div>
      </header>

      <main>
        {!showRevision ? (
          <>
            <ImageUpload onResults={handleResults} targetLang={targetLang} />
            {results.length > 0 && (
              <div className="results">
                <h2>Extracted Sentences</h2>
                {results.map((sentence, idx) => (
                  <Flashcard 
                    key={idx} 
                    card={sentence} 
                    onSave={handleSaveCard}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <RevisionPage />
        )}
      </main>
    </div>
  );
}

export default App;
```

### Task 3.5: Revision Page Component (`frontend/src/components/RevisionPage.jsx`)
```jsx
import React, { useState, useEffect } from 'react';
import { getCards, deleteCard } from '../utils/storage';

const RevisionPage = () => {
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    setCards(getCards());
  }, []);

  const speak = (text, langCode) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleDelete = (id) => {
    deleteCard(id);
    setCards(getCards());
    setSelectedCard(null);
  };

  return (
    <div className="revision-page">
      <h2>📚 My Flashcards</h2>
      <div className="flashcard-list">
        {cards.length === 0 ? (
          <p>No flashcards yet. Import an image to create some!</p>
        ) : (
          <div className="card-grid">
            {cards.map(card => (
              <div key={card.id} className="review-card">
                <div className="review-front">
                  <h3>{card.original}</h3>
                  <p className="pinyin">{card.pinyin}</p>
                  <button onClick={() => setSelectedCard(selectedCard?.id === card.id ? null : card)}>
                    {selectedCard?.id === card.id ? 'Hide' : 'Show Explanation'}
                  </button>
                </div>
                
                {selectedCard?.id === card.id && (
                  <div className="review-back">
                    <p><strong>Translation:</strong> {card.translation}</p>
                    <p><strong>Context:</strong> {card.context}</p>
                    <p><strong>Grammar:</strong> {card.grammar}</p>
                    <p><strong>Example:</strong> {card.example}</p>
                    
                    <div className="audio-buttons">
                      <button onClick={() => speak(card.original, 'zh-CN')}>
                        🔊 Chinese
                      </button>
                      <button onClick={() => speak(card.translation, card.targetLang === 'fr' ? 'fr-FR' : 'en-US')}>
                        🔊 Translation
                      </button>
                    </div>
                    
                    <button className="delete-btn" onClick={() => handleDelete(card.id)}>
                      Delete Card
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RevisionPage;
```

### Task 3.6: CSS Styling (`frontend/src/index.css`)
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.lang-selector button, .nav-buttons button {
  padding: 8px 16px;
  margin: 0 5px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.lang-selector button.active {
  background: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

.image-upload {
  background: white;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  margin-bottom: 20px;
}

.image-upload input {
  margin: 20px 0;
}

/* NEW: Progress tracking styles */
.progress-container {
  margin: 20px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.progress-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0.3;
  transition: all 0.3s ease;
  min-width: 60px;
}

.step.active {
  opacity: 1;
  transform: scale(1.1);
}

.step.completed {
  opacity: 1;
  color: #4CAF50;
}

.step-icon {
  font-size: 24px;
  margin-bottom: 5px;
}

.step-text {
  font-size: 12px;
  font-weight: 500;
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 15px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #45a049);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-text {
  font-size: 14px;
  color: #666;
  margin: 5px 0;
  min-height: 20px;
}

.progress-percent {
  font-size: 18px;
  font-weight: bold;
  color: #4CAF50;
  margin: 5px 0 0 0;
}

@media (max-width: 768px) {
  .progress-steps {
    justify-content: center;
    gap: 15px;
  }

  .step {
    min-width: 50px;
  }

  .step-icon {
    font-size: 20px;
  }

  .step-text {
    font-size: 10px;
  }
}

.flashcard, .review-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s;
}

.flashcard:hover, .review-card:hover {
  transform: translateY(-2px);
}

.pinyin {
  color: #666;
  font-style: italic;
  margin: 10px 0;
}

.audio-buttons {
  display: flex;
  gap: 10px;
  margin: 15px 0;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #4CAF50;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #45a049;
}

.save-btn, .delete-btn {
  margin-top: 10px;
}

.delete-btn {
  background: #f44336;
}

.delete-btn:hover {
  background: #da190b;
}

.error {
  color: red;
  margin-top: 10px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## Phase 4: Testing & Launch (30 minutes)

### Task 4.1: Backend startup script
```bash
# In backend/ directory
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -r requirements.txt
uv run python app.py
```

### Task 4.2: Frontend startup script
```bash
# In frontend/ directory
npm install
npm run dev
```

### Task 4.3: Environment setup instructions
Create `README.md`:
```markdown
# MemBoost

## Setup

### Backend
1. Copy `.env.example` to `.env`
2. Add your LongCat API key (get from LongCat platform)
3. Run: `uv run python app.py`

### Frontend
1. Run: `npm install`
2. Run: `npm run dev`

## Usage
1. Open http://localhost:5173
2. Select your language (English/French)
3. Upload a photo containing Chinese text
4. Review sentences and save flashcards
5. Go to "Review" tab to study
```

---

## Success Criteria for MVP

✅ **Working features:**
1. Image upload (file picker)
2. OCR extraction of Chinese text
3. Sentence segmentation
4. AI explanation (translation, context, grammar, example)
5. Pinyin generation
6. Save flashcards to localStorage
7. Review page showing saved cards
8. Text-to-speech for both Chinese and translation
9. Language selector (English/French)
10. Delete cards function

**Not included in MVP (for later iterations):**
- Video/audio file support
- User accounts / cloud sync
- Spaced repetition algorithm
- Export/import functionality
- Batch processing
- Mobile camera capture (use file upload instead)

---

## Estimated Time: 3-4 hours of AI agent work

This plan is **ready to be copied and pasted** to an AI agent. The agent can:
1. Create all files following the structure
2. Install dependencies
3. Guide user to get API key
4. Run the application

**Shall I help you refine any specific module or provide additional implementation details?**