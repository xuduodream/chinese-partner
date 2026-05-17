const STORAGE_KEY = 'chinese_flashcards';

export const saveCard = (card) => {
  const existing = getCards();
  const newCard = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    reviewCount: 0,
    lastReviewed: null,
    ...card
  };
  existing.push(newCard);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return newCard;
};

export const getCards = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const deleteCard = (id) => {
  const cards = getCards().filter(card => card.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
};

export const updateCard = (id, updates) => {
  const cards = getCards().map(card =>
    card.id === id ? { ...card, ...updates } : card
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
};