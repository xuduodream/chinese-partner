# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the frontend code in this repository.

## Project Overview

MemBoost Frontend is a **Vue 3 + TypeScript + Vite** application that provides a user interface for uploading Chinese text images, viewing AI-generated explanations, managing profiles/decks, and reviewing flashcards for language learning.

## Development Commands

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server (runs on port 5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Clean build artifacts
rm -rf dist/
```

## Code Architecture

### Frontend Structure
- `src/App.vue` - Root component with sidebar layout and routing
- `src/main.ts` - Vue application entry point
- `src/router/index.ts` - Vue Router configuration
- `src/pages/` - Page-level route components:
  - `LandingPage.vue` - Home page
  - `ImportPage.vue` - Image upload and processing
  - `RevisionPage.vue` - Flashcard review with audio
  - `DeckManagerPage.vue` - Profile and deck management
  - `BackupRestorePage.vue` - Import/export flashcards
- `src/components/` - Organized by domain:
  - `card/Flashcard.vue` - Individual flashcard display
  - `card/CardFormModal.vue` - Edit/create card form
  - `deck/DeckManager.vue` - Deck CRUD interface
  - `deck/DeckReviewPage.vue` - Deck-based review session
  - `deck/StudySession.vue` - Active study session
  - `modal/DeckMoveModal.vue` - Move cards between decks
  - `modal/RenameModal.vue` - Rename profiles/decks
  - `profile/ProfileManager.vue` - Profile CRUD interface
  - `shared/ImageUpload.vue` - Image upload with progress tracking
  - `shared/ProgressBar.vue` - Progress indicator component
  - `shared/StudyStats.vue` - Study statistics display
- `src/stores/app.ts` - Pinia store for sidebar, theme, profiles, decks
- `src/stores/saved.ts` - Pinia store for saved flashcards
- `src/utils/storage.js` - localStorage persistence utilities
- `src/index.css` - Global styles with design tokens

### Key Features
- **Image Upload**: Two-phase upload with real-time progress tracking via polling
- **Language Selection**: Toggle between English and French translations
- **Flashcard Display**: Shows original text, pinyin, translation, context, grammar, and examples
- **Profiles & Decks**: Organize flashcards into profiles (e.g. "Work", "Travel") and named decks
- **Local Storage**: Persistent flashcard storage using browser localStorage
- **Audio Playback**: Text-to-speech for Chinese pronunciation via Web Speech API
- **Sidebar Navigation**: Collapsible sidebar with theme toggle (light/dark/system)
- **Responsive Design**: Desktop sidebar + mobile bottom tab bar

### Component Data Flow
1. `ImportPage.vue` handles image upload and real-time progress polling
2. Backend processes image asynchronously while frontend polls `/api/job-status/{job_id}`
3. Results displayed as `Flashcard.vue` components
4. Users can save cards via Pinia store → `storage.js` persistence
5. `RevisionPage.vue` retrieves and displays saved cards for review
6. `DeckManagerPage.vue` manages profiles and deck organization
7. `ProfileManager.vue` and `DeckManager.vue` handle CRUD within their domains

### API Integration
- **Upload Endpoint**: `POST http://localhost:8000/api/start-processing` (returns job ID)
- **Progress Endpoint**: `GET http://localhost:8000/api/job-status/{job_id}` (polled every 500ms)
- **Legacy Endpoint**: `POST http://localhost:8000/api/process-image` (blocking)
- **Request**: Multipart form data with image file and language parameter
- **Response**: Array of sentence objects with original, pinyin, translation, context, grammar, examples

## State Management (Pinia)

### App Store (`stores/app.ts`)
- `sidebarCollapsed` - Sidebar toggle state
- `themeMode` - 'light' | 'dark' | 'system'
- `profiles` - Array of profile objects containing decks
- Current profile/deck selection for card saving
- Persisted to localStorage

### Saved Store (`stores/saved.ts`)
- `cards` - Array of saved flashcard objects
- Add/delete card operations
- Persisted to localStorage

## Configuration

### Environment Variables

The app uses Vite environment variables for different deployment environments:

- `.env.local` - Local development (http://localhost:8000)
- `.env.development` - Mobile testing (http://192.168.1.254:8000)
- `.env.staging` - Staging environment
- `.env.production` - Production environment

**Available Variables:**

- `VITE_API_BASE_URL` - Backend API endpoint
- `VITE_API_TIMEOUT` - API request timeout (ms)
- `VITE_ENABLE_LOGGING` - Enable/disable console logging

### Environment Usage
```bash
# Local development (default)
npm run dev

# Mobile testing (uses 192.168.1.254:8000)
npm run dev:mobile

# Staging build
npm run build:staging

# Production build
npm run build:production
```

### Dependencies
- **Vue 3**: Core UI library with Composition API
- **Vue Router**: Client-side routing
- **Pinia**: State management
- **TypeScript**: Type safety
- **Vite**: Build tool and development server
- **Axios**: HTTP client for API requests

## Testing

### Frontend Testing Commands
```bash
# Verify build succeeds
npm run build

# Start development server
npm run dev

# Check for TypeScript errors
npx vue-tsc --noEmit
```

### Manual Testing Checklist
1. Image upload functionality with various file types
2. **Progress tracking**: Verify real-time updates during processing
3. Language switching between English and French
4. Flashcard display and save functionality
5. Profile/deck creation and card organization
6. Audio playback for Chinese text
7. Sidebar collapse/expand and theme toggle
8. localStorage persistence across page reloads
9. Responsive design on mobile and desktop
10. Error handling for failed API requests

### Browser Storage Testing
```javascript
// Inspect localStorage contents
console.log(JSON.parse(localStorage.getItem('memboost_app') || '{}'))
console.log(JSON.parse(localStorage.getItem('memboost_cards') || '[]'))

// Clear all storage
localStorage.removeItem('memboost_app')
localStorage.removeItem('memboost_cards')
```

## Common Development Tasks

### Adding New Language Support
1. Update language selector in `ImportPage.vue`
2. Add new language option to the backend request parameter
3. Update audio language codes in `Flashcard.vue` and `RevisionPage.vue`

### Adding a New Page/Route
1. Create page component in `src/pages/`
2. Add route in `src/router/index.ts`
3. Add nav item in `src/App.vue` (sidebar + mobile tab bar)

### Extending Flashcard Features
1. Modify card schema in `src/utils/storage.js`
2. Update Pinia store in `src/stores/saved.ts`
3. Update `Flashcard.vue` display component
4. Update `CardFormModal.vue` for editing

### Styling Modifications
1. Update design tokens in `src/index.css` (`:root` variables)
2. Add component-specific CSS classes
3. Test responsive breakpoints (mobile < 768px)

## Deployment

### Production Build
```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview

# Deploy dist/ folder to static hosting (Netlify, Vercel, etc.)
```

### Build Output
- **Location**: `dist/` directory
- **Contents**: Optimized HTML, CSS, and JavaScript files
- **Assets**: Bundled and minified for production

## Troubleshooting

### Common Issues
- **CORS errors**: Ensure backend server is running on port 8000
- **Image upload failures**: Check file size and format (accepts image/*)
- **Progress not updating**: Check browser console for polling errors or network issues
- **Audio not working**: Browser may block autoplay; requires user interaction
- **Storage issues**: Clear localStorage if corrupted data exists
- **Job timeout**: Large images may take longer than expected to process

### Debug Commands
```bash
# Check if development server is running
curl http://localhost:5173

# Check API connectivity
curl http://localhost:8000/api/health

# Check build output
ls -la dist/
```
