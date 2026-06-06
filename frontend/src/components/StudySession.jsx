import React, { useState, useEffect, useCallback } from 'react';
import { getCards, updateCardDifficulty } from '../utils/storage';
import { ProgressBar, StudyStats } from './ProgressStats';

const StudySession = ({ deck, onComplete }) => {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    studied: 0,
    correct: 0
  });

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

  useEffect(() => {
    const deckCards = getCards(deck.id);
    setCards(deckCards);
    setSessionStats(prev => ({ ...prev, total: deckCards.length }));
  }, [deck.id]);

  const currentCard = cards[currentIndex];

  const handleRating = useCallback((difficulty) => {
    // Update card difficulty in storage
    updateCardDifficulty(currentCard.id, difficulty);

    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      studied: prev.studied + 1,
      correct: prev.correct + (difficulty !== 'hard' ? 1 : 0)
    }));

    // Move to next card or show completion summary
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      setCompleted(true);
    }
  }, [currentCard?.id, currentIndex, cards.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!showAnswer) return;

      switch (event.key) {
        case '1':
        case 'h':
          handleRating('hard');
          break;
        case '2':
        case 'g':
          handleRating('good');
          break;
        case '3':
        case 'e':
          handleRating('easy');
          break;
        case ' ':
          event.preventDefault();
          setShowAnswer(true);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAnswer, handleRating]);

  if (!currentCard) {
    if (completed) {
      const accuracy = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;

      return (
        <div className="study-session">
          <div className="study-header">
            <h2>Study Complete: {deck.name}</h2>
            <button onClick={onComplete} className="exit-btn">
              Exit
            </button>
          </div>

          <div className="completion-summary">
            <h3>🎉 Session Complete!</h3>
            <div className="completion-stats">
              <div className="completion-stat">
                <span className="completion-stat-value">{sessionStats.total}</span>
                <span className="completion-stat-label">Total Cards</span>
              </div>
              <div className="completion-stat">
                <span className="completion-stat-value">{sessionStats.correct}</span>
                <span className="completion-stat-label">Correct</span>
              </div>
              <div className="completion-stat">
                <span className="completion-stat-value">{sessionStats.studied - sessionStats.correct}</span>
                <span className="completion-stat-label">Hard</span>
              </div>
              <div className="completion-stat">
                <span className="completion-stat-value">{accuracy}%</span>
                <span className="completion-stat-label">Accuracy</span>
              </div>
            </div>
            <button onClick={onComplete} className="exit-btn" style={{ marginTop: '24px' }}>
              Exit Study
            </button>
          </div>
        </div>
      );
    }
    return <div>Loading...</div>;
  }

  return (
    <div className="study-session">
      <div className="study-header">
        <h2>Studying: {deck.name}</h2>
        <button onClick={onComplete} className="exit-btn">
          Exit Study
        </button>
      </div>

      <StudyStats
        stats={{
          total: cards.length,
          studied: sessionStats.studied,
          correct: sessionStats.correct,
          streak: 0 // TODO: Add streak tracking
        }}
      />

      <div className="study-card" onClick={() => showAnswer || setShowAnswer(true)}>
        <div className="card-content">
          <h3>{currentCard.original}</h3>
          <p className="pinyin">{currentCard.pinyin}</p>

          {!showAnswer && (
            <div className="click-hint">
              <button className="show-answer-btn">
                Click to show answer
              </button>
            </div>
          )}

          {showAnswer && (
            <div className="answer-section">
              <div className="answer-content">
                <p><strong>Translation:</strong> {currentCard.translation}</p>
                <br />
                <p><strong>Context:</strong> {currentCard.context}</p>
                <br />
                <p><strong>Grammar:</strong> {currentCard.grammar}</p>
                <br />
                <p><strong>Example:</strong> {currentCard.example}</p>
              </div>

              <div className="audio-section">
                <button
                  className="audio-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(currentCard.original, 'zh-CN');
                  }}
                >
                  🔊 Listen Chinese
                </button>
                <button
                  className="audio-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(currentCard.translation, currentCard.targetLang === 'fr' ? 'fr-FR' : 'en-US');
                  }}
                >
                  🔊 Listen Translation
                </button>
              </div>

              <div className="rating-section">
                <h4>How well did you know this?</h4>
                <div className="rating-buttons">
                  <button
                    className="rate-btn hard"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRating('hard');
                    }}
                    title="1 or H - Hard"
                  >
                    ❌ Hard
                  </button>
                  <button
                    className="rate-btn good"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRating('good');
                    }}
                    title="2 or G - Good"
                  >
                    ✅ Good
                  </button>
                  <button
                    className="rate-btn easy"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRating('easy');
                    }}
                    title="3 or E - Easy"
                  >
                    🌟 Easy
                  </button>
                </div>
                <div className="keyboard-hint">
                  <small>Keyboard shortcuts: 1=Hard, 2=Good, 3=Easy, Space=Show Answer</small>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default StudySession;