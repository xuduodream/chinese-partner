import React, { useState, useEffect } from 'react';
import ImageUpload from './components/ImageUpload';
import Flashcard from './components/Flashcard';
import RevisionPage from './components/RevisionPage';
import ProfileManager from './components/ProfileManager';
import DeckManager from './components/DeckManager';
import LandingPage from './components/LandingPage';
import BackupRestorePage from './components/BackupRestorePage';
import DeckManagerPage from './components/DeckManagerPage';
import { saveCard, checkAndMigrateData, getProfiles, getDecks, getCards, createProfile, createDeck, getProfileById, renameProfile, deleteProfile } from './utils/storage';
import './index.css';

function App() {
  const [results, setResults] = useState([]);
  const [targetLang, setTargetLang] = useState('en');
  const [showRevision, setShowRevision] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [showBackup, setShowBackup] = useState(false);
  const [showDeckManager, setShowDeckManager] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [currentDeck, setCurrentDeck] = useState(null);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deckListVersion, setDeckListVersion] = useState(0);
  const [savedCards, setSavedCards] = useState(new Set());
  const [showProfileBar, setShowProfileBar] = useState(true);
  const [showDeckSelector, setShowDeckSelector] = useState(false);
  const [pendingCard, setPendingCard] = useState(null);
  const [availableDecks, setAvailableDecks] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [step, setStep] = useState('profile'); // 'profile' or 'deck'

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

  const handleSaveCardWithFeedback = (cardData, idx) => {
    setPendingCard({ cardData, idx });
    setSelectedProfileId(null);
    setStep('profile');
    setShowDeckSelector(true);
  };

  const handleProfileSelect = (profileId) => {
    setSelectedProfileId(profileId);
    const decks = getDecks(profileId);
    setAvailableDecks(decks);
    setStep('deck');
  };

  const handleSaveToDeck = (deckId) => {
    if (pendingCard) {
      handleSaveCard(pendingCard.cardData, deckId);
      setSavedCards(prev => new Set(prev).add(pendingCard.idx));
      setShowDeckSelector(false);
      setPendingCard(null);
      setSelectedProfileId(null);
      setStep('profile');
    }
  };

  const handleProfileChange = (profile) => {
    setCurrentProfile(profile);
    setCurrentDeck(null); // Reset deck when profile changes
  };

  const handleDeckChange = (deck) => {
    setCurrentDeck(deck);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.profile-actions-menu')) {
        const dropdowns = document.querySelectorAll('.dropdown-content');
        dropdowns.forEach(dropdown => {
          dropdown.style.display = 'none';
        });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="app">
      <div className="app-layout">
        {/* Left Sidebar Navigation */}
        <nav className={`sidebar-nav ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="nav-header">
            <h1>{sidebarCollapsed ? 'MB' : 'MemBoost'}</h1>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>

          <div className="nav-menu">
            <button
              className={showLanding ? 'active' : ''}
              onClick={() => {
                setShowLanding(true);
                setShowRevision(false);
                setShowBackup(false);
                setShowDeckManager(false);
              }}
            >
              <span className="nav-icon">🏠</span>
              <span className="nav-text">Home</span>
            </button>
            <button
              className={!showRevision && !showLanding && !showBackup && !showDeckManager ? 'active' : ''}
              onClick={() => {
                setShowRevision(false);
                setShowLanding(false);
                setShowBackup(false);
                setShowDeckManager(false);
              }}
            >
              <span className="nav-icon">📤</span>
              <span className="nav-text">Import</span>
            </button>
            <button
              className={showRevision ? 'active' : ''}
              onClick={() => {
                setShowRevision(true);
                setShowLanding(false);
                setShowBackup(false);
                setShowDeckManager(false);
              }}
            >
              <span className="nav-icon">📚</span>
              <span className="nav-text">Review</span>
            </button>
            <button
              className={showDeckManager ? 'active' : ''}
              onClick={() => {
                setShowDeckManager(true);
                setShowLanding(false);
                setShowRevision(false);
                setShowBackup(false);
              }}
            >
              <span className="nav-icon">🗂️</span>
              <span className="nav-text">Manager</span>
            </button>
            <button
              className={showBackup ? 'active' : ''}
              onClick={() => {
                setShowBackup(true);
                setShowLanding(false);
                setShowRevision(false);
                setShowDeckManager(false);
              }}
            >
              <span className="nav-icon">💾</span>
              <span className="nav-text">Backup</span>
            </button>
          </div>
        </nav>

        {/* Main Content Area */}
        <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {/* Language Selector - shown on Import page only */}
          {!showLanding && !showRevision && !showBackup && !showDeckManager && (
            <div className="lang-selector">
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>
          )}

          {/* Profile and Deck Management - shown on Review page only */}
          {showRevision && showProfileBar && (
            <div className="study-context">
              <div className="profile-deck-bar">
                <div className="profile-section">
                  <label>Study Profile:</label>
                  <select
                    value={currentProfile?.id || ''}
                    onChange={(e) => {
                      const profile = getProfiles().find(p => p.id === e.target.value);
                      if (profile) handleProfileChange(profile);
                    }}
                  >
                    <option value="">Select profile...</option>
                    {getProfiles().map(profile => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>

                  <div className="profile-actions-dropdown">
                    <button
                      className="action-btn new-profile-btn"
                      onClick={() => {
                        const name = prompt('New profile name:');
                        if (name) {
                          const profile = createProfile(name.trim(), '', 'en');
                          handleProfileChange(profile);
                        }
                      }}
                    >
                      + New Profile
                    </button>

                    {currentProfile && (
                      <div className="profile-actions-menu">
                        <button
                          className="dropdown-toggle"
                          title="Profile actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            const dropdown = e.currentTarget.nextElementSibling;
                            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                          }}
                        >
                          ⋮
                        </button>
                        <div className="dropdown-content">
                          <button
                            onClick={(e) => {
                              const newName = prompt('Rename profile:', currentProfile.name);
                              if (newName && newName !== currentProfile.name) {
                                renameProfile(currentProfile.id, newName.trim());
                                const updated = getProfileById(currentProfile.id);
                                if (updated) handleProfileChange(updated);
                              }
                              // Close dropdown
                              e.target.closest('.dropdown-content').style.display = 'none';
                            }}
                          >
                            ✏️ Rename Profile
                          </button>
                          <button
                            className="delete-action"
                            onClick={(e) => {
                              if (window.confirm(`Delete profile "${currentProfile.name}"?`)) {
                                deleteProfile(currentProfile.id);
                                const remaining = getProfiles();
                                if (remaining.length > 0) {
                                  handleProfileChange(remaining[0]);
                                } else {
                                  handleProfileChange(null);
                                }
                              }
                              // Close dropdown
                              e.target.closest('.dropdown-content').style.display = 'none';
                            }}
                          >
                            🗑️ Delete Profile
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="deck-section">
                  <button
                    className="action-btn"
                    onClick={() => {
                      if (!currentProfile) {
                        alert('Please select a profile first');
                        return;
                      }
                      const name = prompt('New deck name:');
                      if (name) {
                        const deck = createDeck(currentProfile.id, name.trim(), '');
                        handleDeckChange(deck);
                        // Trigger deck list refresh
                        setDeckListVersion(prev => prev + 1);
                      }
                    }}
                  >
                    + New Deck
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Save to Deck Modal */}
          {showDeckSelector && (
            <div className="modal-overlay" onClick={() => {
              setShowDeckSelector(false);
              setPendingCard(null);
              setSelectedProfileId(null);
              setStep('profile');
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {step === 'profile' ? (
                  <>
                    <h3>Save to Profile</h3>
                    <p>Choose a profile, then a deck:</p>

                    <div className="profile-selection-list">
                      {getProfiles().map(profile => (
                        <button
                          key={profile.id}
                          className="profile-selection-item"
                          onClick={() => handleProfileSelect(profile.id)}
                        >
                          <span className="profile-selection-name">👤 {profile.name}</span>
                          <span className="profile-selection-count">
                            ({profile.decks?.length || 0} decks)
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="modal-actions">
                      <button
                        className="cancel-btn"
                        onClick={() => {
                          setShowDeckSelector(false);
                          setPendingCard(null);
                          setStep('profile');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3>Save to Deck</h3>
                    <button
                      className="back-btn"
                      onClick={() => setStep('profile')}
                    >
                      ← Back to profiles
                    </button>

                    {availableDecks.length === 0 ? (
                      <div className="no-decks-message">
                        <p>No decks in this profile.</p>
                        <button
                          className="create-deck-inline-btn"
                          onClick={() => {
                            const name = prompt('New deck name:');
                            if (name && name.trim()) {
                              const deck = createDeck(selectedProfileId, name.trim(), '');
                              handleSaveToDeck(deck.id);
                            }
                          }}
                        >
                          ＋ New Deck
                        </button>
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
                            <span className="deck-selection-count">({getCards(deck.id).length} cards)</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="modal-actions">
                      <button
                        className="cancel-btn"
                        onClick={() => {
                          setShowDeckSelector(false);
                          setPendingCard(null);
                          setSelectedProfileId(null);
                          setStep('profile');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

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
            {showLanding ? (
              <LandingPage onStart={() => {
                setShowLanding(false);
                setShowDeckManager(false);
              }} />
            ) : showBackup ? (
              <BackupRestorePage />
            ) : showDeckManager ? (
              <DeckManagerPage />
            ) : !showRevision ? (
              <>
                <ImageUpload onResults={handleResults} targetLang={targetLang} />
                {results.length > 0 && (
                  <div className="results">
                    <h2>Extracted Sentences</h2>
                    <div className="flashcards-table-container">
                      <table className="flashcards-table">
                        <thead>
                          <tr>
                            <th>Chinese</th>
                            <th>Pinyin</th>
                            <th>Translation</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((sentence, idx) => (
                            <React.Fragment key={idx}>
                              <tr>
                                <td className="chinese-text">{sentence.original}</td>
                                <td className="pinyin-text">{sentence.pinyin}</td>
                                <td className="translation-text">{sentence.translation}</td>
                                <td className="actions-cell">
                                  <div className="flashcard-actions">
                                    <button
                                      className="action-pill"
                                      onClick={() => {
                                        if (window.speechSynthesis) {
                                          const utterance = new SpeechSynthesisUtterance(sentence.original);
                                          utterance.lang = 'zh-CN';
                                          window.speechSynthesis.speak(utterance);
                                        }
                                      }}
                                      title="Listen to Chinese"
                                    >
                                      🔊 Chinese
                                    </button>
                                    <button
                                      className="action-pill"
                                      onClick={() => {
                                        if (window.speechSynthesis) {
                                          const utterance = new SpeechSynthesisUtterance(sentence.translation);
                                          utterance.lang = targetLang === 'fr' ? 'fr-FR' : 'en-US';
                                          window.speechSynthesis.speak(utterance);
                                        }
                                      }}
                                      title="Listen to Translation"
                                    >
                                      🔊 Translation
                                    </button>
                                    <button
                                      className="action-pill show-details"
                                      onClick={(e) => {
                                        const row = e.currentTarget.closest('tr');
                                        const explanationRow = row.nextElementSibling;
                                        if (explanationRow && explanationRow.classList.contains('explanation-row')) {
                                          explanationRow.style.display = explanationRow.style.display === 'none' ? 'table-row' : 'none';
                                        }
                                      }}
                                    >
                                      💡 Details
                                    </button>
                                    {savedCards.has(idx) ? (
                                      <button className="action-pill save" disabled>✅ Saved</button>
                                    ) : (
                                      <button
                                        className="action-pill save"
                                        onClick={() => handleSaveCardWithFeedback(sentence, idx)}
                                      >
                                        💾 Save
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              <tr className="explanation-row" style={{display: 'none'}}>
                                <td colSpan="4" className="explanation-expanded">
                                  <div className="explanation-content">
                                    <div className="explanation-details">
                                      <div><strong>Context:</strong> {sentence.context}</div>
                                      <div><strong>Grammar:</strong> {sentence.grammar}</div>
                                      <div><strong>Example:</strong> {sentence.example}</div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <RevisionPage
                currentProfile={currentProfile}
                currentDeck={currentDeck}
                refreshTrigger={deckListVersion}
                onViewChange={(view) => setShowProfileBar(view === 'deck-list')}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;