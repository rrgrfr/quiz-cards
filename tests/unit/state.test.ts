import { describe, expect, it } from 'vitest';
import { createEmptyState, validateState } from '../../src/domain/state';
import type { AppState, Card, Deck } from '../../src/domain/types';

const deck: Deck = {
  id: 'deck-1',
  title: 'HTTP',
  isArchived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const card: Card = {
  id: 'card-1',
  deckId: 'deck-1',
  question: 'Что такое HTTP?',
  answers: [
    { id: 'a1', text: 'Протокол' },
    { id: 'a2', text: 'База' },
    { id: 'a3', text: 'Язык' },
    { id: 'a4', text: 'Формат' },
  ],
  correctAnswerId: 'a1',
  isArchived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    ...createEmptyState(),
    revision: 1,
    decks: [deck],
    cards: [card],
    ...overrides,
  };
}

describe('validateState', () => {
  it('accepts an empty state', () => {
    expect(validateState(createEmptyState()).ok).toBe(true);
  });

  it('accepts a valid state with a deck and a card', () => {
    expect(validateState(state()).ok).toBe(true);
  });

  it('rejects an unsupported schema version', () => {
    const result = validateState({ ...state(), schemaVersion: 2 });
    expect(result.ok).toBe(false);
  });

  it('rejects duplicate ids', () => {
    const result = validateState(state({ cards: [{ ...card, id: 'deck-1' }] }));
    expect(result.ok).toBe(false);
  });

  it('rejects a card that references an unknown deck', () => {
    const result = validateState(state({ cards: [{ ...card, deckId: 'missing' }] }));
    expect(result.ok).toBe(false);
  });

  it('rejects a card with three answers', () => {
    const result = validateState(
      state({ cards: [{ ...card, answers: card.answers.slice(0, 3) }] }),
    );
    expect(result.ok).toBe(false);
  });

  it('rejects a correctAnswerId that is not among the answers', () => {
    const result = validateState(state({ cards: [{ ...card, correctAnswerId: 'a9' }] }));
    expect(result.ok).toBe(false);
  });

  it('rejects duplicated answer texts', () => {
    const answers = card.answers.map((answer, index) =>
      index === 1 ? { ...answer, text: 'ПРОТОКОЛ' } : answer,
    );
    const result = validateState(state({ cards: [{ ...card, answers }] }));
    expect(result.ok).toBe(false);
  });

  it('rejects a session whose counters do not match attempts', () => {
    const session = {
      id: 's1',
      deckId: 'deck-1',
      questionCount: 1,
      correctCount: 1,
      incorrectCount: 0,
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:01:00.000Z',
      attempts: [
        {
          id: 'at1',
          cardId: 'card-1',
          selectedAnswerId: 'a2',
          isCorrect: true,
          answeredAt: '2026-01-01T00:00:30.000Z',
        },
      ],
    };

    const result = validateState(state({ sessions: [session] }));
    expect(result.ok).toBe(false);
  });

  it('rejects a session attempt from another deck', () => {
    const otherDeck: Deck = { ...deck, id: 'deck-2', title: 'Other' };
    const otherCard: Card = {
      ...card,
      id: 'card-2',
      deckId: 'deck-2',
      answers: [
        { id: 'b1', text: 'One' },
        { id: 'b2', text: 'Two' },
        { id: 'b3', text: 'Three' },
        { id: 'b4', text: 'Four' },
      ],
      correctAnswerId: 'b1',
    };
    const session = {
      id: 's1',
      deckId: 'deck-1',
      questionCount: 1,
      correctCount: 1,
      incorrectCount: 0,
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:01:00.000Z',
      attempts: [
        {
          id: 'at1',
          cardId: 'card-2',
          selectedAnswerId: 'b1',
          isCorrect: true,
          answeredAt: '2026-01-01T00:00:30.000Z',
        },
      ],
    };

    const result = validateState(
      state({ decks: [deck, otherDeck], cards: [card, otherCard], sessions: [session] }),
    );
    expect(result.ok).toBe(false);
  });

  it('rejects a corrupted payload that is not an object', () => {
    expect(validateState(null).ok).toBe(false);
    expect(validateState('text').ok).toBe(false);
  });
});
