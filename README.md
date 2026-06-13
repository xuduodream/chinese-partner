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

# Start in development mode (no API key required, open CORS)
ENVIRONMENT=development uv run python app.py
```

The API server runs at `http://localhost:8000`.

> **Security note:** In development mode (`ENVIRONMENT=development`), the API key check is skipped and CORS allows all origins. Set `ENVIRONMENT=production` when deploying to a remote server (see [Deployment](#deployment)).

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`. In development, Vite proxies `/api` requests to `http://localhost:8000`, avoiding CORS issues.

### Environment Files

The frontend uses Vite mode-based `.env` files:

| File | Mode | Used by |
|------|------|---------|
| `.env.development` | `development` | `npm run dev` |
| `.env.production` | `production` | `npm run build` |
| `.env.local` | (overrides) | Any mode (gitignored) |

Set `VITE_API_KEY` in `.env.local` so the frontend sends the `X-API-Key` header with all API requests:

```bash
echo 'VITE_API_KEY=your-api-key' >> frontend/.env.local
```

The key is optional in development mode but **required** when the backend runs in production.

### Mobile Testing

To test on a mobile device on the same network:

```bash
cd frontend
npm run dev:mobile
```

This uses the `VITE_API_BASE_URL` from `.env.development` (default: `http://192.168.1.254:8000`).

## API Endpoints

All endpoints except `/api/health` require the `X-API-Key` header when the backend runs in production mode.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/start-processing` | ✅ Required | Upload image, returns job ID immediately |
| `GET` | `/api/job-status/{job_id}` | ✅ Required | Poll for real-time processing progress |
| `POST` | `/api/process-image` | ✅ Required | Legacy endpoint (blocking) |
| `GET` | `/api/health` | ❌ Public | Health check |

> **Tip:** In development mode (`ENVIRONMENT=development`) the API key is not checked, so you can test without it.

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

### Production Build

```bash
# Build frontend for production
cd frontend && npm run build
# Output: frontend/dist/ — serve this with nginx, Caddy, etc.
```

### Production Backend

The backend supports two environments via the `ENVIRONMENT` variable. In production mode, it enforces API key authentication, restricted CORS, and rate limiting.

```bash
cd backend

# Set required environment variables
export ENVIRONMENT=production
export API_KEY="generate-a-strong-random-key-here"
export CORS_ORIGINS="https://your-frontend-domain.com"

# Start with multiple workers
uv run uvicorn app:app --host 127.0.0.1 --port 8000 --workers 4
```

> **Bind to 127.0.0.1** (not 0.0.0.0) so the backend is only reachable through your reverse proxy.

### Recommended: Reverse Proxy with HTTPS

For a remote server, place the backend behind **Caddy** or **nginx** for HTTPS termination and SSL certificates.

**Caddy** (zero-config TLS, auto-provisions Let's Encrypt certs):

```caddyfile
your-domain.com {
    reverse_proxy 127.0.0.1:8000
}
```

**nginx**:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Local Testing

```bash
# Backend (dev mode — no API key required)
cd backend
ENVIRONMENT=development uv run python app.py

# Frontend (Vite proxies /api to localhost:8000)
cd frontend
npm run dev

# Direct API test
curl http://localhost:8000/api/health

# Upload test (no key needed in dev)
curl -X POST http://localhost:8000/api/start-processing \
  -F "file=@test.jpg" \
  -F "lang=en"
```

## Environment Variables

### Backend

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LLM_API_KEY` | API key for the LLM provider | — | Yes |
| `LLM_API_URL` | LLM API endpoint URL | `https://api.deepseek.com/chat/completions` | No |
| `LLM_MODEL` | LLM model name | `deepseek-v4-flash` | No |
| `ENVIRONMENT` | Runtime mode (`development`, `production`, `staging`) | `development` | No |
| `API_KEY` | Secret key for API authentication (required in production) | — | Yes (prod) |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173,http://localhost:4173` | No |
| `RATE_LIMIT_PER_MINUTE` | Max API requests per minute per IP | `60` | No |
| `MAX_FILE_SIZE_MB` | Max uploaded file size in MB | `10` | No |

### Frontend

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_BASE_URL` | Backend API endpoint | `http://localhost:8000` | No |
| `VITE_API_KEY` | API key sent as `X-API-Key` header | — | Yes (prod) |
| `VITE_API_TIMEOUT` | API request timeout in ms | `30000` | No |
| `VITE_ENABLE_LOGGING` | Enable console logging | `false` | No |

## License

MIT
