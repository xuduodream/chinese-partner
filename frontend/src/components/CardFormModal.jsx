import React, { useState, useEffect } from 'react';
import { getProfiles, getDecks, saveCard, updateCard } from '../utils/storage';

function CardFormModal({ isOpen, onClose, card, profileId, deckId, onSaved }) {
  const isEditing = !!card;

  // ── Form state ────────────────────────────────────────────────────────

  const [original, setOriginal] = useState('');
  const [pinyin, setPinyin] = useState('');
  const [targetLang, setTargetLang] = useState('en');
  const [translation, setTranslation] = useState('');
  const [context, setContext] = useState('');
  const [grammar, setGrammar] = useState('');
  const [example, setExample] = useState('');
  const [difficulty, setDifficulty] = useState('new');

  // Create-mode selectors
  const [selProfileId, setSelProfileId] = useState(profileId || '');
  const [selDeckId, setSelDeckId] = useState(deckId || '');
  const [availableDecks, setAvailableDecks] = useState([]);

  // Validation
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Reset form when modal opens ─────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    if (card) {
      setOriginal(card.original || '');
      setPinyin(card.pinyin || '');
      setTargetLang(card.targetLang || 'en');
      setTranslation(card.translation || '');
      setContext(card.context || '');
      setGrammar(card.grammar || '');
      setExample(card.example || '');
      setDifficulty(card.difficulty || 'new');
      setSelProfileId('');
      setSelDeckId(deckId || '');
    } else {
      setOriginal('');
      setPinyin('');
      setTargetLang('en');
      setTranslation('');
      setContext('');
      setGrammar('');
      setExample('');
      setDifficulty('new');
      setSelProfileId(profileId || '');
      setSelDeckId(deckId || '');
    }
    setError('');
    setSaving(false);
  }, [isOpen, card, profileId, deckId]);

  // ── Load decks when profile changes ─────────────────────────────────

  useEffect(() => {
    if (selProfileId) {
      setAvailableDecks(getDecks(selProfileId));
      // Reset deck selection if current deck not in this profile
      const deckStillValid = getDecks(selProfileId).some(d => d.id === selDeckId);
      if (!deckStillValid && !deckId) setSelDeckId('');
    } else {
      setAvailableDecks([]);
    }
  }, [selProfileId]);

  // ── Submit ────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isEditing && !selDeckId) {
      setError('Please select a profile and deck.');
      return;
    }
    if (!original.trim()) {
      setError('Original text (Chinese) is required.');
      return;
    }
    if (!translation.trim()) {
      setError('Translation is required.');
      return;
    }

    setSaving(true);
    try {
      const fields = {
        original: original.trim(),
        pinyin: pinyin.trim(),
        targetLang,
        translation: translation.trim(),
        context: context.trim(),
        grammar: grammar.trim(),
        example: example.trim(),
        difficulty,
      };

      if (isEditing) {
        updateCard(card.id, fields);
      } else {
        saveCard(fields, selDeckId);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save card.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // ── Profiles for create-mode selector ────────────────────────────────

  const allProfiles = getProfiles();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card-form-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEditing ? '✏️ Edit Card' : '➕ New Card'}</h3>

        <form onSubmit={handleSubmit}>
          {/* Create-mode: profile + deck selectors */}
          {!isEditing && (
            <>
              <div className="form-group">
                <label>Profile</label>
                <select
                  value={selProfileId}
                  onChange={(e) => setSelProfileId(e.target.value)}
                  disabled={saving}
                >
                  <option value="">-- Select profile --</option>
                  {allProfiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {selProfileId && (
                <div className="form-group">
                  <label>Deck</label>
                  <select
                    value={selDeckId}
                    onChange={(e) => setSelDeckId(e.target.value)}
                    disabled={saving}
                  >
                    <option value="">-- Select deck --</option>
                    {availableDecks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({getDecks().find(p => p.id === d.id)?.cardCount || 0} cards)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* Card fields */}
          <div className="form-group">
            <label>Original (Chinese) *</label>
            <input
              type="text"
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              placeholder="你好世界"
              disabled={saving}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Pinyin</label>
            <input
              type="text"
              value={pinyin}
              onChange={(e) => setPinyin(e.target.value)}
              placeholder="nǐ hǎo shì jiè"
              disabled={saving}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Language</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                disabled={saving}
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>

            <div className="form-group">
              <label>Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                disabled={saving}
              >
                <option value="new">New</option>
                <option value="hard">Hard</option>
                <option value="good">Good</option>
                <option value="easy">Easy</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Translation *</label>
            <input
              type="text"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="Hello world"
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label>Context</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Usage context..."
              rows={2}
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label>Grammar</label>
            <textarea
              value={grammar}
              onChange={(e) => setGrammar(e.target.value)}
              placeholder="Grammar notes..."
              rows={2}
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label>Example</label>
            <textarea
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="Another example sentence..."
              rows={2}
              disabled={saving}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-btn"
              disabled={saving}
            >
              {saving ? '💾 Saving...' : '💾 Save Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CardFormModal;
