import React, { useState, useEffect } from 'react';
import { getDecks, createDeck, getDeckById, deleteDeck, getAvailableTargetProfiles, moveDeck } from '../utils/storage';

const DeckManager = ({
  currentProfile,
  currentDeck,
  onDeckChange,
  onCreateDeck
}) => {
  const [decks, setDecks] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeckList, setShowDeckList] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');

  useEffect(() => {
    if (currentProfile) {
      loadDecks();
    } else {
      setDecks([]);
    }
  }, [currentProfile]);

  const loadDecks = () => {
    if (!currentProfile) return;

    const deckList = getDecks(currentProfile.id);
    setDecks(deckList);

    // Auto-select first deck if none selected and decks exist
    if (!currentDeck && deckList.length > 0) {
      onDeckChange(deckList[0]);
    }
  };

  const handleCreateDeck = () => {
    if (!newDeckName.trim() || !currentProfile) return;

    const deck = createDeck(
      currentProfile.id,
      newDeckName.trim(),
      newDeckDescription.trim()
    );

    setNewDeckName('');
    setNewDeckDescription('');
    setShowCreateModal(false);

    loadDecks();
    onDeckChange(deck);

    if (onCreateDeck) {
      onCreateDeck(deck);
    }
  };

  const handleDeckSelect = (deckId) => {
    const deck = getDeckById(deckId);
    if (deck) {
      onDeckChange(deck);
      setShowDeckList(false);
    }
  };

  const handleDeleteDeck = (deckId, event) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this deck? All cards in this deck will be permanently deleted.')) {
      deleteDeck(deckId);
      loadDecks();

      // If we deleted the current deck, select another one or clear selection
      if (currentDeck && currentDeck.id === deckId) {
        if (decks.length > 1) {
          const remainingDecks = decks.filter(d => d.id !== deckId);
          onDeckChange(remainingDecks[0]);
        } else {
          onDeckChange(null);
        }
      }
    }
  };

  const handleQuickMove = (deckId) => {
    const availableProfiles = getAvailableTargetProfiles(deckId);

    if (availableProfiles.length === 0) {
      alert('No other profiles available to move this deck to. Create another profile first.');
      return;
    }

    // Simple prompt for quick move (for now, move to first available profile)
    const targetProfile = availableProfiles[0];
    const deck = getDeckById(deckId);

    if (window.confirm(`Move deck "${deck.name}" to profile "${targetProfile.name}"?`)) {
      const result = moveDeck(deckId, targetProfile.id);

      if (result.success) {
        loadDecks();

        // If we moved the current deck, clear selection
        if (currentDeck && currentDeck.id === deckId) {
          onDeckChange(null);
        }

        // Show success feedback
        console.log(`Deck moved successfully to ${targetProfile.name}`);
      } else {
        alert(`Failed to move deck: ${result.message}`);
      }
    }
  };

  if (!currentProfile) {
    return (
      <div className="deck-manager">
        <div className="deck-selector">
          <span className="no-profile-message">Please select a profile first</span>
        </div>
      </div>
    );
  }

  return (
    <div className="deck-manager">
      {/* Deck Selector */}
      <div className="deck-selector">
        <button
          className="deck-selector-btn"
          onClick={() => setShowDeckList(!showDeckList)}
        >
          <span className="deck-name">
            {currentDeck ? currentDeck.name : 'Select a deck...'}
          </span>
          <span className="deck-count">
            {currentDeck ? `(${currentDeck.cardCount || 0} cards)` : ''}
          </span>
          <span className="dropdown-arrow">▼</span>
        </button>

        <button
          className="create-deck-btn"
          onClick={() => setShowCreateModal(true)}
        >
          + New Deck
        </button>
      </div>

      {/* Deck Dropdown */}
      {showDeckList && (
        <div className="deck-dropdown">
          {decks.length === 0 ? (
            <div className="no-decks-message">
              No decks yet. Create your first deck!
            </div>
          ) : (
            <div className="deck-list">
              {decks.map(deck => (
                <div
                  key={deck.id}
                  className={`deck-item ${currentDeck && currentDeck.id === deck.id ? 'selected' : ''}`}
                  onClick={() => handleDeckSelect(deck.id)}
                >
                  <div className="deck-item-info">
                    <span className="deck-item-name">{deck.name}</span>
                    <span className="deck-item-count">({deck.cardCount || 0} cards)</span>
                    {deck.description && (
                      <span className="deck-item-description">{deck.description}</span>
                    )}
                  </div>
                  <button
                    className="delete-deck-btn"
                    onClick={(e) => handleDeleteDeck(deck.id, e)}
                    title="Delete deck"
                  >
                    🗑️
                  </button>
                  <button
                    className="move-deck-dropdown-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickMove(deck.id);
                    }}
                    title="Move deck to another profile"
                  >
                    📁
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Deck Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Deck</h3>
            <p className="profile-context">in profile: {currentProfile.name}</p>

            <div className="form-group">
              <label htmlFor="deck-name">Deck Name *</label>
              <input
                id="deck-name"
                type="text"
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                placeholder="e.g., Greetings, Food & Dining, HSK 1"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="deck-description">Description</label>
              <textarea
                id="deck-description"
                value={newDeckDescription}
                onChange={(e) => setNewDeckDescription(e.target.value)}
                placeholder="Optional description for this deck"
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                className="create-btn"
                onClick={handleCreateDeck}
                disabled={!newDeckName.trim()}
              >
                Create Deck
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Deck Info */}
      {currentDeck && (
        <div className="current-deck-info">
          <h4>{currentDeck.name}</h4>
          {currentDeck.description && (
            <p className="deck-description">{currentDeck.description}</p>
          )}
          <small className="deck-meta">
            Created: {new Date(currentDeck.createdAt).toLocaleDateString()}
            {currentDeck.cardCount !== undefined && (
              <> • Cards: {currentDeck.cardCount}</>
            )}
            {currentDeck.lastStudied && (
              <> • Last studied: {new Date(currentDeck.lastStudied).toLocaleDateString()}</>
            )}
          </small>
        </div>
      )}
    </div>
  );
};

export default DeckManager;