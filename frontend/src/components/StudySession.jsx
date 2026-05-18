import React, { useState, useEffect } from 'react';
import { getCards, updateCardDifficulty } from '../utils/storage';

const StudySession = ({ deck, onComplete }) => {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
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

  const handleRating = (difficulty) => {
    // Update card difficulty in storage
    updateCardDifficulty(currentCard.id, difficulty);

    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      studied: prev.studied + 1,
      correct: prev.correct + (difficulty !== 'hard' ? 1 : 0)
    }));

    // Move to next card or complete session
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      onComplete();
    }
  };

  if (!currentCard) {
    return <div>Loading...</div>;
  }

  return (
    <div className="study-session">
      <div className="study-header">
        <h2>Studying: {deck.name}</h2>
        <div className="progress">
          {currentIndex + 1} / {cards.length}
        </div>
        <button onClick={onComplete} className="exit-btn">
          Exit Study
        </button>
      </div>

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
                  >
                    Hard
                  </button>
                  <button
                    className="rate-btn good"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRating('good');
                    }}
                  >
                    Good
                  </button>
                  <button
                    className="rate-btn easy"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRating('easy');
                    }}
                  >
                    Easy
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="session-stats">
        Studied: {sessionStats.studied} |
        Accuracy: {sessionStats.studied > 0 ?
          Math.round((sessionStats.correct / sessionStats.studied) * 100) : 0}%
      </div>
    </div>
  );
};

export default StudySession;