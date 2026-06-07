import React, { useState, useEffect, useCallback } from 'react';
import {
  getStudyQueue,
  getCardsDueForReview,
  updateCardDifficulty,
  updateDeckLastStudied,
} from '../utils/storage';
import { ProgressBar, StudyStats } from './ProgressStats';

const formatNextReviewLabel = (nextReviewIso) => {
  if (!nextReviewIso) return 'not scheduled';
  const now = new Date();
  const next = new Date(nextReviewIso);
  const diffMs = next - now;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs <= 0) return 'due now';
  if (diffDays === 0) return 'later today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays < 30) return `in ${diffDays} days`;
  return `on ${next.toLocaleDateString()}`;
};

const StudySession = ({ deck, onComplete }) => {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [dueCount, setDueCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    studied: 0,
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [lastRating, setLastRating] = useState(null);

  const speak = (text, langCode) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((voice) =>
      voice.lang.startsWith(langCode.split('-')[0])
    );
    if (preferredVoice) utterance.voice = preferredVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // Load study queue: due cards first, then new cards (up to 20)
  useEffect(() => {
    const { queue, due, newCards } = getStudyQueue(deck.id, 20);
    setCards(queue);
    setDueCount(due.length);
    setNewCount(newCards.length);
    setSessionStats((prev) => ({ ...prev, total: queue.length }));
  }, [deck.id]);

  const currentCard = cards[currentIndex];

  const handleRating = useCallback(
    (rating) => {
      if (completed || !currentCard) return;

      // Save Anki schedule and capture result
      const result = updateCardDifficulty(currentCard.id, rating);

      // Show next-review feedback
      if (result.success) {
        setLastRating({
          rating,
          nextReview: result.nextReview,
          interval: result.interval,
          easeFactor: result.easeFactor,
          state: result.state,
          lapseCount: result.lapseCount,
        });
      }

      // Update session stats
      setSessionStats((prev) => ({
        ...prev,
        studied: prev.studied + 1,
        [rating]: (prev[rating] || 0) + 1,
      }));

      // Move to next card or check for relearning cards
      if (currentIndex < cards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setShowAnswer(false);
      } else {
        // Check if any cards became due during this session (Again/Hard)
        const freshDue = getCardsDueForReview(deck.id);
        if (freshDue.length > 0) {
          setCards(freshDue);
          setCurrentIndex(0);
          setShowAnswer(false);
          setLastRating(null);
          setSessionStats((prev) => ({ ...prev, total: prev.total + freshDue.length }));
          return;
        }
        // Truly done — no more cards due
        setCompleted(true);
        updateDeckLastStudied(deck.id);
      }
    },
    [currentCard?.id, currentIndex, cards.length, completed, deck.id]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      switch (event.key) {
        case '1':
        case 'a':
          handleRating('again');
          break;
        case '2':
        case 'h':
          handleRating('hard');
          break;
        case '3':
        case 'g':
          handleRating('good');
          break;
        case '4':
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
  }, [handleRating]);

  // ── Completion Screen ──────────────────────────────────────────────

  if (completed) {
    const total = sessionStats.studied || 1;
    const correct = sessionStats.good + sessionStats.easy;
    const accuracy = Math.round((correct / total) * 100);

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
              <span className="completion-stat-value">{sessionStats.studied}</span>
              <span className="completion-stat-label">Studied</span>
            </div>
            <div className="completion-stat">
              <span className="completion-stat-value">{correct}</span>
              <span className="completion-stat-label">Correct</span>
            </div>
            <div className="completion-stat">
              <span className="completion-stat-value">{accuracy}%</span>
              <span className="completion-stat-label">Accuracy</span>
            </div>
          </div>
          <div className="completion-breakdown">
            <span className="breakdown-item breakdown-again">
              🔴 {sessionStats.again} Again
            </span>
            <span className="breakdown-item breakdown-hard">
              🟠 {sessionStats.hard} Hard
            </span>
            <span className="breakdown-item breakdown-good">
              🟢 {sessionStats.good} Good
            </span>
            <span className="breakdown-item breakdown-easy">
              🔵 {sessionStats.easy} Easy
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="study-session">
        <div className="study-header">
          <h2>{deck.name}</h2>
          <button onClick={onComplete} className="exit-btn">
            Exit
          </button>
        </div>
        <div className="completion-summary">
          <h3>✅ All caught up!</h3>
          <p>No cards due for review. Come back later!</p>
          <div className="completion-stats">
            <div className="completion-stat">
              <span className="completion-stat-value">{dueCount}</span>
              <span className="completion-stat-label">Due Now</span>
            </div>
            <div className="completion-stat">
              <span className="completion-stat-value">{newCount}</span>
              <span className="completion-stat-label">New Cards</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Active Study ──────────────────────────────────────────────────

  const remaining = cards.length - currentIndex;
  const studiedSoFar = sessionStats.studied;

  return (
    <div className="study-session">
      <div className="study-header">
        <h2>{deck.name}</h2>
        <div className="study-progress-info">
          <span className="progress-text">
            {remaining} remaining
            {dueCount > 0 && <span> · {dueCount} due</span>}
            {newCount > 0 && currentCard?.state === 'learning' && <span> · {newCount} new</span>}
          </span>
          {currentCard?.state === 'learning' && (
            <span className="state-badge learning-badge">🔵 Learning</span>
          )}
          {currentCard?.state === 'relearning' && (
            <span className="state-badge relearning-badge">🔄 Relearning</span>
          )}
          {currentCard?.state === 'review' && (
            <span className="state-badge review-badge">✅ Review</span>
          )}
        </div>
        <button onClick={onComplete} className="exit-btn">
          Exit Study
        </button>
      </div>

      {/* ── Feedback banner ──────────────────────────────── */}
      {lastRating && (
        <div className={`rating-feedback ${lastRating.rating}`}>
          <span className="rating-feedback-text">
            {lastRating.rating === 'again' && '🔴 Again'}
            {lastRating.rating === 'hard' && '🟠 Hard'}
            {lastRating.rating === 'good' && '🟢 Good'}
            {lastRating.rating === 'easy' && '🔵 Easy'}
            {' · '}
            {lastRating.state === 'review' && (lastRating.rating === 'good' || lastRating.rating === 'easy')
              ? 'Graduated! → Review' :
             lastRating.state === 'review' && lastRating.rating === 'hard'
              ? formatNextReviewLabel(lastRating.nextReview) :
             lastRating.rating === 'again' && lastRating.state === 'relearning'
              ? 'Lapsed → Relearning' :
             lastRating.rating === 'again'
              ? 'repeats this step' :
             lastRating.rating === 'hard'
              ? '1.5× current step delay' :
             formatNextReviewLabel(lastRating.nextReview)}
          </span>
          <span className="rating-feedback-ease">
            Ease: {lastRating.easeFactor?.toFixed(2)}
            {lastRating.lapseCount > 0 && (
              <span className="lapse-count"> · {lastRating.lapseCount} lapses</span>
            )}
          </span>
        </div>
      )}

      <div
        className="study-card"
        onClick={() => showAnswer || setShowAnswer(true)}
      >
        <div className="card-content">
          <h3>{currentCard.original}</h3>
          <p className="pinyin">{currentCard.pinyin}</p>

          {!showAnswer && (
            <div className="click-hint">
              <button className="show-answer-btn">Click to show answer</button>
            </div>
          )}

          {showAnswer && (
            <div className="answer-section">
              <div className="answer-content">
                <p>
                  <strong>Translation:</strong> {currentCard.translation}
                </p>
                <br />
                <p>
                  <strong>Context:</strong> {currentCard.context}
                </p>
                <br />
                <p>
                  <strong>Grammar:</strong> {currentCard.grammar}
                </p>
                <br />
                <p>
                  <strong>Example:</strong> {currentCard.example}
                </p>
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
                    speak(
                      currentCard.translation,
                      currentCard.targetLang === 'fr' ? 'fr-FR' : 'en-US'
                    );
                  }}
                >
                  🔊 Listen Translation
                </button>
              </div>
            </div>
          )}

          {/* ── Rating section — always visible ────────────────── */}
          <div className="rating-section" onClick={(e) => e.stopPropagation()}>
            <h4>How well did you know this?</h4>
            <div className="rating-buttons">
              <button
                className="rate-btn again"
                onClick={() => handleRating('again')}
                title="1 or A - Again"
              >
                🔴 Again
              </button>
              <button
                className="rate-btn hard"
                onClick={() => handleRating('hard')}
                title="2 or H - Hard"
              >
                🟠 Hard
              </button>
              <button
                className="rate-btn good"
                onClick={() => handleRating('good')}
                title="3 or G - Good"
              >
                🟢 Good
              </button>
              <button
                className="rate-btn easy"
                onClick={() => handleRating('easy')}
                title="4 or E - Easy"
              >
                🔵 Easy
              </button>
            </div>
            <div className="keyboard-hint">
              <small>
                Keyboard: 1=Again, 2=Hard, 3=Good, 4=Easy, Space=Show Answer
              </small>
            </div>

            <details className="sm2-explainer">
              <summary>ℹ️ How ratings work (Anki)</summary>
              <table className="sm2-table">
                <thead>
                  <tr>
                    <th>Rating</th>
                    <th>Learning (new card)</th>
                    <th>Review (graduated)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>🔴 Again</td>
                    <td>Restart at step 1. Ease −0.20</td>
                    <td>Lapses → relearning. Interval × 0.5. Ease −0.20</td>
                  </tr>
                  <tr>
                    <td>🟠 Hard</td>
                    <td>1.5× current step delay. Ease −0.15</td>
                    <td>Interval × 1.2. Ease −0.15</td>
                  </tr>
                  <tr>
                    <td>🟢 Good</td>
                    <td>Advance to next step. Last step → graduates (1d). Ease +0.15</td>
                    <td>Interval × ease. Ease +0.15</td>
                  </tr>
                  <tr>
                    <td>🔵 Easy</td>
                    <td>Skip all steps → graduates (4d). Ease +0.30</td>
                    <td>Interval × ease × 1.3. Ease +0.30</td>
                  </tr>
                </tbody>
              </table>
              <p className="sm2-footnote">
                🔄 Relearning cards (lapsed) follow the same steps as Learning but with their own step timings.
              </p>
            </details>
          </div>
        </div>
      </div>

      <ProgressBar current={studiedSoFar} total={cards.length} />
    </div>
  );
};

export default StudySession;
