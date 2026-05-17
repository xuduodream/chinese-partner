import React, { useState, useEffect } from 'react';
import { getAvailableTargetProfiles, getDeckById, getProfileById, moveDeck } from '../utils/storage';

const DeckMoveModal = ({ deck, currentProfile, onClose, onMoveComplete }) => {
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (deck) {
      const profiles = getAvailableTargetProfiles(deck.id);
      setAvailableProfiles(profiles);
    }
  }, [deck]);

  const handleMove = async () => {
    if (!selectedProfileId) {
      setError('Please select a target profile');
      return;
    }

    setIsMoving(true);
    setError('');

    try {
      const result = moveDeck(deck.id, selectedProfileId);

      if (result.success) {
        if (onMoveComplete) {
          onMoveComplete(result);
        }
        onClose();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred while moving the deck');
      console.error('Move error:', err);
    } finally {
      setIsMoving(false);
    }
  };

  const selectedProfile = getProfileById(selectedProfileId);

  if (!deck) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Move Deck</h3>

        <div className="move-deck-info">
          <div className="deck-details">
            <h4>{deck.name}</h4>
            {deck.description && <p className="deck-desc">{deck.description}</p>}
            <p className="current-location">
              Currently in: <strong>{currentProfile?.name}</strong>
            </p>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="target-profile">Move to Profile:</label>
          <select
            id="target-profile"
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            disabled={isMoving}
          >
            <option value="">Select a profile...</option>
            {availableProfiles.map(profile => (
              <option key={profile.id} value={profile.id}>
                {profile.name} ({profile.decks?.length || 0} decks)
              </option>
            ))}
          </select>
        </div>

        {selectedProfile && (
          <div className="target-profile-info">
            <h5>Target Profile:</h5>
            <p><strong>{selectedProfile.name}</strong></p>
            {selectedProfile.description && (
              <p className="profile-desc">{selectedProfile.description}</p>
            )}
            <small className="profile-meta">
              {selectedProfile.decks?.length || 0} decks • Default language: {selectedProfile.defaultTargetLang}
            </small>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="move-confirmation">
          <p className="warning-text">
            ⚠️ This will move the deck "{deck.name}" and all its flashcards to the selected profile.
          </p>
        </div>

        <div className="modal-actions">
          <button
            className="cancel-btn"
            onClick={onClose}
            disabled={isMoving}
          >
            Cancel
          </button>
          <button
            className="move-btn"
            onClick={handleMove}
            disabled={!selectedProfileId || isMoving || availableProfiles.length === 0}
          >
            {isMoving ? 'Moving...' : 'Move Deck'}
          </button>
        </div>

        {availableProfiles.length === 0 && (
          <div className="no-profiles-message">
            <p>No other profiles available to move this deck to.</p>
            <p>Create another profile first to enable deck moving.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckMoveModal;