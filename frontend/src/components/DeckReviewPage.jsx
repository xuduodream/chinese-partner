import React, { useState, useEffect } from 'react';
import { getCards, deleteCard, getDeckById, moveCard, getAvailableTargetDecks } from '../utils/storage';

const DeckReviewPage = ({ deck, onBack }) => {
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [cardToMove, setCardToMove] = useState(null);
  const [availableDecks, setAvailableDecks] = useState([]);
  const [selectedTargetDeck, setSelectedTargetDeck] = useState('');

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

  const handleMoveCard = (card) => {
    setCardToMove(card);
    const decks = getAvailableTargetDecks(card.id);
    setAvailableDecks(decks);
    setShowMoveModal(true);
  };

  const handleMoveToDeck = (targetDeckId) => {
    if (!cardToMove) return;

    const result = moveCard(cardToMove.id, targetDeckId);
    if (result.success) {
      setShowMoveModal(false);
      setCardToMove(null);
      setSelectedTargetDeck('');
      loadCards(); // Refresh the card list
      setSelectedCard(null);
    } else {
      alert(result.message);
    }
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
                  <button
                    className="action-pill show-details"
                    onClick={() => setSelectedCard(selectedCard?.id === card.id ? null : card)}
                  >
                    {selectedCard?.id === card.id ? '👁️ Hide' : '👁️ Show Explanation'}
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

                    <div className="card-bottom-actions">
                      <div className="audio-section">
                        <button
                          className="audio-btn"
                          onClick={(e) => { e.stopPropagation(); speak(card.original, 'zh-CN'); }}
                          title="Listen to Chinese"
                        >
                          🔊 Chinese
                        </button>
                        <button
                          className="audio-btn"
                          onClick={(e) => { e.stopPropagation(); speak(card.translation, card.targetLang === 'fr' ? 'fr-FR' : 'en-US'); }}
                          title="Listen to Translation"
                        >
                          🔊 Translation
                        </button>
                      </div>
                      <div className="actions-col">
                        <button
                          className="action-pill"
                          onClick={(e) => { e.stopPropagation(); handleMoveCard(card); }}
                          title="Move to another deck"
                        >
                          📁 Move
                        </button>
                        <button
                          className="action-pill danger"
                          onClick={(e) => { e.stopPropagation(); handleDelete(card.id); }}
                          title="Delete card"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Move Card Modal */}
      {showMoveModal && cardToMove && (
        <div className="modal-overlay" onClick={() => setShowMoveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Move Card to Another Deck</h3>
            <p>Choose a deck to move this card to:</p>

            {availableDecks.length === 0 ? (
              <div className="no-decks-message">
                No other decks available in this profile.
              </div>
            ) : (
              <div className="move-card-form">
                <div className="form-group">
                  <label htmlFor="target-deck">Select Target Deck:</label>
                  <select
                    id="target-deck"
                    value={selectedTargetDeck}
                    onChange={(e) => setSelectedTargetDeck(e.target.value)}
                  >
                    <option value="">Select a deck...</option>
                    {availableDecks.map(deck => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name} ({deck.cardCount || 0} cards)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="modal-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setShowMoveModal(false);
                      setSelectedTargetDeck('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="save-btn"
                    onClick={() => {
                      if (selectedTargetDeck) {
                        handleMoveToDeck(selectedTargetDeck);
                      }
                    }}
                    disabled={!selectedTargetDeck}
                  >
                    Move Card
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckReviewPage;