import React, { useState, useEffect, useRef } from 'react';
import {
  getProfiles,
  getDecks,
  getCards,
} from '../utils/storage';
import {
  exportProfile,
  exportAll,
  importBackup,
  readUploadedFile,
  downloadFile,
  getBackupPreview,
} from '../utils/backup';

function BackupRestorePage() {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [deckBreakdown, setDeckBreakdown] = useState([]);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }
  const [importing, setImporting] = useState(false);

  // Import preview state
  const [preview, setPreview] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef(null);

  // ── Load profiles on mount and refresh when shown ─────────────────────

  const refresh = () => {
    const allProfiles = getProfiles();
    setProfiles(allProfiles);
    if (allProfiles.length > 0 && !selectedProfileId) {
      setSelectedProfileId(allProfiles[0].id);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // ── Update deck breakdown when selected profile changes ───────────────

  useEffect(() => {
    if (!selectedProfileId) {
      setDeckBreakdown([]);
      return;
    }
    const decks = getDecks(selectedProfileId);
    const breakdown = decks.map((deck) => ({
      id: deck.id,
      name: deck.name,
      cardCount: getCards(deck.id).length,
    }));
    setDeckBreakdown(breakdown);
  }, [selectedProfileId]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleExportProfile = () => {
    if (!selectedProfileId) {
      setMessage({ type: 'error', text: 'Please select a profile first.' });
      return;
    }
    try {
      const data = exportProfile(selectedProfileId);
      const profile = getProfiles().find((p) => p.id === selectedProfileId);
      const safeName = (profile?.name || 'profile').replace(/[^a-zA-Z0-9_-]/g, '_');
      const date = new Date().toISOString().split('T')[0];
      downloadFile(data, `MemBoost_Backup_${safeName}_${date}.json`);
      setMessage({ type: 'success', text: '✅ Profile backup created!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleExportAll = () => {
    try {
      const data = exportAll();
      const date = new Date().toISOString().split('T')[0];
      downloadFile(data, `MemBoost_FullBackup_${date}.json`);
      setMessage({ type: 'success', text: '✅ Full backup created!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    // Reset input so same file can be picked again
    e.target.value = '';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file) => {
    try {
      const data = await readUploadedFile(file);
      const previewInfo = getBackupPreview(data);
      if (previewInfo.error) {
        setMessage({ type: 'error', text: previewInfo.error });
        return;
      }
      setPreviewData(data);
      setPreview(previewInfo);
      setShowPreview(true);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleRestore = () => {
    if (!previewData) return;
    setImporting(true);
    try {
      const result = importBackup(previewData);
      setShowPreview(false);
      setPreview(null);
      setPreviewData(null);
      const names = result.names.join(', ');
      setMessage({
        type: 'success',
        text: `✅ Restored: ${result.profilesImported} profile(s), ${result.decksImported} deck(s), ${result.cardsImported} card(s) as "${names}"`,
      });
      refresh();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setImporting(false);
    }
  };

  const dismissMessage = () => setMessage(null);

  // ── Drag state ────────────────────────────────────────────────────────

  const [dragOver, setDragOver] = useState(false);

  // ── Total card count across all profiles ──────────────────────────────

  const totalDecks = selectedProfileId ? getDecks(selectedProfileId).length : 0;
  const totalCards = deckBreakdown.reduce((sum, d) => sum + d.cardCount, 0);

  return (
    <div className="backup-page">
      <div className="backup-header">
        <h2>💾 Backup &amp; Restore</h2>
        <p className="backup-subtitle">
          Safeguard your flashcards or move them between devices.
        </p>
      </div>

      {/* Transient message */}
      {message && (
        <div className={`backup-message ${message.type}`} onClick={dismissMessage}>
          <span>{message.text}</span>
          <button className="backup-message-dismiss" onClick={dismissMessage}>
            ×
          </button>
        </div>
      )}

      <div className="backup-grid">
        {/* ── Export Card ───────────────────────────────────── */}
        <div className="backup-card">
          <div className="backup-card-header">
            <span className="backup-card-icon">📥</span>
            <h3>Export</h3>
          </div>
          <div className="backup-card-body">
            <label className="backup-label">Select profile to export:</label>
            <select
              className="backup-select"
              value={selectedProfileId || ''}
              onChange={(e) => setSelectedProfileId(e.target.value)}
            >
              <option value="" disabled>
                -- Select profile --
              </option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {selectedProfileId && (
              <div className="backup-deck-list">
                <div className="backup-deck-list-header">
                  <span>Decks in this profile:</span>
                  <span className="backup-summary-totals">
                    {totalDecks} deck{totalDecks !== 1 ? 's' : ''} · {totalCards}{' '}
                    card{totalCards !== 1 ? 's' : ''}
                  </span>
                </div>
                {deckBreakdown.length === 0 ? (
                  <p className="backup-empty-text">No decks yet.</p>
                ) : (
                  <ul>
                    {deckBreakdown.map((d) => (
                      <li key={d.id}>
                        <span className="backup-deck-name">{d.name}</span>
                        <span className="backup-deck-count">
                          {d.cardCount} card{d.cardCount !== 1 ? 's' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <button
              className="backup-btn backup-btn-primary"
              onClick={handleExportProfile}
              disabled={!selectedProfileId}
            >
              📥 Export Profile
            </button>

            <div className="backup-divider">
              <span>or</span>
            </div>

            <button
              className="backup-btn backup-btn-secondary"
              onClick={handleExportAll}
            >
              📦 Backup All
            </button>
            <p className="backup-hint">
              Exports every profile, deck, and card into one file.
            </p>
          </div>
        </div>

        {/* ── Import Card ───────────────────────────────────── */}
        <div className="backup-card">
          <div className="backup-card-header">
            <span className="backup-card-icon">📤</span>
            <h3>Import</h3>
          </div>
          <div className="backup-card-body">
            <div
              className={`backup-file-upload ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div className="backup-upload-icon">📂</div>
              <p className="backup-upload-text">
                Click or drag a <strong>.json</strong> backup file here
              </p>
            </div>
            <p className="backup-hint">
              Supports single-profile and full backups exported from MemBoost.
            </p>
          </div>
        </div>
      </div>

      {/* ── Import Preview Modal ───────────────────────────── */}
      {showPreview && preview && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="modal-content backup-preview-modal" onClick={(e) => e.stopPropagation()}>
            <h3>🔍 Preview Backup</h3>

            {preview.type === 'profile' ? (
              <div className="preview-summary">
                <div className="preview-row">
                  <span className="preview-label">Profile:</span>
                  <span className="preview-value">{preview.profileName}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">Decks:</span>
                  <span className="preview-value">{preview.deckCount}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">Total cards:</span>
                  <span className="preview-value">{preview.cardCount}</span>
                </div>
                <div className="preview-decks">
                  <strong>Decks:</strong>
                  <ul>
                    {preview.decks.map((d, i) => (
                      <li key={i}>
                        {d.name} — {d.cardCount} card{d.cardCount !== 1 ? 's' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="preview-summary">
                <div className="preview-row">
                  <span className="preview-label">Type:</span>
                  <span className="preview-value">Full Backup</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">Profiles:</span>
                  <span className="preview-value">{preview.profileCount}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">Decks:</span>
                  <span className="preview-value">{preview.deckCount}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">Total cards:</span>
                  <span className="preview-value">{preview.cardCount}</span>
                </div>
                <div className="preview-decks">
                  <strong>Profiles:</strong>
                  <ul>
                    {preview.profileNames.map((name, i) => (
                      <li key={i}>{name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="backup-warning">
              ⚠️ If a profile with the same name already exists, it will be
              overwritten (decks and cards replaced).
            </div>

            <div className="backup-preview-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowPreview(false);
                  setPreview(null);
                  setPreviewData(null);
                }}
              >
                Cancel
              </button>
              <button
                className="backup-btn backup-btn-success"
                onClick={handleRestore}
                disabled={importing}
              >
                {importing ? '⏳ Restoring...' : '📤 Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BackupRestorePage;
