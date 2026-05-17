import React, { useState, useEffect } from 'react';
import { getCards, deleteCard } from '../utils/storage';

const RevisionPage = () => {
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    setCards(getCards());
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

  const handleDelete = (id) => {
    deleteCard(id);
    setCards(getCards());
    setSelectedCard(null);
  };

  return (
    <div className="revision-page">
      <h2>📚 My Flashcards</h2>
      <div className="flashcard-list">
        {cards.length === 0 ? (
          <p>No flashcards yet. Import an image to create some!</p>
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
                    <p><strong>Context:</strong> {card.context}</p>
                    <p><strong>Grammar:</strong> {card.grammar}</p>
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

export default RevisionPage;