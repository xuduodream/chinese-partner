import React, { useState } from 'react';
import { getDecks } from '../utils/storage';

const Flashcard = ({ card, onSave, currentDeck, onDeckSelect }) => {
  const [showBack, setShowBack] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeckSelector, setShowDeckSelector] = useState(false);
  const [availableDecks, setAvailableDecks] = useState([]);

  const speak = (text, langCode) => {
    if (!window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;

    // Try to find a voice that matches the language
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => voice.lang.startsWith(langCode.split('-')[0]));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleSave = () => {
    if (currentDeck) {
      // Save to current deck immediately
      onSave(card, currentDeck.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      // Show deck selector if no current deck
      const decks = getDecks();
      setAvailableDecks(decks);
      setShowDeckSelector(true);
    }
  };

  const handleSaveToDeck = (deckId) => {
    onSave(card, deckId);
    setShowDeckSelector(false);
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
          <br />
          <p><strong>Context:</strong> {card.context}</p>
          <br />
          <p><strong>Grammar:</strong> {card.grammar}</p>
          <br />
          <p><strong>Example:</strong> {card.example}</p>

          <div className="audio-buttons">
            <button onClick={(e) => { e.stopPropagation(); speak(card.original, 'zh-CN'); }}>
              🔊 Listen Chinese
            </button>
            <button onClick={(e) => { e.stopPropagation(); speak(card.translation, card.targetLang === 'fr' ? 'fr-FR' : 'en-US'); }}>
              🔊 Listen Translation
            </button>
          </div>

          <button
            className="save-btn"
            onClick={(e) => { e.stopPropagation(); handleSave(); }}
            disabled={saved}
          >
            {saved ? '✓ Saved!' : `Save to ${currentDeck ? currentDeck.name : 'Deck'}`}
          </button>

          {/* Deck Selection Modal */}
          {showDeckSelector && (
            <div className="modal-overlay" onClick={() => setShowDeckSelector(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Save to Deck</h3>
                <p>Choose a deck to save this flashcard:</p>

                {availableDecks.length === 0 ? (
                  <div className="no-decks-message">
                    No decks available. Please create a deck first.
                  </div>
                ) : (
                  <div className="deck-selection-list">
                    {availableDecks.map(deck => (
                      <button
                        key={deck.id}
                        className="deck-selection-item"
                        onClick={() => handleSaveToDeck(deck.id)}
                      >
                        <span className="deck-selection-name">{deck.name}</span>
                        <span className="deck-selection-count">({deck.cardCount || 0} cards)</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => setShowDeckSelector(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Flashcard;