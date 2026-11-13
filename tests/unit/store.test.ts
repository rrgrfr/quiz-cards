import { describe, expect, it, vi } from 'vitest';
import { Store } from '../../src/application/store';
import type { SaveResult, StoragePort } from '../../src/application/ports';
import { createEmptyState } from '../../src/domain/state';
import type { AppState, StudySession } from '../../src/domain/types';

function makeStore(saveResult: SaveResult = { ok: true }, initial: AppState = createEmptyState()) {
  let saved: AppState | null = null;
  let counter = 0;
  const port: StoragePort = {
    load: () => ({ status: 'ok', state: createEmptyState() }),
    save: (state) => {
      if (!saveResult.ok) return saveResult;
      saved = state;
      return { ok: true };
    },
    clear: () => {
      saved = null;
    },
  };
  const store = new Store(port, initial, {
    now: () => '2026-01-01T00:00:00.000Z',
    id: () => `id-${++counter}`,
  });
  return { store, saved: () => saved };
}

const cardValue = {
  question: 'Что такое HTTP?',
  answers: ['Протокол', 'База', 'Язык', 'Формат'] as [string, string, string, string],
  correctIndex: 0,
};

describe('Store', () => {
  it('creates a deck, persists it and bumps revision', () => {
    const { store, saved } = makeStore();
    const result = store.createDeck({ title: 'HTTP' });

    expect(result.ok).toBe(true);
    expect(store.get().decks).toHaveLength(1);
    expect(store.get().revision).toBe(1);
    expect(saved()?.decks[0]?.title).toBe('HTTP');
    expect(saved()?.revision).toBe(1);
  });

  it('creates a card linked to its deck and answer', () => {
    const { store } = makeStore();
    const deckResult = store.createDeck({ title: 'HTTP' });
    if (!deckResult.ok) throw new Error('deck was not created');

    const cardResult = store.createCard(deckResult.value.id, cardValue);

    expect(cardResult.ok).toBe(true);
    if (!cardResult.ok) return;
    expect(cardResult.value.deckId).toBe(deckResult.value.id);
    expect(cardResult.value.answers[0]?.id).toBe(cardResult.value.correctAnswerId);
    expect(store.get().decks[0]?.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('does not cascade deck archiving to cards', () => {
    const { store } = makeStore();
    const deckResult = store.createDeck({ title: 'HTTP' });
    if (!deckResult.ok) throw new Error('deck was not created');
    store.createCard(deckResult.value.id, cardValue);

    store.setDeckArchived(deckResult.value.id, true);

    expect(store.get().decks[0]?.isArchived).toBe(true);
    expect(store.get().cards[0]?.isArchived).toBe(false);
  });

  it('keeps the old state when the write fails', () => {
    const { store } = makeStore({ ok: false, error: 'quota' });
    const listener = vi.fn();
    store.subscribe(listener);

    const result = store.createDeck({ title: 'HTTP' });

    expect(result).toEqual({ ok: false, error: 'save-quota' });
    expect(store.get().decks).toHaveLength(0);
    expect(store.get().revision).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it('reports unknown entities', () => {
    const { store } = makeStore();
    expect(store.createCard('missing', cardValue)).toEqual({
      ok: false,
      error: 'deck-not-found',
    });
    expect(store.setDeckArchived('missing', true)).toEqual({
      ok: false,
      error: 'deck-not-found',
    });
    expect(store.setCardArchived('missing', true)).toEqual({
      ok: false,
      error: 'card-not-found',
    });
  });

  it('notifies subscribers on successful mutation', () => {
    const { store } = makeStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.createDeck({ title: 'HTTP' });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('appends a completed session and bumps revision', () => {
    const { store } = makeStore();
    const deckResult = store.createDeck({ title: 'HTTP' });
    if (!deckResult.ok) throw new Error('deck was not created');
    const cardResult = store.createCard(deckResult.value.id, cardValue);
    if (!cardResult.ok) throw new Error('card was not created');

    const session: StudySession = {
      id: 'session-1',
      deckId: deckResult.value.id,
      questionCount: 1,
      correctCount: 1,
      incorrectCount: 0,
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:01:00.000Z',
      attempts: [
        {
          id: 'attempt-1',
          cardId: cardResult.value.id,
          selectedAnswerId: cardResult.value.answers[0]!.id,
          isCorrect: true,
          answeredAt: '2026-01-01T00:00:30.000Z',
        },
      ],
    };

    const result = store.appendSession(session);

    expect(result.ok).toBe(true);
    expect(store.get().sessions).toHaveLength(1);
    expect(store.get().revision).toBe(3);
  });

  it('rejects a session with a broken reference', () => {
    const { store } = makeStore();
    const deckResult = store.createDeck({ title: 'HTTP' });
    if (!deckResult.ok) throw new Error('deck was not created');
    const cardResult = store.createCard(deckResult.value.id, cardValue);
    if (!cardResult.ok) throw new Error('card was not created');

    const session: StudySession = {
      id: 'session-1',
      deckId: deckResult.value.id,
      questionCount: 1,
      correctCount: 1,
      incorrectCount: 0,
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:01:00.000Z',
      attempts: [
        {
          id: 'attempt-1',
          cardId: 'missing',
          selectedAnswerId: cardResult.value.answers[0]!.id,
          isCorrect: true,
          answeredAt: '2026-01-01T00:00:30.000Z',
        },
      ],
    };

    expect(store.appendSession(session)).toEqual({ ok: false, error: 'invalid-state' });
    expect(store.get().sessions).toHaveLength(0);
  });

  it('reports a session for an unknown deck', () => {
    const { store } = makeStore();
    const session: StudySession = {
      id: 'session-1',
      deckId: 'missing',
      questionCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:01:00.000Z',
      attempts: [],
    };

    expect(store.appendSession(session)).toEqual({ ok: false, error: 'deck-not-found' });
  });

  it('resets statistics without touching content', () => {
    const { store } = makeStore();
    const deckResult = store.createDeck({ title: 'HTTP' });
    if (!deckResult.ok) throw new Error('deck was not created');
    const cardResult = store.createCard(deckResult.value.id, cardValue);
    if (!cardResult.ok) throw new Error('card was not created');

    store.appendSession({
      id: 'session-1',
      deckId: deckResult.value.id,
      questionCount: 1,
      correctCount: 1,
      incorrectCount: 0,
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:01:00.000Z',
      attempts: [
        {
          id: 'attempt-1',
          cardId: cardResult.value.id,
          selectedAnswerId: cardResult.value.answers[0]!.id,
          isCorrect: true,
          answeredAt: '2026-01-01T00:00:30.000Z',
        },
      ],
    });
    expect(store.get().sessions).toHaveLength(1);

    const result = store.resetStatistics();

    expect(result.ok).toBe(true);
    expect(store.get().sessions).toHaveLength(0);
    expect(store.get().decks).toHaveLength(1);
    expect(store.get().cards).toHaveLength(1);
    expect(store.get().decks[0]?.isArchived).toBe(false);
    expect(store.get().revision).toBe(4);
  });

  it('imports a deck with cards as active entities', () => {
    const { store } = makeStore();

    const result = store.importDeck({
      title: 'Импорт',
      description: 'Из файла',
      cards: [
        {
          question: 'Вопрос',
          answers: ['a', 'b', 'c', 'd'],
          correctIndex: 1,
          explanation: 'Потому что',
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(store.get().decks).toHaveLength(1);
    expect(store.get().cards).toHaveLength(1);
    const deck = store.get().decks[0]!;
    const card = store.get().cards[0]!;
    expect(deck.title).toBe('Импорт');
    expect(deck.isArchived).toBe(false);
    expect(card.deckId).toBe(deck.id);
    expect(card.isArchived).toBe(false);
    expect(card.answers[1]?.id).toBe(card.correctAnswerId);
    expect(store.get().revision).toBe(1);
  });

  it('rejects an import above the deck limit', () => {
    const decks = Array.from({ length: 100 }, (_, index) => ({
      id: `deck-${index}`,
      title: `Deck ${index}`,
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }));
    const { store } = makeStore({ ok: true }, { ...createEmptyState(), decks });

    const result = store.importDeck({
      title: 'Extra',
      cards: [{ question: 'Q', answers: ['a', 'b', 'c', 'd'], correctIndex: 0 }],
    });

    expect(result).toEqual({ ok: false, error: 'limit-exceeded' });
  });

  it('restores a validated state keeping its ids', () => {
    const { store } = makeStore();
    const restored: AppState = {
      ...createEmptyState(),
      decks: [
        {
          id: 'restored-deck',
          title: 'Восстановленный',
          isArchived: false,
          createdAt: '2026-02-01T00:00:00.000Z',
          updatedAt: '2026-02-01T00:00:00.000Z',
        },
      ],
    };

    const result = store.restore(restored);

    expect(result.ok).toBe(true);
    expect(store.get().decks).toHaveLength(1);
    expect(store.get().decks[0]?.id).toBe('restored-deck');
    expect(store.get().revision).toBe(1);
  });

  it('rejects an invalid restore and keeps the current state', () => {
    const { store } = makeStore();
    const invalid: AppState = {
      ...createEmptyState(),
      cards: [
        {
          id: 'card-1',
          deckId: 'missing',
          question: 'Q',
          answers: [
            { id: 'a1', text: 'a' },
            { id: 'a2', text: 'b' },
            { id: 'a3', text: 'c' },
            { id: 'a4', text: 'd' },
          ],
          correctAnswerId: 'a1',
          isArchived: false,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    expect(store.restore(invalid)).toEqual({ ok: false, error: 'invalid-state' });
    expect(store.get().cards).toHaveLength(0);
    expect(store.get().revision).toBe(0);
  });
});
