import { describe, expect, it } from 'vitest';
import {
  activeCardsCount,
  activeDecks,
  buildCard,
  buildDeck,
  cardsOf,
  withCardArchived,
  withDeckArchived,
  type Factory,
} from '../../src/domain/entities';
import { createEmptyState } from '../../src/domain/state';
import type { AppState } from '../../src/domain/types';

function factory(): Factory {
  let counter = 0;
  return {
    now: () => '2026-01-01T00:00:00.000Z',
    id: () => `id-${++counter}`,
  };
}

function stateWithDeckAndCard(): { state: AppState; deckId: string; cardId: string } {
  const source = factory();
  const deck = buildDeck({ title: 'HTTP' }, source);
  const card = buildCard(
    {
      question: 'Что такое HTTP?',
      answers: ['Протокол', 'База', 'Язык', 'Формат'],
      correctIndex: 0,
    },
    deck.id,
    source,
  );
  const state: AppState = {
    ...createEmptyState(),
    decks: [deck],
    cards: [card],
    revision: 1,
  };
  return { state, deckId: deck.id, cardId: card.id };
}

describe('buildDeck', () => {
  it('creates an active deck with timestamps from the factory', () => {
    const deck = buildDeck({ title: 'HTTP', description: 'Основы' }, factory());
    expect(deck).toMatchObject({
      title: 'HTTP',
      description: 'Основы',
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(deck.id).toBe('id-1');
  });

  it('omits a missing description', () => {
    const deck = buildDeck({ title: 'HTTP' }, factory());
    expect('description' in deck).toBe(false);
  });
});

describe('buildCard', () => {
  it('links correctAnswerId to the chosen answer', () => {
    const source = factory();
    const card = buildCard(
      {
        question: 'Q',
        answers: ['a', 'b', 'c', 'd'],
        correctIndex: 2,
        explanation: 'because',
      },
      'deck-1',
      source,
    );

    expect(card.answers).toHaveLength(4);
    expect(card.answers[2]?.id).toBe(card.correctAnswerId);
    expect(card.answers[2]?.text).toBe('c');
    expect(card.explanation).toBe('because');
  });
});

describe('archive rules', () => {
  it('does not cascade deck archiving to cards (D-085)', () => {
    const { state, deckId, cardId } = stateWithDeckAndCard();

    const next = withDeckArchived(state, deckId, true, '2026-02-01T00:00:00.000Z');

    expect(next.decks[0]?.isArchived).toBe(true);
    expect(next.cards[0]?.id).toBe(cardId);
    expect(next.cards[0]?.isArchived).toBe(false);
    expect(activeCardsCount(next, deckId)).toBe(1);
  });

  it('updates the deck timestamp when a card is archived', () => {
    const { state, deckId, cardId } = stateWithDeckAndCard();

    const next = withCardArchived(state, cardId, true, '2026-02-01T00:00:00.000Z');

    expect(next.cards[0]?.isArchived).toBe(true);
    expect(next.decks[0]?.updatedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(activeCardsCount(next, deckId)).toBe(0);
  });

  it('returns the same state for an unknown card', () => {
    const { state } = stateWithDeckAndCard();
    expect(withCardArchived(state, 'missing', true, '2026-02-01T00:00:00.000Z')).toBe(state);
  });
});

describe('queries', () => {
  it('sorts decks newest first and cards by creation', () => {
    const source = factory();
    const older = { ...buildDeck({ title: 'Old' }, source), createdAt: '2026-01-01T00:00:00.000Z' };
    const newer = { ...buildDeck({ title: 'New' }, source), createdAt: '2026-02-01T00:00:00.000Z' };
    const state: AppState = { ...createEmptyState(), decks: [older, newer] };

    expect(activeDecks(state).map((deck) => deck.title)).toEqual(['New', 'Old']);
    expect(cardsOf(state, older.id)).toHaveLength(0);
  });
});
