import React, { useState, useEffect } from 'react';
import { getCards, deleteCard, getDecks, renameDeck, validateDeckName } from '../utils/storage';
import DeckReviewPage from './DeckReviewPage';
import DeckMoveModal from './DeckMoveModal';
import RenameModal from './RenameModal';

const RevisionPage = ({ currentProfile, currentDeck }) => {
  const [view, setView] = useState('deck-list'); // 'deck-list' or 'deck-review'
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [decks, setDecks] = useState([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [deckToMove, setDeckToMove] = useState(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [deckToRename, setDeckToRename] = useState(null);

  useEffect(() => {
    if (currentProfile) {
      loadDecks();
    }
  }, [currentProfile]);

  const loadDecks = () => {
    if (!currentProfile) return;
    const profileDecks = getDecks(currentProfile.id);
    setDecks(profileDecks);
  };

  const handleDeckSelect = (deck) => {
    setSelectedDeck(deck);
    setView('deck-review');
  };

  const handleBackToDeckList = () => {
    setView('deck-list');
    setSelectedDeck(null);
  };

  const handleMoveDeck = (deck) => {
    setDeckToMove(deck);
    setShowMoveModal(true);
  };

  const handleMoveComplete = (result) => {
    if (result.success) {
      // Refresh the deck list since the deck moved away
      loadDecks();
    }
  };

  const handleRenameDeck = (deck) => {
    setDeckToRename(deck);
    setShowRenameModal(true);
  };

  const handleRenameComplete = (result) => {
    if (result.success) {
      // Refresh the deck list to show updated name
      loadDecks();
    }
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

  if (view === 'deck-review') {
    return <DeckReviewPage deck={selectedDeck} onBack={handleBackToDeckList} />;
  }

  return (
    <div className="revision-page">
      <div className="deck-list-view">
        <div className="revision-header">
          <h2>📚 Study Decks</h2>
          {currentProfile && (
            <div className="profile-info">
              Profile: <strong>{currentProfile.name}</strong>
            </div>
          )}
        </div>

        {!currentProfile ? (
          <div className="no-profile-state">
            <p>Please select a profile first to view your decks.</p>
          </div>
        ) : decks.length === 0 ? (
          <div className="empty-state">
            <p>No decks in this profile yet.</p>
            <p>Create your first deck to start organizing your flashcards!</p>
          </div>
        ) : (
          <div className="decks-grid">
            {decks.map(deck => {
              const deckCards = getCards(deck.id);
              return (
                <div
                  key={deck.id}
                  className="deck-card"
                  onClick={() => handleDeckSelect(deck)}
                >
                  <div className="deck-card-header">
                    <h3>{deck.name}</h3>
                    <div className="deck-actions">
                      <span className="card-count">{deckCards.length} cards</span>
                      <button
                        className="rename-deck-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameDeck(deck);
                        }}
                        title="Rename deck"
                      >
                        ✏️ Rename
                      </button>
                      <button
                        className="move-deck-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveDeck(deck);
                        }}
                        title="Move deck to another profile"
                      >
                        📁 Move
                      </button>
                    </div>
                  </div>
                  {deck.description && (
                    <p className="deck-description">{deck.description}</p>
                  )}
                  <div className="deck-meta">
                    <span>Created: {new Date(deck.createdAt).toLocaleDateString()}</span>
                    {deck.lastStudied && (
                      <span>• Last studied: {new Date(deck.lastStudied).toLocaleDateString()}</span>
                    )}
                  </div>
                  <div className="study-now-btn">
                    Study Now →
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Move Deck Modal */}
      {showMoveModal && deckToMove && (
        <DeckMoveModal
          deck={deckToMove}
          currentProfile={currentProfile}
          onClose={() => {
            setShowMoveModal(false);
            setDeckToMove(null);
          }}
          onMoveComplete={handleMoveComplete}
        />
      )}

      {/* Rename Deck Modal */}
      {showRenameModal && deckToRename && (
        <RenameModal
          isOpen={showRenameModal}
          onClose={() => {
            setShowRenameModal(false);
            setDeckToRename(null);
          }}
          onRename={(newName) => renameDeck(deckToRename.id, newName)}
          currentName={deckToRename.name}
          validateName={(name) => validateDeckName(name, deckToRename.profileId, deckToRename.id)}
          title="Rename Deck"
          itemType="Deck"
        />
      )}
    </div>
  );
};

export default RevisionPage;