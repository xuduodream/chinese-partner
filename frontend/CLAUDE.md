# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the frontend code in this repository.

## Project Overview

Chinese Partner Frontend is a React + Vite application that provides a user interface for uploading Chinese text images, viewing AI-generated explanations, and managing flashcards for language learning.

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
- `src/App.jsx` - Main application component with routing logic and state management
- `src/components/ImageUpload.jsx` - Image upload form and API communication
- `src/components/Flashcard.jsx` - Individual flashcard display with save functionality
- `src/components/RevisionPage.jsx` - Flashcard review interface with audio playback
- `src/utils/storage.js` - localStorage utilities for flashcard persistence
- `src/main.jsx` - React application entry point
- `src/index.css` - Global styles and responsive design
- `vite.config.js` - Vite configuration with React plugin

### Key Features
- **Image Upload**: File input with multipart form data submission to backend API
- **Real-time Progress Tracking**: Live progress updates during image processing via polling
- **Language Selection**: Toggle between English and French translations
- **Flashcard Display**: Shows original text, pinyin, translation, context, grammar notes, and examples
- **Local Storage**: Persistent flashcard storage using browser localStorage
- **Audio Playback**: Text-to-speech for Chinese pronunciation
- **Responsive Design**: Mobile-friendly layout with CSS Grid and Flexbox

### Component Data Flow
1. `App.jsx` manages global state (results, target language, revision mode)
2. `ImageUpload.jsx` handles two-phase upload and real-time progress polling
3. Backend processes image asynchronously while frontend polls for updates
4. Results are passed to `Flashcard.jsx` components for display
5. Users can save cards via `storage.js` utilities
6. `RevisionPage.jsx` retrieves and displays saved cards for review

### API Integration
- **Upload Endpoint**: `POST http://localhost:8000/api/start-processing` (returns job ID immediately)
- **Progress Endpoint**: `GET http://localhost:8000/api/job-status/{job_id}` (polled every 500ms)
- **Legacy Endpoint**: `POST http://localhost:8000/api/process-image` (for backward compatibility)
- **Request**: Multipart form data with image file and language parameter
- **Response**: Array of sentence objects with original text, pinyin, translation, context, grammar, and examples

### Storage Schema
Flashcards are stored in localStorage with the following structure:
```javascript
{
  id: number,
  createdAt: ISO string,
  reviewCount: number,
  lastReviewed: ISO string | null,
  original: string,
  pinyin: string,
  targetLang: string,
  translation: string,
  context: string,
  grammar: string,
  example: string
}
```

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

### Development Server

- **Port**: 5173 (configured in vite.config.js)
- **Hot Reload**: Enabled by default

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
- **React 18**: Core UI library
- **Axios**: HTTP client for API requests
- **Vite**: Build tool and development server
- **@vitejs/plugin-react**: React support for Vite

## Testing

### Frontend Testing Commands
```bash
# Verify build succeeds
npm run build

# Start development server
npm run dev

# Check for TypeScript errors (if types were added)
npx tsc --noEmit
```

### Manual Testing Checklist
1. Image upload functionality with various file types
2. **Progress tracking**: Verify real-time updates during processing
3. Language switching between English and French
4. Flashcard display and save functionality
5. Audio playback for Chinese text
6. localStorage persistence across page reloads
7. Responsive design on mobile and desktop
8. Error handling for failed API requests

### Browser Storage Testing
```javascript
// Test localStorage functionality
const testCard = {
  original: '测试',
  pinyin: 'cè shì',
  translation: 'test',
  context: 'testing context',
  grammar: 'testing grammar',
  example: 'testing example'
};

// Save card
saveCard(testCard);

// Retrieve cards
const cards = getCards();
console.log(cards);

// Delete card
deleteCard(cards[0]?.id);
```

## Common Development Tasks

### Adding New Language Support
1. Update language selector buttons in `App.jsx`
2. Add new language option to targetLang state
3. Update audio language codes in `Flashcard.jsx` and `RevisionPage.jsx`

### Extending Flashcard Features
1. Modify flashcard data structure in `App.jsx` handleSaveCard function
2. Update storage schema in `storage.js`
3. Extend flashcard display components

### Styling Modifications
1. Update global styles in `index.css`
2. Add component-specific CSS classes
3. Test responsive breakpoints

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

# Inspect localStorage contents
console.log(JSON.parse(localStorage.getItem('chinese_flashcards') || '[]'))

# Clear flashcard storage
localStorage.removeItem('chinese_flashcards')

# Check build output
ls -la dist/
```