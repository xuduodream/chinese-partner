// Storage keys
const FLASHCARDS_KEY = 'chinese_flashcards';
const PROFILES_KEY = 'chinese_partner_profiles';
const DECKS_KEY = 'chinese_partner_decks';
const MIGRATION_FLAG_KEY = 'chinese_partner_migrated';

// Utility function to generate UUID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Migration utilities
export const checkAndMigrateData = () => {
  const migrated = localStorage.getItem(MIGRATION_FLAG_KEY);
  if (migrated) return false;

  const existingCards = getLegacyCards();
  if (existingCards.length > 0) {
    // Create default profile and deck
    const defaultProfile = createProfile('Personal', 'Default profile for your flashcards', 'en');
    const defaultDeck = createDeck(defaultProfile.id, 'General', 'General flashcards');

    // Migrate existing cards to the new structure
    const migratedCards = existingCards.map(card => ({
      ...card,
      deckId: defaultDeck.id
    }));

    localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(migratedCards));
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');

    console.log(`Migrated ${existingCards.length} cards to profile/deck system`);
    return true;
  }

  localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
  return false;
};

// Legacy card retrieval for migration
const getLegacyCards = () => {
  const data = localStorage.getItem('chinese_flashcards');
  return data ? JSON.parse(data) : [];
};

// Profile management
export const createProfile = (name, description = '', defaultTargetLang = 'en') => {
  const profiles = getProfiles();
  const newProfile = {
    id: generateId(),
    name,
    description,
    createdAt: new Date().toISOString(),
    defaultTargetLang,
    decks: []
  };
  profiles.push(newProfile);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  return newProfile;
};

export const getProfiles = () => {
  const data = localStorage.getItem(PROFILES_KEY);
  return data ? JSON.parse(data) : [];
};

export const updateProfile = (id, updates) => {
  const profiles = getProfiles().map(profile =>
    profile.id === id ? { ...profile, ...updates } : profile
  );
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
};

export const deleteProfile = (id) => {
  const profiles = getProfiles().filter(profile => profile.id !== id);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));

  // Also delete associated decks and cards
  const decks = getDecks().filter(deck => deck.profileId !== id);
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks));

  const cards = getCards().filter(card => {
    const cardDeck = getDecks().find(deck => deck.id === card.deckId);
    return cardDeck && cardDeck.profileId !== id;
  });
  localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(cards));
};

export const getProfileById = (id) => {
  const profiles = getProfiles();
  return profiles.find(profile => profile.id === id);
};

// Deck management
export const createDeck = (profileId, name, description = '') => {
  const decks = getDecks();
  const newDeck = {
    id: generateId(),
    profileId,
    name,
    description,
    createdAt: new Date().toISOString(),
    cardCount: 0,
    lastStudied: null
  };
  decks.push(newDeck);
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks));

  // Update profile's deck list
  const profiles = getProfiles();
  const profileIndex = profiles.findIndex(p => p.id === profileId);
  if (profileIndex !== -1) {
    profiles[profileIndex].decks.push(newDeck.id);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  }

  return newDeck;
};

export const getDecks = (profileId = null) => {
  const data = localStorage.getItem(DECKS_KEY);
  const decks = data ? JSON.parse(data) : [];
  return profileId ? decks.filter(deck => deck.profileId === profileId) : decks;
};

export const updateDeck = (id, updates) => {
  const decks = getDecks().map(deck =>
    deck.id === id ? { ...deck, ...updates } : deck
  );
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
};

export const deleteDeck = (id) => {
  const decks = getDecks().filter(deck => deck.id !== id);
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks));

  // Remove from profile's deck list
  const profiles = getProfiles();
  profiles.forEach(profile => {
    profile.decks = profile.decks.filter(deckId => deckId !== id);
  });
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));

  // Delete associated cards
  const cards = getCards().filter(card => card.deckId !== id);
  localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(cards));
};

export const getDeckById = (id) => {
  const decks = getDecks();
  return decks.find(deck => deck.id === id);
};

// Enhanced card management
export const saveCard = (card, deckId = null) => {
  const existing = getCards();
  const newCard = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    reviewCount: 0,
    lastReviewed: null,
    deckId: deckId || getDefaultDeckId(),
    ...card
  };
  existing.push(newCard);
  localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(existing));

  // Update deck card count
  if (deckId) {
    updateDeckCardCount(deckId);
  }

  return newCard;
};

export const getCards = (deckId = null) => {
  const data = localStorage.getItem(FLASHCARDS_KEY);
  const cards = data ? JSON.parse(data) : [];
  return deckId ? cards.filter(card => card.deckId === deckId) : cards;
};

export const deleteCard = (id) => {
  const cards = getCards();
  const cardToDelete = cards.find(card => card.id === id);
  const filteredCards = cards.filter(card => card.id !== id);
  localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(filteredCards));

  // Update deck card count
  if (cardToDelete && cardToDelete.deckId) {
    updateDeckCardCount(cardToDelete.deckId);
  }
};

export const updateCard = (id, updates) => {
  const cards = getCards().map(card =>
    card.id === id ? { ...card, ...updates } : card
  );
  localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(cards));
};

// Helper functions
const getDefaultDeckId = () => {
  const profiles = getProfiles();
  if (profiles.length > 0 && profiles[0].decks.length > 0) {
    return profiles[0].decks[0];
  }
  return null;
};

const updateDeckCardCount = (deckId) => {
  const deckCards = getCards(deckId);
  updateDeck(deckId, { cardCount: deckCards.length });
};

// Deck movement functionality
export const moveDeck = (deckId, targetProfileId) => {
  try {
    const deck = getDeckById(deckId);
    const targetProfile = getProfileById(targetProfileId);
    const profiles = getProfiles();

    // Validation
    if (!deck) {
      throw new Error('Deck not found');
    }
    if (!targetProfile) {
      throw new Error('Target profile not found');
    }
    if (deck.profileId === targetProfileId) {
      throw new Error('Cannot move deck to the same profile');
    }

    const sourceProfile = profiles.find(p => p.id === deck.profileId);
    if (!sourceProfile) {
      throw new Error('Source profile not found');
    }

    // Perform the move operation
    // 1. Update deck's profileId
    updateDeck(deckId, { profileId: targetProfileId });

    // 2. Remove deck from source profile's decks array
    const sourceProfileUpdated = {
      ...sourceProfile,
      decks: sourceProfile.decks.filter(id => id !== deckId)
    };

    // 3. Add deck to target profile's decks array
    const targetProfileUpdated = {
      ...targetProfile,
      decks: [...targetProfile.decks, deckId]
    };

    // 4. Update both profiles
    const updatedProfiles = profiles.map(profile => {
      if (profile.id === sourceProfile.id) return sourceProfileUpdated;
      if (profile.id === targetProfile.id) return targetProfileUpdated;
      return profile;
    });

    localStorage.setItem(PROFILES_KEY, JSON.stringify(updatedProfiles));

    return { success: true, message: `Deck "${deck.name}" moved successfully` };
  } catch (error) {
    console.error('Error moving deck:', error);
    return { success: false, message: error.message };
  }
};

export const getAvailableTargetProfiles = (deckId) => {
  const deck = getDeckById(deckId);
  if (!deck) return [];

  const profiles = getProfiles();
  return profiles.filter(profile => profile.id !== deck.profileId);
};

// Legacy compatibility - alias for existing code
export const getLegacyCardsAlias = getLegacyCards;