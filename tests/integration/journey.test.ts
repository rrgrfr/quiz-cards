import { describe, expect, it } from 'vitest';
import { Store } from '../../src/application/store';
import { TestSession } from '../../src/application/test-session';
import { createBackup, parseBackup } from '../../src/domain/backup';
import { parseDeckFile } from '../../src/domain/import-deck';
import { createEmptyState } from '../../src/domain/state';
import { cardHistory, summarize, summarizeDeck } from '../../src/domain/stats';
import { createLocalStorageAdapter } from '../../src/infrastructure/storage';
import { STATE_KEY } from '../../src/shared/config';
import { MemoryStorage, QuotaStorage } from '../helpers/memory-storage';

function deckJson(cardCount: number): string {
  return JSON.stringify({
    format: 'personal-quiz-deck',
    schemaVersion: 1,
    deck: {
      title: 'HTTP',
      cards: Array.from({ length: cardCount }, (_, index) => ({
        question: `Вопрос ${index + 1}`,
        answers: ['Первый', 'Второй', 'Третий', 'Четвёртый'],
        correctAnswerIndex: index % 4,
      })),
    },
  });
}

function makeStore(storage: Storage) {
  const adapter = createLocalStorageAdapter(storage);
  let clock = 0;
  let counter = 0;
  const store = new Store(adapter, createEmptyState(), {
    now: () => new Date(1_700_000_000_000 + clock * 1000).toISOString(),
    id: () => `id-${++counter}`,
  });
  return { store, adapters: { adapter }, tick: () => (clock += 1) };
}

describe('full user journey', () => {
  it('imports, tests, aggregates and survives a backup round-trip', () => {
    const storage = new MemoryStorage();
    const { store } = makeStore(storage);

    const parsedDeck = parseDeckFile(deckJson(3));
    expect(parsedDeck.ok).toBe(true);
    if (!parsedDeck.ok) return;

    const imported = store.importDeck(parsedDeck.value);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const deckId = imported.value.id;

    const card = store.get().cards[0]!;
    let clock = 0;
    const session = new TestSession(imported.value, store.get().cards, 2, {
      now: () => new Date(1_700_000_100_000 + clock).toISOString(),
      nowMs: () => clock,
      id: (() => {
        let attempt = 0;
        return () => `session-id-${++attempt}`;
      })(),
      random: () => 0.42,
    });

    for (let question = 0; question < 2; question += 1) {
      const current = session.current();
      const correct = current.answers.find((answer) => answer.id === current.card.correctAnswerId)!;
      expect(session.answer(correct.id)?.isCorrect).toBe(true);
      clock += 300;
      session.next();
    }

    const built = session.buildSession();
    expect(store.appendSession(built).ok).toBe(true);

    const state = store.get();
    expect(summarize(state.sessions)).toMatchObject({
      tests: 1,
      answered: 2,
      correct: 2,
      incorrect: 0,
      percent: 100,
    });
    expect(summarizeDeck(state.sessions, deckId).percent).toBe(100);
    expect(cardHistory(state.sessions, card.id).attempts.length).toBeGreaterThan(0);

    const backup = createBackup(state, {
      appVersion: '0.1.0',
      exportedAt: '2026-11-13T12:00:00.000Z',
    });
    const restoredBackup = parseBackup(backup);
    expect(restoredBackup.ok).toBe(true);
    if (!restoredBackup.ok) return;

    const freshStorage = new MemoryStorage();
    const fresh = makeStore(freshStorage);
    expect(fresh.store.restore(restoredBackup.state).ok).toBe(true);

    expect(fresh.store.get().decks).toHaveLength(1);
    expect(fresh.store.get().cards).toHaveLength(3);
    expect(fresh.store.get().sessions).toHaveLength(1);
    expect(fresh.store.get().decks[0]?.id).toBe(deckId);
    expect(fresh.store.get().sessions[0]?.id).toBe(built.id);

    const reloaded = createLocalStorageAdapter(freshStorage).load();
    expect(reloaded.status).toBe('ok');
    if (reloaded.status === 'ok') {
      expect(reloaded.state.sessions).toHaveLength(1);
      expect(reloaded.state.revision).toBe(1);
    }
  });

  it('keeps data unchanged when storage rejects a write', () => {
    const { store } = makeStore(new QuotaStorage());

    const deck = store.createDeck({ title: 'HTTP' });

    expect(deck).toEqual({ ok: false, error: 'save-quota' });
    expect(store.get().decks).toHaveLength(0);
    expect(store.get().revision).toBe(0);
  });

  it('reports corrupted storage without overwriting it', () => {
    const storage = new MemoryStorage();
    storage.setItem(STATE_KEY, '{"broken"');
    const adapter = createLocalStorageAdapter(storage);

    const loaded = adapter.load();

    expect(loaded.status).toBe('corrupted');
    expect(storage.getItem(STATE_KEY)).toBe('{"broken"');
  });

  it('imports the maximum supported deck of 1000 cards', () => {
    const storage = new MemoryStorage();
    const { store } = makeStore(storage);
    const parsed = parseDeckFile(deckJson(1000));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.cards).toHaveLength(1000);

    const imported = store.importDeck(parsed.value);

    expect(imported.ok).toBe(true);
    expect(store.get().cards).toHaveLength(1000);
    expect(store.get().revision).toBe(1);
  });
});
