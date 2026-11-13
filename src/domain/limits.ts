export const LIMITS = {
  deckTitle: 120,
  deckDescription: 200,
  question: 500,
  answer: 200,
  explanation: 1000,
  cardsPerDeck: 1000,
  stateBytes: 4.5 * 1024 * 1024,
  importFileBytes: 2 * 1024 * 1024,
} as const;

export const DECK_COUNT_LIMIT = 100;
export const CARD_COUNT_LIMIT = 5000;
