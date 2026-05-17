import React, { useState, useEffect } from 'react';
import { getProfiles, createProfile, getProfileById, deleteProfile, getDecks, renameProfile, validateProfileName } from '../utils/storage';
import RenameModal from './RenameModal';

const ProfileManager = ({
  currentProfile,
  onProfileChange,
  onCreateProfile
}) => {
  const [profiles, setProfiles] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDescription, setNewProfileDescription] = useState('');
  const [newProfileLang, setNewProfileLang] = useState('en');
  const [showRenameModal, setShowRenameModal] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    const profileList = getProfiles();
    setProfiles(profileList);

    // Auto-select first profile if none selected
    if (!currentProfile && profileList.length > 0) {
      onProfileChange(profileList[0]);
    }
  };

  const handleDeleteProfile = () => {
    if (!currentProfile) return;

    const profileDecks = getDecks(currentProfile.id);
    if (profileDecks.length > 0) {
      alert('Cannot delete profile that contains decks. Please delete all decks first.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete the profile "${currentProfile.name}"? This action cannot be undone.`)) {
      deleteProfile(currentProfile.id);
      loadProfiles();

      // Select another profile if available
      const remainingProfiles = getProfiles();
      if (remainingProfiles.length > 0) {
        onProfileChange(remainingProfiles[0]);
      } else {
        onProfileChange(null);
      }
    }
  };

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return;

    const profile = createProfile(
      newProfileName.trim(),
      newProfileDescription.trim(),
      newProfileLang
    );

    setNewProfileName('');
    setNewProfileDescription('');
    setNewProfileLang('en');
    setShowCreateModal(false);

    loadProfiles();
    onProfileChange(profile);

    if (onCreateProfile) {
      onCreateProfile(profile);
    }
  };

  const handleProfileSelect = (profileId) => {
    const profile = getProfileById(profileId);
    if (profile) {
      onProfileChange(profile);
    }
  };

  return (
    <div className="profile-manager">
      <div className="profile-selector">
        <label htmlFor="profile-select">Study Profile:</label>
        <select
          id="profile-select"
          value={currentProfile?.id || ''}
          onChange={(e) => handleProfileSelect(e.target.value)}
        >
          <option value="">Select a profile...</option>
          {profiles.map(profile => {
            const profileDecks = getDecks(profile.id);
            return (
              <option key={profile.id} value={profile.id}>
                {profile.name} ({profileDecks.length} decks)
              </option>
            );
          })}
        </select>

        <button
          className="create-profile-btn"
          onClick={() => setShowCreateModal(true)}
        >
          + New Profile
        </button>

        {/* Rename Profile Button */}
        {currentProfile && (
          <button
            className="rename-profile-btn"
            onClick={() => setShowRenameModal(true)}
            title="Rename profile"
          >
            ✏️ Rename
          </button>
        )}

        {/* Delete Profile Button */}
        {currentProfile && (
          <button
            className="delete-profile-btn"
            onClick={handleDeleteProfile}
            disabled={getDecks(currentProfile.id).length > 0}
            title={getDecks(currentProfile.id).length > 0 ? "Cannot delete profile with decks" : "Delete profile"}
          >
            🗑️ Delete Profile
          </button>
        )}
      </div>

      {/* Create Profile Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Profile</h3>

            <div className="form-group">
              <label htmlFor="profile-name">Profile Name *</label>
              <input
                id="profile-name"
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="e.g., HSK Level 1, Business Chinese"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="profile-description">Description</label>
              <textarea
                id="profile-description"
                value={newProfileDescription}
                onChange={(e) => setNewProfileDescription(e.target.value)}
                placeholder="Optional description for this study profile"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="profile-lang">Default Language</label>
              <select
                id="profile-lang"
                value={newProfileLang}
                onChange={(e) => setNewProfileLang(e.target.value)}
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                className="create-btn"
                onClick={handleCreateProfile}
                disabled={!newProfileName.trim()}
              >
                Create Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Profile Info */}
      {currentProfile && (
        <div className="current-profile-info">
          <h4>{currentProfile.name}</h4>
          {currentProfile.description && (
            <p className="profile-description">{currentProfile.description}</p>
          )}
          <small className="profile-meta">
            Created: {new Date(currentProfile.createdAt).toLocaleDateString()}
            {currentProfile.decks && (
              <> • Decks: {currentProfile.decks.length}</>
            )}
          </small>
        </div>
      )}

      {/* Rename Profile Modal */}
      {currentProfile && (
        <RenameModal
          isOpen={showRenameModal}
          onClose={() => setShowRenameModal(false)}
          onRename={(newName) => renameProfile(currentProfile.id, newName)}
          currentName={currentProfile.name}
          validateName={(name) => validateProfileName(name, currentProfile.id)}
          title="Rename Profile"
          itemType="Profile"
        />
      )}
    </div>
  );
};

export default ProfileManager;