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
        <h1>🇨🇳 Chinese Partner</h1>
        <div className="lang-selector">
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </div>
        <div className="nav-buttons">
          <button
            className={!showRevision ? 'active' : ''}
            onClick={() => setShowRevision(false)}
          >
            Import
          </button>
          <button
            className={showRevision ? 'active' : ''}
            onClick={() => setShowRevision(true)}
          >
            Review ({JSON.parse(localStorage.getItem('chinese_flashcards') || '[]').length})
          </button>
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