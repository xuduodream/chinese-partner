import React, { useState, useEffect } from 'react';
import ImageUpload from './components/ImageUpload';
import Flashcard from './components/Flashcard';
import RevisionPage from './components/RevisionPage';
import ProfileManager from './components/ProfileManager';
import DeckManager from './components/DeckManager';
import { saveCard, checkAndMigrateData, getProfiles, getDecks, createProfile, createDeck } from './utils/storage';
import './index.css';

function App() {
  const [results, setResults] = useState([]);
  const [targetLang, setTargetLang] = useState('en');
  const [showRevision, setShowRevision] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [currentDeck, setCurrentDeck] = useState(null);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);

  useEffect(() => {
    // Check for data migration on app load
    const needsMigration = checkAndMigrateData();
    if (needsMigration) {
      setShowMigrationDialog(true);
      setTimeout(() => {
        setShowMigrationDialog(false);
        setMigrationComplete(true);
      }, 3000);
    }

    // Load existing profiles and set first one as current
    const profiles = getProfiles();
    if (profiles.length > 0) {
      setCurrentProfile(profiles[0]);
      // Set first deck of first profile as current deck
      if (profiles[0].decks && profiles[0].decks.length > 0) {
        const firstDeck = getDecks().find(deck => deck.id === profiles[0].decks[0]);
        if (firstDeck) {
          setCurrentDeck(firstDeck);
        }
      }
    }
  }, []);

  const handleResults = (sentences) => {
    setResults(sentences);
    setShowRevision(false);
  };

  const handleSaveCard = (cardData, deckId = null) => {
    saveCard({
      original: cardData.original,
      pinyin: cardData.pinyin,
      targetLang: targetLang,
      translation: cardData.translation,
      context: cardData.context,
      grammar: cardData.grammar,
      example: cardData.example
    }, deckId || currentDeck?.id);
  };

  const handleProfileChange = (profile) => {
    setCurrentProfile(profile);
    setCurrentDeck(null); // Reset deck when profile changes
  };

  const handleDeckChange = (deck) => {
    setCurrentDeck(deck);
  };

  return (
    <div className="app">
      <header>
        <h1>MemBoost</h1>

        {/* Profile and Deck Management */}
        <div className="study-context">
          <ProfileManager
            currentProfile={currentProfile}
            onProfileChange={handleProfileChange}
          />
          <DeckManager
            currentProfile={currentProfile}
            currentDeck={currentDeck}
            onDeckChange={handleDeckChange}
          />
        </div>

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

      {/* Migration Dialog */}
      {showMigrationDialog && (
        <div className="migration-dialog">
          <div className="migration-content">
            <h3>🎉 Welcome to Profiles & Decks!</h3>
            <p>We've upgraded your flashcard system to support profiles and decks, just like Anki!</p>
            <p>Your existing flashcards have been migrated to a "Personal" profile with a "General" deck.</p>
            <div className="migration-features">
              <div className="feature">📁 Organize cards into profiles</div>
              <div className="feature">📚 Create multiple decks per profile</div>
              <div className="feature">🎯 Study specific topics or levels</div>
            </div>
          </div>
        </div>
      )}

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
                    currentDeck={currentDeck}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <RevisionPage currentProfile={currentProfile} currentDeck={currentDeck} />
        )}
      </main>
    </div>
  );
}

export default App;