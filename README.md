# MemBoost 🧠

A web application for learning Chinese through image-based flashcards. Extract Chinese text from images, get AI-powered explanations with pinyin, and practice with audio-enhanced flashcards.

## Features

- **OCR Text Extraction** — Upload images containing Chinese text, automatically extracted via PaddleOCR
- **AI Explanations** — Each sentence gets translation, pinyin, grammar notes, context, and examples via LLM
- **Real-time Progress** — Live progress tracking during image processing (OCR → segmentation → AI → pinyin)
- **Audio Playback** — Listen to Chinese pronunciation via Web Speech API
- **Multi-language Support** — Explanations in English or French
- **Profile & Deck System** — Organize flashcards into named decks within profiles for different study contexts
- **Spaced Repetition** — SM-2 algorithm with learning/review/relearning states for efficient study
- **Dark Mode** — Light, dark, and system theme options
- **Backup & Restore** — Export/import profiles and decks as JSON files

## Tech Stack

### Backend
- **Python** + **FastAPI** — REST API server
- **PaddleOCR** — Chinese text extraction from images
- **pypinyin** — Pinyin generation
- **LLM API** (e.g., LongCat) — AI-powered sentence explanations

### Frontend
- **Vue 3** + **TypeScript** — UI framework (Composition API + `<script setup>`)
- **Vite** — Build tool
- **Pinia** — State management
- **Vue Router** — Client-side routing
- **Lucide** — SVG icon library (consistent vector icons throughout)
- **localStorage** — Flashcard persistence (no database required)

### Frontend Design System
- **Custom CSS design tokens** — Colors, spacing, shadows, typography via CSS custom properties
- **4-variant button system** — `.btn`, `.btn-primary`, `.btn-danger`, `.btn-ghost` with `.btn-sm` and `.btn-icon` modifiers
- **Responsive layout** — Desktop sidebar (220px, collapsible) + mobile bottom tab bar (breakpoint at 768px)
- **Touch-optimized** — 44px minimum touch targets on mobile devices

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
    │   ├── App.vue              # Root layout (sidebar, mobile tab bar, theme)
    │   ├── main.ts              # Vue app entry point
    │   ├── router/index.ts      # Route definitions (5 routes)
    │   ├── pages/               # Page-level route components
    │   │   ├── LandingPage.vue      # Home page with feature overview
    │   │   ├── ImportPage.vue       # Image upload & flashcard creation
    │   │   ├── RevisionPage.vue     # Deck list, review, and study session
    │   │   ├── DeckManagerPage.vue  # Hierarchical profile/deck/card manager
    │   │   └── BackupRestorePage.vue # Export/import JSON backups
    │   ├── components/          # Reusable Vue components
    │   │   ├── card/               # Flashcard, CardFormModal
    │   │   ├── deck/               # DeckManager, DeckReviewPage, StudySession
    │   │   ├── modal/              # DeckMoveModal, RenameModal
    │   │   ├── profile/            # ProfileManager
    │   │   └── shared/             # ImageUpload, ProgressBar, StudyStats
    │   ├── stores/              # Pinia stores
    │   │   ├── app.ts              # Sidebar, theme, profiles, decks
    │   │   └── saved.ts            # Saved flashcard tracking
    │   ├── utils/               # Storage utilities (localStorage persistence)
    │   └── index.css            # Global styles with design tokens (CSS custom properties)
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

### Spaced Repetition (SM-2)

The study system implements a simplified SM-2 algorithm with three card states:
- **Learning** — New cards go through graduated steps before becoming "review" cards
- **Review** — Graduated cards appear on schedule based on ease factor and interval
- **Relearning** — Lapsed cards (rated "again" during review) re-enter learning steps

Each review session provides four rating options (Again, Hard, Good, Easy) with keyboard shortcuts (1/A, 2/H, 3/G, 4/E) and Space to reveal the answer.

## Deployment

```bash
# Build frontend for production
cd frontend && npm run build
# Output: frontend/dist/

# Run backend on custom port
cd backend && uvicorn app:app --host 0.0.0.0 --port 8000
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `LLM_API_KEY` | API key for the LLM provider | Yes |
| `VITE_API_BASE_URL` | Backend API endpoint (frontend) | No (default: `http://localhost:8000`) |
| `VITE_API_TIMEOUT` | API request timeout in ms | No |
| `VITE_ENABLE_LOGGING` | Enable console logging | No |

## License

MIT
