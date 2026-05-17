Here is a summary of our brainstorming in English:

---

## 🎯 Goal
Create a personal application to learn and memorize Chinese phrases from **video clips, audio recordings, text, or photos**. The core idea is to anchor each phrase in its **authentic context** (image, sound, video) to enhance memory retention.

---

## 🧱 Chosen Architecture
- **MVP as a web app** (not native) – faster to develop, works on mobile via browser, no app store approval needed.
- **Backend**: Python + FastAPI – integrates OCR (PaddleOCR), sentence segmentation, AI explanation (LongCat), pinyin generation (pypinyin), and real-time progress tracking.
- **Frontend**: React + Vite – simple UI, localStorage for flashcards, real-time progress polling, communicates with backend via REST API.

---

## 📦 First Functional Brick (MVP)
1. **Input**: user imports a **photo** containing Chinese text (or takes a photo via browser).
2. **Two-phase processing**:
   - **Phase 1**: Upload image, receive job ID immediately
   - **Phase 2**: Real-time progress tracking via polling (every 500ms)
3. **Backend processing** with live progress updates:
   - OCR → raw text (15-30%)
   - Sentence segmentation (30-50%)
   - AI explanation for each sentence (50-85%)
   - Pinyin generation (85-95%)
   - Completion (100%)
4. **Frontend display**: Real-time progress indicators with step-by-step feedback
5. **Save**: user can add each card to a personal collection stored in `localStorage`
6. **Review**:
   - Front of card: Chinese + pinyin
   - Click to see translation, context, grammar, example
   - **Audio** via Web Speech API – buttons to listen to Chinese phrase (Mandarin) and translation (French/English)

---

## 🌍 Multi‑language Support (French / English + extensible)
- User selects their **target language** (`fr` or `en`) before importing an image.
- This language is sent to the backend and injected into the **AI prompt** (response generated in chosen language).
- Language is also stored with each flashcard.
- Easy to extend to other languages (Spanish, German, etc.) by adding a new conditional block.

---

## 🔊 Enhanced Review Features
- **Pinyin** systematically generated for each phrase (backend).
- **Text‑to‑speech** (Web Speech API):
  - Chinese (zh-CN)
  - French (fr-FR) or English (en-US) depending on user's language
- No audio storage – generated on the fly by the browser.

---

## 🔮 Future Evolutions (post‑MVP)
- Support for **audio alone** (transcription via Whisper)
- Support for **video** (subtitle extraction + visual clips)
- **Spaced repetition** algorithm (Leitner / SM‑2)
- Export to Anki or PDF
- Authentication and cloud sync
- Convert to PWA or package with Capacitor for native iOS/Android

---

## 💡 Key Takeaways
- Visual/audio context is central to memorization – we keep the link to original media for future versions.
- The MVP focuses on **photos** (simplest to implement) with a complete pipeline: OCR → segmentation → AI explanation → pinyin → audio review.
- **Real-time progress tracking** provides transparency during processing, eliminating misleading completion states.
- **Web‑first** approach allows rapid testing and iteration without app store constraints.

---

## 📍 Where Are Flashcards Stored?
Flashcards are stored **locally in your browser** using `localStorage` (a built‑in key‑value database).  
- No server needed for MVP – avoids user accounts and database complexity.  
- Cards are tied to that specific browser and device (export/import can be added later).

---

**Next concrete step**: code the backend (FastAPI + OCR + segmentation + DeepSeek call + pinyin) and the frontend (image upload + language selector + audio review). Let me know if you want me to detail any specific file or feature.