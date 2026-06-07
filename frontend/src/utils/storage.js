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
    state: 'learning',
    stepIndex: 0,
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapseCount: 0,
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

  // One-time migration: infer state for pre-Anki cards
  let migrated = false;
  const result = cards.map(c => {
    if (!c.state) {
      migrated = true;
      if (c.nextReview === null || c.nextReview === undefined) {
        return { ...c, state: 'learning', stepIndex: 0, lapseCount: 0 };
      } else {
        return { ...c, state: 'review', stepIndex: null, lapseCount: c.lapseCount || 0 };
      }
    }
    return c;
  });
  if (migrated) {
    localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(result));
  }

  return deckId ? result.filter(card => card.deckId === deckId) : result;
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

// ── Anki Spaced Repetition Algorithm ─────────────────────────────────

// Anki default settings
const LEARNING_STEPS = [1, 10];       // minutes
const RELEARNING_STEPS = [10];        // minutes
const GRADUATING_INTERVAL_GOOD = 1;   // days
const GRADUATING_INTERVAL_EASY = 4;   // days
const LAPSE_INTERVAL_PCT = 0.5;       // multiplier on lapse
const MIN_EASE = 1.3;
const MAX_EASE = 5.0;
const FUZZ_PCT = 0.05;                // ±5% jitter on intervals ≥ 1 day

// Apply fuzz to intervals >= 1 day (like Anki, prevents card clumping)
const applyFuzz = (intervalDays) => {
  if (intervalDays < 1) return intervalDays;
  const jitter = 1 + (Math.random() - 0.5) * 2 * FUZZ_PCT;
  return Math.round(intervalDays * jitter);
};

// Compute a delay in minutes as a Date
const delayDate = (minutes) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

// Compute an interval in days as a Date
const intervalDate = (days) => {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

// Core Anki scheduling — pure function, no side effects
const computeAnki = (rating, card) => {
  const now = new Date();
  let {
    state = 'learning',
    stepIndex = 0,
    interval = 0,
    easeFactor = 2.5,
    repetitions = 0,
    lapseCount = 0,
  } = card;

  let newState = state;
  let newStepIndex = stepIndex;
  let newInterval = interval;
  let newEase = easeFactor;
  let newReps = repetitions;
  let newLapseCount = lapseCount;
  let nextReview;

  switch (state) {
    // ── LEARNING (new cards going through initial steps) ──────────────
    case 'learning': {
      const steps = LEARNING_STEPS;
      const currentDelay = steps[stepIndex] || steps[steps.length - 1];

      switch (rating) {
        case 'again':
          newStepIndex = 0;
          newEase = Math.max(MIN_EASE, easeFactor - 0.20);
          nextReview = delayDate(steps[0]);
          newReps = 0;
          break;

        case 'hard':
          // Same step, 1.5× delay (like Anki)
          newStepIndex = stepIndex;
          newEase = Math.max(MIN_EASE, easeFactor - 0.15);
          nextReview = delayDate(currentDelay * 1.5);
          break;

        case 'good':
          if (stepIndex >= steps.length - 1) {
            // Last step → graduate to review
            newState = 'review';
            newStepIndex = null;
            newInterval = applyFuzz(GRADUATING_INTERVAL_GOOD);
            newEase = easeFactor + 0.15;
            newReps = 0;
            nextReview = intervalDate(newInterval);
          } else {
            // Advance to next step
            newStepIndex = stepIndex + 1;
            newEase = easeFactor + 0.15;
            nextReview = delayDate(steps[stepIndex + 1]);
          }
          break;

        case 'easy':
          // Skip all steps → graduate immediately with 4-day interval
          newState = 'review';
          newStepIndex = null;
          newInterval = applyFuzz(GRADUATING_INTERVAL_EASY);
          newEase = Math.min(MAX_EASE, easeFactor + 0.30);
          newReps = 0;
          nextReview = intervalDate(newInterval);
          break;

        default:
          // Fallback — treat as good
          if (stepIndex >= steps.length - 1) {
            newState = 'review';
            newStepIndex = null;
            newInterval = applyFuzz(GRADUATING_INTERVAL_GOOD);
            newEase = easeFactor + 0.15;
            newReps = 0;
            nextReview = intervalDate(newInterval);
          } else {
            newStepIndex = stepIndex + 1;
            newEase = easeFactor + 0.15;
            nextReview = delayDate(steps[stepIndex + 1]);
          }
      }
      break;
    }

    // ── REVIEW (graduated cards on full schedule) ─────────────────────
    case 'review': {
      switch (rating) {
        case 'again':
          // Lapse: enter relearning, reduce interval
          newState = 'relearning';
          newStepIndex = 0;
          newInterval = Math.max(1, Math.round(interval * LAPSE_INTERVAL_PCT));
          newEase = Math.max(MIN_EASE, easeFactor - 0.20);
          newLapseCount = lapseCount + 1;
          nextReview = delayDate(RELEARNING_STEPS[0]);
          break;

        case 'hard':
          newInterval = applyFuzz(Math.max(interval * 1.2, interval + 1));
          newEase = Math.max(MIN_EASE, easeFactor - 0.15);
          newReps = repetitions + 1;
          nextReview = intervalDate(newInterval);
          break;

        case 'good':
          newInterval = applyFuzz(Math.round(interval * easeFactor));
          newEase = easeFactor + 0.15;
          newReps = repetitions + 1;
          nextReview = intervalDate(newInterval);
          break;

        case 'easy':
          newInterval = applyFuzz(Math.round(interval * easeFactor * 1.3));
          newEase = Math.min(MAX_EASE, easeFactor + 0.30);
          newReps = repetitions + 1;
          nextReview = intervalDate(newInterval);
          break;

        default:
          // Fallback — treat as good
          newInterval = applyFuzz(Math.round(interval * easeFactor));
          newEase = easeFactor + 0.15;
          newReps = repetitions + 1;
          nextReview = intervalDate(newInterval);
      }
      break;
    }

    // ── RELEARNING (lapsed cards going through recovery steps) ────────
    case 'relearning': {
      const steps = RELEARNING_STEPS;
      const currentDelay = steps[stepIndex] || steps[steps.length - 1];

      switch (rating) {
        case 'again':
          newStepIndex = 0;
          newEase = Math.max(MIN_EASE, easeFactor - 0.20);
          nextReview = delayDate(steps[0]);
          break;

        case 'hard':
          newStepIndex = stepIndex;
          newEase = Math.max(MIN_EASE, easeFactor - 0.15);
          nextReview = delayDate(currentDelay * 1.5);
          break;

        case 'good':
          if (stepIndex >= steps.length - 1) {
            // Last step → re-graduate to review
            newState = 'review';
            newStepIndex = null;
            newInterval = applyFuzz(Math.round(interval * easeFactor));
            newEase = easeFactor + 0.15;
            nextReview = intervalDate(newInterval);
          } else {
            newStepIndex = stepIndex + 1;
            newEase = easeFactor + 0.15;
            nextReview = delayDate(steps[stepIndex + 1]);
          }
          break;

        case 'easy':
          // Skip remaining steps → re-graduate immediately
          newState = 'review';
          newStepIndex = null;
          newInterval = applyFuzz(Math.round(interval * easeFactor * 1.3));
          newEase = Math.min(MAX_EASE, easeFactor + 0.30);
          nextReview = intervalDate(newInterval);
          break;

        default:
          // Fallback — treat as good
          if (stepIndex >= steps.length - 1) {
            newState = 'review';
            newStepIndex = null;
            newInterval = applyFuzz(Math.round(interval * easeFactor));
            newEase = easeFactor + 0.15;
            nextReview = intervalDate(newInterval);
          } else {
            newStepIndex = stepIndex + 1;
            newEase = easeFactor + 0.15;
            nextReview = delayDate(steps[stepIndex + 1]);
          }
      }
      break;
    }

    default:
      // Unknown state — treat as learning
      newState = 'learning';
      newStepIndex = 0;
      newEase = Math.max(MIN_EASE, easeFactor - 0.20);
      nextReview = delayDate(LEARNING_STEPS[0]);
  }

  return {
    state: newState,
    stepIndex: newStepIndex,
    interval: newInterval,
    easeFactor: Math.round(newEase * 100) / 100,
    repetitions: newReps,
    lapseCount: newLapseCount,
    nextReview: nextReview.toISOString(),
  };
};

// Card difficulty tracking for study sessions (Anki-powered)
export const updateCardDifficulty = (cardId, difficulty) => {
  try {
    const cards = getCards();
    const cardIndex = cards.findIndex(card => card.id === cardId);

    if (cardIndex === -1) {
      return { success: false, message: 'Card not found' };
    }

    const card = cards[cardIndex];
    const anki = computeAnki(difficulty, {
      state: card.state,
      stepIndex: card.stepIndex,
      interval: card.interval || 0,
      easeFactor: card.easeFactor || 2.5,
      repetitions: card.repetitions || 0,
      lapseCount: card.lapseCount || 0,
    });

    cards[cardIndex] = {
      ...card,
      difficulty,
      state: anki.state,
      stepIndex: anki.stepIndex,
      lastReviewed: new Date().toISOString(),
      reviewCount: (card.reviewCount || 0) + 1,
      interval: anki.interval,
      easeFactor: anki.easeFactor,
      repetitions: anki.repetitions,
      lapseCount: anki.lapseCount,
      nextReview: anki.nextReview,
    };

    localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(cards));
    return {
      success: true,
      message: 'Card difficulty updated',
      nextReview: anki.nextReview,
      interval: anki.interval,
      easeFactor: anki.easeFactor,
      state: anki.state,
      lapseCount: anki.lapseCount,
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

// ── Anki Query Functions ────────────────────────────────────────────

// Cards due for review in a deck (previously reviewed and past due date)
export const getCardsDueForReview = (deckId) => {
  const now = new Date();
  return getCards(deckId).filter((c) => {
    if (!c.nextReview) return false;
    // Card has Anki state — learning/relearning (sub-day) or review past due
    if (c.state) {
      return new Date(c.nextReview) <= now;
    }
    // Legacy card without Anki state — check repetitions to exclude old-format
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