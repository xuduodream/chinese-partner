import React, { useState, useEffect } from 'react';
import { getCards, deleteCard, getDecks, renameDeck, validateDeckName, deleteDeck, getDeckStudyStats } from '../utils/storage';
import DeckReviewPage from './DeckReviewPage';
import StudySession from './StudySession';
import DeckMoveModal from './DeckMoveModal';
import RenameModal from './RenameModal';

const RevisionPage = ({ currentProfile, currentDeck, refreshTrigger = 0 }) => {
  const [view, setView] = useState('deck-list'); // 'deck-list', 'deck-review', or 'study-session'
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

  useEffect(() => {
    if (currentProfile) {
      loadDecks();
    }
  }, [refreshTrigger, currentProfile]);

  const loadDecks = () => {
    if (!currentProfile) return;
    const profileDecks = getDecks(currentProfile.id);
    setDecks(profileDecks);
  };

  const handleDeckSelect = (deck) => {
    setSelectedDeck(deck);
    setView('deck-review');
  };

  const handleStudySession = (deck) => {
    setSelectedDeck(deck);
    setView('study-session');
  };

  const handleBackToDeckList = () => {
    setView('deck-list');
    setSelectedDeck(null);
  };

  const handleStudyComplete = () => {
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

  const handleDeleteDeck = (deck) => {
    const deckCards = getCards(deck.id);
    if (deckCards.length > 0) {
      if (!window.confirm(`Are you sure you want to delete the deck "${deck.name}"? This will also delete ${deckCards.length} cards in this deck. This action cannot be undone.`)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete the deck "${deck.name}"? This action cannot be undone.`)) {
        return;
      }
    }

    deleteDeck(deck.id);
    loadDecks();
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.actions-dropdown')) {
        const dropdowns = document.querySelectorAll('.actions-menu');
        dropdowns.forEach(dropdown => {
          dropdown.style.display = 'none';
        });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

  if (view === 'study-session') {
    return <StudySession deck={selectedDeck} onComplete={handleStudyComplete} />;
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
          <div className="decks-table-container">
            <table className="decks-table">
              <thead>
                <tr>
                  <th>Deck Name</th>
                  <th>Cards</th>
                  <th>Created</th>
                  <th>Last Studied</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {decks.map(deck => {
                  const deckCards = getCards(deck.id);
                  return (
                    <tr key={deck.id}>
                      <td className="deck-name-cell">
                        <div>
                          <div className="deck-name">{deck.name}</div>
                          {deck.description && (
                            <div className="deck-description">{deck.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="deck-cards">
                        <span className="card-count" onClick={(e) => {
                          e.stopPropagation();
                          handleDeckSelect(deck);
                        }}>
                          {deckCards.length}
                        </span>
                      </td>
                      <td className="deck-date">
                        {new Date(deck.createdAt).toLocaleDateString()}
                      </td>
                      <td className="deck-date">
                        {deck.lastStudied ? new Date(deck.lastStudied).toLocaleDateString() : '-'}
                      </td>
                      <td className="deck-actions-cell">
                        <div className="deck-row-actions">
                          <button
                            className="study-btn-table"
                            onClick={() => handleStudySession(deck)}
                            disabled={deckCards.length === 0}
                          >
                            Study Now
                          </button>
                          <div className="actions-dropdown">
                            <button
                              className="actions-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                const dropdown = e.currentTarget.nextElementSibling;
                                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                              }}
                              title="Deck actions"
                            >
                              ⋮
                            </button>
                            <div className="actions-menu">
                              <button
                                className="action-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameDeck(deck);
                                  e.currentTarget.closest('.actions-menu').style.display = 'none';
                                }}
                              >
                                ✏️ Rename
                              </button>
                              <button
                                className="action-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveDeck(deck);
                                  e.currentTarget.closest('.actions-menu').style.display = 'none';
                                }}
                              >
                                📁 Move
                              </button>
                              <button
                                className="action-item delete-action"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDeck(deck);
                                  e.currentTarget.closest('.actions-menu').style.display = 'none';
                                }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
          onRename={async (newName) => {
            const result = renameDeck(deckToRename.id, newName);
            if (result.success) {
              // Refresh the deck list to show updated name
              loadDecks();
            }
            return result;
          }}
          currentName={deckToRename.name}
          validateName={(name) => validateDeckName(name, deckToRename.profileId, deckToRename.id)}
          title="Rename Deck"
          itemType="Deck"
        />
      )}
    </div>
  );
}

export default RevisionPage;