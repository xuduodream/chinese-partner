import { getProfiles, getProfileById, getDecks, getCards, createProfile, createDeck, saveCard, deleteProfile } from './storage';

// ── Download a blob as a file ──────────────────────────────────────────

export const downloadFile = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ── Read uploaded file as text ────────────────────────────────────────

export const readUploadedFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch {
        reject(new Error('Invalid JSON file. Please select a valid MemBoost backup file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
};

// ── Strip internal IDs from a card ───────────────────────────────────

const stripCardIds = (card) => ({
  original: card.original,
  pinyin: card.pinyin,
  targetLang: card.targetLang,
  translation: card.translation,
  context: card.context,
  grammar: card.grammar,
  example: card.example,
  difficulty: card.difficulty || 'new',
  reviewCount: card.reviewCount || 0,
  lastReviewed: card.lastReviewed || null,
});

// ── Export a single profile ──────────────────────────────────────────

export const exportProfile = (profileId) => {
  const profile = getProfileById(profileId);
  if (!profile) throw new Error('Profile not found');

  const decks = getDecks(profileId);

  const backup = {
    meta: {
      version: 1,
      type: 'profile',
      exportedAt: new Date().toISOString(),
      app: 'MemBoost',
    },
    profile: {
      name: profile.name,
      description: profile.description || '',
      defaultTargetLang: profile.defaultTargetLang || 'en',
    },
    decks: decks.map((deck) => ({
      name: deck.name,
      description: deck.description || '',
      cards: getCards(deck.id).map(stripCardIds),
    })),
  };

  return backup;
};

// ── Export all profiles ─────────────────────────────────────────────

export const exportAll = () => {
  const profiles = getProfiles();
  if (!profiles.length) throw new Error('No profiles to export.');

  const allDecks = getDecks();

  const backup = {
    meta: {
      version: 1,
      type: 'full',
      exportedAt: new Date().toISOString(),
      app: 'MemBoost',
    },
    profiles: profiles.map((p) => ({
      name: p.name,
      description: p.description || '',
      defaultTargetLang: p.defaultTargetLang || 'en',
    })),
    decks: allDecks.map((deck) => {
      const profile = profiles.find((p) => p.id === deck.profileId);
      return {
        profileName: profile ? profile.name : 'Unknown',
        name: deck.name,
        description: deck.description || '',
        cards: getCards(deck.id).map(stripCardIds),
      };
    }),
  };

  return backup;
};

// ── If a profile with this name exists, delete it first (overwrite) ──

const ensureProfileAvailable = (name) => {
  const existing = getProfiles().find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    deleteProfile(existing.id);
  }
  return name;
};

// ── Import a backup file ────────────────────────────────────────────

export const importBackup = (backupData) => {
  // Validate
  if (!backupData || !backupData.meta) {
    throw new Error('Invalid backup format: missing meta section.');
  }
  if (backupData.meta.version !== 1) {
    throw new Error(`Unsupported backup version: ${backupData.meta.version}`);
  }
  if (backupData.meta.type !== 'profile' && backupData.meta.type !== 'full') {
    throw new Error(`Unknown backup type: ${backupData.meta.type}`);
  }

  const result = {
    profilesImported: 0,
    decksImported: 0,
    cardsImported: 0,
    names: [],
  };

  if (backupData.meta.type === 'profile') {
    // Single profile import
    const profileName = ensureProfileAvailable(backupData.profile.name);
    const profile = createProfile(
      profileName,
      backupData.profile.description || '',
      backupData.profile.defaultTargetLang || 'en'
    );
    result.profilesImported = 1;
    result.names.push(profileName);

    for (const deckData of backupData.decks || []) {
      const deck = createDeck(profile.id, deckData.name, deckData.description || '');
      result.decksImported++;

      for (const cardData of deckData.cards || []) {
        saveCard(cardData, deck.id);
        result.cardsImported++;
      }
    }
  } else {
    // Full backup import
    // Build a map of profile names (from backup) → new profile IDs
    const profileNameMap = {};

    for (const profileData of backupData.profiles || []) {
      const name = ensureProfileAvailable(profileData.name);
      const profile = createProfile(
        name,
        profileData.description || '',
        profileData.defaultTargetLang || 'en'
      );
      profileNameMap[profileData.name] = profile.id;
      result.profilesImported++;
      result.names.push(name);
    }

    for (const deckData of backupData.decks || []) {
      const profileId = profileNameMap[deckData.profileName];
      if (!profileId) continue; // skip orphan decks

      const deck = createDeck(profileId, deckData.name, deckData.description || '');
      result.decksImported++;

      for (const cardData of deckData.cards || []) {
        saveCard(cardData, deck.id);
        result.cardsImported++;
      }
    }
  }

  return result;
};

// ── Get a human-readable preview of a backup file ───────────────────

export const getBackupPreview = (backupData) => {
  if (!backupData || !backupData.meta) {
    return { error: 'Invalid backup file.' };
  }

  if (backupData.meta.type === 'profile') {
    const deckCount = (backupData.decks || []).length;
    const cardCount = (backupData.decks || []).reduce(
      (sum, d) => sum + (d.cards || []).length,
      0
    );
    return {
      type: 'profile',
      profileName: backupData.profile?.name || 'Unknown',
      deckCount,
      cardCount,
      decks: (backupData.decks || []).map((d) => ({
        name: d.name,
        cardCount: (d.cards || []).length,
      })),
    };
  }

  // type === 'full'
  const profileCount = (backupData.profiles || []).length;
  const deckCount = (backupData.decks || []).length;
  const cardCount = (backupData.decks || []).reduce(
    (sum, d) => sum + (d.cards || []).length,
    0
  );
  const profileNames = (backupData.profiles || []).map((p) => p.name);
  return {
    type: 'full',
    profileCount,
    profileNames,
    deckCount,
    cardCount,
    decks: (backupData.decks || []).map((d) => ({
      name: d.name,
      cardCount: (d.cards || []).length,
      profileName: d.profileName,
    })),
  };
};
