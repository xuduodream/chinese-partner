import React, { useState, useEffect } from 'react';
import { getCards, deleteCard, getDeckById } from '../utils/storage';

const DeckReviewPage = ({ deck, onBack }) => {
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    if (deck) {
      loadCards();
    }
  }, [deck]);

  const loadCards = () => {
    const deckCards = getCards(deck.id);
    setCards(deckCards);
  };

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

  const handleDelete = (id) => {
    deleteCard(id);
    loadCards();
    setSelectedCard(null);
  };

  if (!deck) {
    return (
      <div className="deck-review-page">
        <p>No deck selected</p>
      </div>
    );
  }

  return (
    <div className="deck-review-page">
      <div className="deck-review-header">
        <button className="back-btn" onClick={onBack}>
          ← Back to Decks
        </button>
        <h2>{deck.name}</h2>
        <div className="deck-info">
          <span>{cards.length} cards</span>
          {deck.description && <span>• {deck.description}</span>}
        </div>
      </div>

      <div className="deck-cards-list">
        {cards.length === 0 ? (
          <div className="empty-deck">
            <p>No flashcards in this deck yet.</p>
            <p>Import some images to add cards to this deck!</p>
          </div>
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
                    <br />
                    <p><strong>Context:</strong> {card.context}</p>
                    <br />
                    <p><strong>Grammar:</strong> {card.grammar}</p>
                    <br />
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

export default DeckReviewPage;