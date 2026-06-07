# MemBoost 🧠

A web application for learning Chinese through image-based flashcards. Extract Chinese text from images, get AI-powered explanations with pinyin, and practice with audio-enhanced flashcards.

## Features

- **OCR Text Extraction** — Upload images containing Chinese text, automatically extracted via PaddleOCR
- **AI Explanations** — Each sentence gets translation, pinyin, grammar notes, context, and examples via LLM
- **Real-time Progress** — Live progress tracking during image processing (OCR → segmentation → AI → pinyin)
- **Audio Playback** — Listen to Chinese pronunciation via Web Speech API
- **Multi-language Support** — Explanations in English or French
- **Profile & Deck System** — Organize flashcards into named decks within profiles for different study contexts
- **Spaced Review** — Review saved flashcards with audio and tracking
- **Dark Mode** — Light, dark, and system theme options

## Tech Stack

### Backend
- **Python** + **FastAPI** — REST API server
- **PaddleOCR** — Chinese text extraction from images
- **pypinyin** — Pinyin generation
- **LongCat API** — AI-powered sentence explanations

### Frontend
- **Vue 3** + **TypeScript** — UI framework
- **Vite** — Build tool
- **Pinia** — State management
- **Vue Router** — Client-side routing
- **localStorage** — Flashcard persistence (no database required)

## Getting Started

### Prerequisites
- Python 3.10+ with `uv`
- Node.js 18+

### Backend Setup

```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
cp .env.example .env  # Add your LLM API key
uv run python app.py
```

The API server runs at `http://localhost:8000`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`.

### Mobile Testing

To test on a mobile device on the same network:

```bash
cd frontend
npm run dev:mobile
```

This uses the `VITE_API_BASE_URL` from `.env.development` (default: `http://192.168.1.254:8000`).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/start-processing` | Upload image, returns job ID immediately |
| `GET` | `/api/job-status/{job_id}` | Poll for real-time processing progress |
| `POST` | `/api/process-image` | Legacy endpoint (blocking) |
| `GET` | `/api/health` | Health check |

### Processing Pipeline

1. OCR text extraction (15–30%)
2. Sentence segmentation (30–50%)
3. AI explanation generation (50–85%)
4. Pinyin generation (85–95%)
5. Complete (100%)

## Project Structure

```
chinese-partner/
├── backend/
│   ├── app.py              # FastAPI app, routes, CORS
│   ├── ocr.py              # PaddleOCR integration
│   ├── segment.py          # Chinese sentence segmentation
│   ├── pinyin_helper.py    # Pinyin generation
│   ├── ai_explain.py       # LLM API integration
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── App.vue          # Root component with sidebar layout
    │   ├── main.ts          # Entry point
    │   ├── router/          # Vue Router config
    │   ├── stores/          # Pinia stores (app state, flashcards)
    │   ├── components/      # Reusable components
    │   ├── views/           # Page components
    │   ├── utils/           # Storage and utility functions
    │   └── index.css        # Global styles
    ├── package.json
    └── vite.config.ts
```

## Flashcards

Cards are stored in browser `localStorage` — no account or database needed. Each card contains:

| Field | Description |
|-------|-------------|
| `original` | Chinese text |
| `pinyin` | Pinyin romanization |
| `translation` | Translated text (EN/FR) |
| `context` | Contextual usage note |
| `grammar` | Grammar explanation |
| `example` | Example sentence |

Cards are organized into **Profiles** (e.g., "Work", "Travel") and **Decks** (named collections within a profile).

## Deployment

```bash
# Build frontend for production
cd frontend && npm run build
# Output: frontend/dist/

# Run backend on custom port
cd backend && uvicorn app:app --host 0.0.0.0 --port 8000
```

## License

MIT
