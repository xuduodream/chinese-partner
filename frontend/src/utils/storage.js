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
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReview: null,
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

// Name validation and rename functionality
export const validateProfileName = (name, excludeId = null) => {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: 'Name is required' };
  }

  const trimmedName = name.trim();
  if (trimmedName === '') {
    return { valid: false, message: 'Name cannot be empty' };
  }

  const profiles = getProfiles();
  const nameExists = profiles.some(profile =>
    profile.id !== excludeId &&
    profile.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (nameExists) {
    return { valid: false, message: 'A profile with this name already exists' };
  }

  return { valid: true };
};

export const validateDeckName = (name, profileId, excludeId = null) => {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: 'Name is required' };
  }

  const trimmedName = name.trim();
  if (trimmedName === '') {
    return { valid: false, message: 'Name cannot be empty' };
  }

  const profileDecks = getDecks(profileId);
  const nameExists = profileDecks.some(deck =>
    deck.id !== excludeId &&
    deck.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (nameExists) {
    return { valid: false, message: 'A deck with this name already exists in this profile' };
  }

  return { valid: true };
};

export const renameProfile = (profileId, newName) => {
  try {
    const validation = validateProfileName(newName, profileId);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    const profiles = getProfiles();
    const profileIndex = profiles.findIndex(p => p.id === profileId);

    if (profileIndex === -1) {
      return { success: false, message: 'Profile not found' };
    }

    profiles[profileIndex] = {
      ...profiles[profileIndex],
      name: newName.trim()
    };

    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    return { success: true, message: 'Profile renamed successfully' };
  } catch (error) {
    console.error('Error renaming profile:', error);
    return { success: false, message: 'Failed to rename profile' };
  }
};

export const renameDeck = (deckId, newName) => {
  try {
    const deck = getDeckById(deckId);
    if (!deck) {
      return { success: false, message: 'Deck not found' };
    }

    const validation = validateDeckName(newName, deck.profileId, deckId);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    const decks = getDecks();
    const deckIndex = decks.findIndex(d => d.id === deckId);

    if (deckIndex === -1) {
      return { success: false, message: 'Deck not found' };
    }

    decks[deckIndex] = {
      ...decks[deckIndex],
      name: newName.trim()
    };

    localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
    return { success: true, message: 'Deck renamed successfully' };
  } catch (error) {
    console.error('Error renaming deck:', error);
    return { success: false, message: 'Failed to rename deck' };
  }
};

// Move card to another deck
export const moveCard = (cardId, targetDeckId) => {
  try {
    const cards = getCards();
    const cardIndex = cards.findIndex(c => c.id === cardId);

    if (cardIndex === -1) {
      return { success: false, message: 'Card not found' };
    }

    const card = cards[cardIndex];
    const sourceDeckId = card.deckId;

    if (sourceDeckId === targetDeckId) {
      return { success: false, message: 'Card is already in this deck' };
    }

    // Update the card's deckId
    cards[cardIndex] = {
      ...card,
      deckId: targetDeckId
    };

    localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(cards));

    // Update card counts for both decks
    updateDeckCardCount(sourceDeckId);
    updateDeckCardCount(targetDeckId);

    return { success: true, message: 'Card moved successfully' };
  } catch (error) {
    console.error('Error moving card:', error);
    return { success: false, message: 'Failed to move card' };
  }
};

// Get decks in the same profile (excluding current deck)
export const getAvailableTargetDecks = (cardId) => {
  const cards = getCards();
  const card = cards.find(c => c.id === cardId);

  if (!card) return [];

  const currentDeck = getDeckById(card.deckId);
  if (!currentDeck) return [];

  const profileDecks = getDecks(currentDeck.profileId);
  return profileDecks.filter(deck => deck.id !== card.deckId);
};

// ── SM-2 Spaced Repetition Algorithm ────────────────────────────────

const computeSM2 = (rating, { interval, easeFactor, repetitions }) => {
  let newInterval, newEase, newReps;
  const now = new Date();

  switch (rating) {
    case 'again': // forgot — repeat this session
      newInterval = 0;
      newEase = Math.max(1.3, easeFactor - 0.2);
      newReps = 0;
      break;

    case 'hard': // remembered with difficulty — short pause
      newInterval = 0;
      newEase = Math.max(1.3, easeFactor - 0.15);
      newReps = repetitions + 1;
      break;

    case 'good': // standard correct recall
      if (repetitions === 0) newInterval = 1;
      else if (repetitions === 1) newInterval = 6;
      else newInterval = Math.round(interval * easeFactor);
      newEase = easeFactor + 0.15;
      newReps = repetitions + 1;
      break;

    case 'easy': // effortless recall
      if (repetitions === 0) newInterval = 4;
      else if (repetitions === 1) newInterval = 10;
      else newInterval = Math.round(interval * easeFactor * 1.3);
      newEase = Math.min(easeFactor + 0.3, 5.0);
      newReps = repetitions + 1;
      break;

    default:
      // Fallback for legacy 'hard'/'good'/'easy' values (pre-SM-2 cards)
      if (rating === 'hard') {
        newInterval = 0;
        newEase = Math.max(1.3, easeFactor - 0.15);
        newReps = repetitions + 1;
      } else if (rating === 'easy') {
        if (repetitions === 0) newInterval = 4;
        else if (repetitions === 1) newInterval = 10;
        else newInterval = Math.round(interval * easeFactor * 1.3);
        newEase = Math.min(easeFactor + 0.3, 5.0);
        newReps = repetitions + 1;
      } else {
        // treat as 'good'
        if (repetitions === 0) newInterval = 1;
        else if (repetitions === 1) newInterval = 6;
        else newInterval = Math.round(interval * easeFactor);
        newEase = easeFactor + 0.15;
        newReps = repetitions + 1;
      }
  }

  // Sub-day intervals for Again (immediate) and Hard (5 min)
  let nextReviewDate;
  if (rating === 'again') {
    nextReviewDate = new Date(now.getTime());
  } else if (rating === 'hard') {
    nextReviewDate = new Date(now.getTime() + 5 * 60 * 1000);
  } else {
    nextReviewDate = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);
  }

  return {
    interval: newInterval,
    easeFactor: Math.round(newEase * 100) / 100,
    repetitions: newReps,
    nextReview: nextReviewDate.toISOString(),
  };
};

// Card difficulty tracking for study sessions (SM-2 powered)
export const updateCardDifficulty = (cardId, difficulty) => {
  try {
    const cards = getCards();
    const cardIndex = cards.findIndex(card => card.id === cardId);

    if (cardIndex === -1) {
      return { success: false, message: 'Card not found' };
    }

    const card = cards[cardIndex];
    const sm2 = computeSM2(difficulty, {
      interval: card.interval || 0,
      easeFactor: card.easeFactor || 2.5,
      repetitions: card.repetitions || 0,
    });

    cards[cardIndex] = {
      ...card,
      difficulty,
      lastReviewed: new Date().toISOString(),
      reviewCount: (card.reviewCount || 0) + 1,
      ...sm2,
    };

    localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(cards));
    return {
      success: true,
      message: 'Card difficulty updated',
      nextReview: sm2.nextReview,
      interval: sm2.interval,
      easeFactor: sm2.easeFactor,
    };
  } catch (error) {
    console.error('Error updating card difficulty:', error);
    return { success: false, message: 'Failed to update card difficulty' };
  }
};

export const getCardDifficulty = (cardId) => {
  const cards = getCards();
  const card = cards.find(card => card.id === cardId);
  return card?.difficulty || 'new';
};

export const getDeckStudyStats = (deckId) => {
  const deckCards = getCards(deckId);
  const studied = deckCards.filter(card => card.reviewCount > 0).length;
  const difficulties = deckCards.reduce((acc, card) => {
    const difficulty = card.difficulty || 'new';
    acc[difficulty] = (acc[difficulty] || 0) + 1;
    return acc;
  }, {});

  return {
    totalCards: deckCards.length,
    studiedCards: studied,
    newCards: deckCards.length - studied,
    difficultyBreakdown: difficulties
  };
};

// ── SM-2 Query Functions ────────────────────────────────────────────

// Cards due for review in a deck (previously reviewed and past due date)
export const getCardsDueForReview = (deckId) => {
  const now = new Date();
  return getCards(deckId).filter((c) => {
    // Must have been reviewed before (has a nextReview date)
    if (!c.nextReview) return false;
    // Legacy card without SM-2 data — treat as new, not due
    if (!c.repetitions && c.repetitions !== 0) return false;
    return new Date(c.nextReview) <= now;
  });
};

// New cards that have never been reviewed (up to a limit per session)
export const getNewCards = (deckId, limit = 20) => {
  return getCards(deckId)
    .filter((c) => {
      if (c.nextReview === null) return true;
      if (c.nextReview === undefined) return true;
      return false;
    })
    .slice(0, limit);
};

// Combined study queue: due cards first (oldest first), then new cards
export const getStudyQueue = (deckId, newCardLimit = 20) => {
  const due = getCardsDueForReview(deckId).sort(
    (a, b) => new Date(a.nextReview || 0) - new Date(b.nextReview || 0)
  );
  const newCards = getNewCards(deckId, newCardLimit);
  return { due, newCards, queue: [...due, ...newCards] };
};

// Deck overview stats for the deck list display
export const getDeckDueStats = (deckId) => {
  const allCards = getCards(deckId);
  const dueCards = getCardsDueForReview(deckId);
  const newCards = getCards(deckId).filter((c) => !c.nextReview);
  return {
    total: allCards.length,
    due: dueCards.length,
    new: newCards.length,
  };
};

// Update deck's lastStudied timestamp
export const updateDeckLastStudied = (deckId) => {
  updateDeck(deckId, { lastStudied: new Date().toISOString() });
};

// Legacy compatibility - alias for existing code
export const getLegacyCardsAlias = getLegacyCards;