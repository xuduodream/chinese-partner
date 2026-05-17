import React, { useState } from 'react';

const Flashcard = ({ card, onSave }) => {
  const [showBack, setShowBack] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const handleSave = () => {
    onSave(card);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flashcard" onClick={() => setShowBack(!showBack)}>
      <div className="front">
        <h3>{card.original}</h3>
        <p className="pinyin">{card.pinyin}</p>
        {!showBack && <button>Click to see explanation →</button>}
      </div>

      {showBack && (
        <div className="back">
          <p><strong>Translation:</strong> {card.translation}</p>
          <p><strong>Context:</strong> {card.context}</p>
          <p><strong>Grammar:</strong> {card.grammar}</p>
          <p><strong>Example:</strong> {card.example}</p>

          <div className="audio-buttons">
            <button onClick={(e) => { e.stopPropagation(); speak(card.original, 'zh-CN'); }}>
              🔊 Listen Chinese
            </button>
            <button onClick={(e) => { e.stopPropagation(); speak(card.translation, card.targetLang === 'fr' ? 'fr-FR' : 'en-US'); }}>
              🔊 Listen Translation
            </button>
          </div>

          <button
            className="save-btn"
            onClick={(e) => { e.stopPropagation(); handleSave(); }}
            disabled={saved}
          >
            {saved ? '✓ Saved!' : 'Save to Flashcards'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Flashcard;