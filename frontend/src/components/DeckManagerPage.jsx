import React, { useState, useEffect } from 'react';
import {
  getProfiles,
  getDecks,
  getCards,
  deleteProfile,
  deleteDeck,
  deleteCard,
  renameProfile,
  renameDeck,
  validateProfileName,
  validateDeckName,
} from '../utils/storage';
import RenameModal from './RenameModal';
import CardFormModal from './CardFormModal';

const PREFIX_PROFILE = 'p:';
const PREFIX_DECK = 'd:';
const PREFIX_CARD = 'c:';

function DeckManagerPage() {
  // ── Data ──────────────────────────────────────────────────────────────

  const [profiles, setProfiles] = useState([]);
  const [decks, setDecks] = useState([]);
  const [cards, setCards] = useState([]);

  const loadData = () => {
    setProfiles(getProfiles());
    setDecks(getDecks());
    setCards(getCards());
  };

  useEffect(() => { loadData(); }, []);

  // ── Expand / collapse ─────────────────────────────────────────────────

  const [expandedProfiles, setExpandedProfiles] = useState(new Set());
  const [expandedDecks, setExpandedDecks] = useState(new Set());

  const toggleProfile = (id) => {
    setExpandedProfiles((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleDeck = (id) => {
    setExpandedDecks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Multi-select ──────────────────────────────────────────────────────

  const [selected, setSelected] = useState(new Set());

  const toggleSelect = (prefixedId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(prefixedId) ? next.delete(prefixedId) : next.add(prefixedId);
      return next;
    });
  };

  // ── Rename ────────────────────────────────────────────────────────────

  const [rename, setRename] = useState({
    show: false,
    type: '',       // 'profile' | 'deck'
    id: '',
    name: '',
    profileId: '',  // only for decks
  });

  const closeRename = () => setRename((r) => ({ ...r, show: false }));

  // ── Card form ─────────────────────────────────────────────────────────

  const [cardForm, setCardForm] = useState({
    show: false,
    card: null,    // null = create mode
    deckId: null,  // pre-selected deck for create
  });

  const closeCardForm = () => setCardForm((c) => ({ ...c, show: false }));

  // ── Delete ────────────────────────────────────────────────────────────

  const handleDelete = (type, id) => {
    const label = { profile: 'profile', deck: 'deck', card: 'card' }[type];
    if (!window.confirm(`Delete this ${label} and all its contents?`)) return;

    if (type === 'profile') deleteProfile(id);
    else if (type === 'deck') deleteDeck(id);
    else if (type === 'card') deleteCard(id);

    loadData();
  };

  const handleBatchDelete = () => {
    if (selected.size === 0) return;
    const msg = `Delete ${selected.size} selected item(s)? This cannot be undone.`;
    if (!window.confirm(msg)) return;

    selected.forEach((prefixed) => {
      if (prefixed.startsWith(PREFIX_PROFILE)) deleteProfile(prefixed.slice(2));
      else if (prefixed.startsWith(PREFIX_DECK)) deleteDeck(prefixed.slice(2));
      else if (prefixed.startsWith(PREFIX_CARD)) deleteCard(prefixed.slice(2));
    });

    setSelected(new Set());
    loadData();
  };

  // ── Derived data ─────────────────────────────────────────────────────

  const visiblePrefixed = [];

  for (const p of profiles) {
    visiblePrefixed.push(`${PREFIX_PROFILE}${p.id}`);
    if (expandedProfiles.has(p.id)) {
      const profileDecks = decks.filter((d) => d.profileId === p.id);
      for (const d of profileDecks) {
        visiblePrefixed.push(`${PREFIX_DECK}${d.id}`);
        if (expandedDecks.has(d.id)) {
          const deckCards = cards.filter((c) => c.deckId === d.id);
          deckCards.forEach((c) => visiblePrefixed.push(`${PREFIX_CARD}${c.id}`));
        }
      }
    }
  }

  const selectAllVisible = () => {
    if (visiblePrefixed.every((id) => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visiblePrefixed));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  const renderRow = (type, id, depth, content) => {
    const prefixed = `${type === 'profile' ? PREFIX_PROFILE : type === 'deck' ? PREFIX_DECK : PREFIX_CARD}${id}`;
    const isChecked = selected.has(prefixed);

    return (
      <tr key={prefixed} className={`depth-${depth}`}>
        <td className="checkbox-col">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => toggleSelect(prefixed)}
          />
        </td>
        <td className="entity-col">
          <div className="entity-row">
            {content}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="manager-page">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="manager-header">
        <h2>🗂️ Deck Manager</h2>
        <p className="manager-subtitle">
          Browse, rename, edit, and delete all your profiles, decks, and cards.
        </p>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────── */}
      <div className="manager-toolbar">
        <label className="manager-select-all">
          <input
            type="checkbox"
            checked={visiblePrefixed.length > 0 && visiblePrefixed.every((id) => selected.has(id))}
            onChange={selectAllVisible}
          />
          <span>Select all visible</span>
        </label>

        <div className="manager-toolbar-right">
          {selected.size > 0 && (
            <span className="manager-selected-count">{selected.size} selected</span>
          )}
          <button
            className={`manager-batch-delete ${selected.size === 0 ? 'hidden' : ''}`}
            onClick={handleBatchDelete}
            disabled={selected.size === 0}
          >
            🗑️ Delete ({selected.size})
          </button>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div className="manager-table-container">
        {profiles.length === 0 ? (
          <div className="manager-empty">
            <p>No profiles yet. Create one from the Review page to get started.</p>
          </div>
        ) : (
          <table className="manager-table">
            <thead>
              <tr>
                <th className="checkbox-col"></th>
                <th className="entity-col">Name / Content</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const profileDecks = decks.filter((d) => d.profileId === p.id);
                const profileCards = profileDecks.reduce(
                  (sum, d) => sum + cards.filter((c) => c.deckId === d.id).length,
                  0
                );
                const isExpanded = expandedProfiles.has(p.id);

                return (
                  <React.Fragment key={p.id}>
                    {/* Profile row */}
                    {renderRow('profile', p.id, 0, (
                      <>
                        <button
                          className="toggle-icon"
                          onClick={() => toggleProfile(p.id)}
                          title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                        <span className="entity-name">{p.name}</span>
                        <span className="entity-meta">
                          {profileDecks.length} deck{profileDecks.length !== 1 ? 's' : ''} · {profileCards} card{profileCards !== 1 ? 's' : ''}
                        </span>
                        <span className="entity-date">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                        <span className="actions-col">
                          <button
                            className="action-icon-btn"
                            title="Rename"
                            onClick={() =>
                              setRename({
                                show: true,
                                type: 'profile',
                                id: p.id,
                                name: p.name,
                                profileId: '',
                              })
                            }
                          >
                            ✏️
                          </button>
                          <button
                            className="action-icon-btn danger"
                            title="Delete"
                            onClick={() => handleDelete('profile', p.id)}
                          >
                            🗑️
                          </button>
                        </span>
                      </>
                    ))}

                    {/* Decks under this profile */}
                    {isExpanded &&
                      profileDecks.map((d) => {
                        const deckCards = cards.filter((c) => c.deckId === d.id);
                        const deckExpanded = expandedDecks.has(d.id);

                        return (
                          <React.Fragment key={d.id}>
                            {renderRow('deck', d.id, 1, (
                              <>
                                <button
                                  className="toggle-icon"
                                  onClick={() => toggleDeck(d.id)}
                                  title={deckExpanded ? 'Collapse' : 'Expand'}
                                >
                                  {deckExpanded ? '▼' : '▶'}
                                </button>
                                <span className="entity-name">{d.name}</span>
                                <span className="entity-meta">
                                  {deckCards.length} card{deckCards.length !== 1 ? 's' : ''}
                                </span>
                                <span className="entity-date">
                                  {new Date(d.createdAt).toLocaleDateString()}
                                </span>
                                <span className="actions-col">
                                  <button
                                    className="action-icon-btn"
                                    title="Rename"
                                    onClick={() =>
                                      setRename({
                                        show: true,
                                        type: 'deck',
                                        id: d.id,
                                        name: d.name,
                                        profileId: d.profileId,
                                      })
                                    }
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    className="action-icon-btn"
                                    title="Add card"
                                    onClick={() =>
                                      setCardForm({ show: true, card: null, deckId: d.id })
                                    }
                                  >
                                    ➕
                                  </button>
                                  <button
                                    className="action-icon-btn danger"
                                    title="Delete"
                                    onClick={() => handleDelete('deck', d.id)}
                                  >
                                    🗑️
                                  </button>
                                </span>
                              </>
                            ))}

                            {/* Cards under this deck */}
                            {deckExpanded &&
                              deckCards.map((c) =>
                                renderRow('card', c.id, 2, (
                                  <>
                                    <span className="entity-card-text">
                                      <span className="card-original">{c.original}</span>
                                      <span className="card-pinyin">{c.pinyin}</span>
                                      <span className="card-translation">{c.translation}</span>
                                    </span>
                                    <span className={`difficulty-badge difficulty-${c.difficulty || 'new'}`}>
                                      {c.difficulty || 'new'}
                                    </span>
                                    <span className="actions-col">
                                      <button
                                        className="action-icon-btn"
                                        title="Edit"
                                        onClick={() =>
                                          setCardForm({ show: true, card: c, deckId: c.deckId })
                                        }
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        className="action-icon-btn danger"
                                        title="Delete"
                                        onClick={() => handleDelete('card', c.id)}
                                      >
                                        🗑️
                                      </button>
                                    </span>
                                  </>
                                ))
                              )}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Rename Modal ─────────────────────────────────────────────── */}
      {rename.show && (
        <RenameModal
          isOpen={rename.show}
          onClose={() => { closeRename(); loadData(); }}
          currentName={rename.name}
          title={rename.type === 'profile' ? 'Rename Profile' : 'Rename Deck'}
          itemType={rename.type === 'profile' ? 'Profile' : 'Deck'}
          onRename={async (newName) => {
            if (rename.type === 'profile') {
              return renameProfile(rename.id, newName);
            } else {
              return renameDeck(rename.id, newName);
            }
          }}
          validateName={(name) => {
            if (rename.type === 'profile') {
              return validateProfileName(name, rename.id);
            } else {
              return validateDeckName(name, rename.profileId || undefined, rename.id);
            }
          }}
        />
      )}

      {/* ── Card Form Modal ──────────────────────────────────────────── */}
      <CardFormModal
        isOpen={cardForm.show}
        onClose={closeCardForm}
        card={cardForm.card}
        deckId={cardForm.deckId}
        onSaved={loadData}
      />
    </div>
  );
}

export default DeckManagerPage;
