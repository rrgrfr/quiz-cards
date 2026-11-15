import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addReadyDeck } from '../../src/application/ready-decks';
import { Store } from '../../src/application/store';
import { parseDeckFile } from '../../src/domain/import-deck';
import { createEmptyState } from '../../src/domain/state';
import { createLocalStorageAdapter } from '../../src/infrastructure/storage';
import { READY_DECKS } from '../../src/shared/ready-decks';
import { MemoryStorage, QuotaStorage } from '../helpers/memory-storage';

const deck = READY_DECKS[0]!;
const raw = readFileSync(new URL(`../../public/${deck.file}`, import.meta.url), 'utf8');

function makeStore(storage: Storage = new MemoryStorage()): Store {
  const adapter = createLocalStorageAdapter(storage);
  let counter = 0;
  return new Store(adapter, createEmptyState(), {
    now: () => '2026-11-15T00:00:00.000Z',
    id: () => `id-${++counter}`,
  });
}

function loader(text: string = raw): {
  load: (file: string) => Promise<string>;
  calls: () => number;
} {
  let calls = 0;
  return {
    calls: () => calls,
    load: async () => {
      calls += 1;
      return text;
    },
  };
}

describe('ready decks catalog', () => {
  it('matches the shipped personal-quiz-deck file', () => {
    expect(READY_DECKS.length).toBeGreaterThan(0);

    const parsed = parseDeckFile(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.value.title).toBe(deck.title);
    expect(parsed.value.description).toBe(deck.description);
    expect(parsed.value.cards).toHaveLength(deck.cards);
  });
});

describe('addReadyDeck', () => {
  it('adds the deck once and never duplicates it', async () => {
    const store = makeStore();
    const source = loader();

    const added = await addReadyDeck(store, deck, source.load);
    expect(added.ok).toBe(true);
    expect(store.get().decks).toHaveLength(1);
    expect(store.get().cards).toHaveLength(deck.cards);
    expect(source.calls()).toBe(1);

    const again = await addReadyDeck(store, deck, source.load);
    expect(again).toEqual({ ok: false, error: 'already-added' });
    expect(source.calls()).toBe(1);
    expect(store.get().decks).toHaveLength(1);
  });

  it('skips loading when a deck with the same title exists', async () => {
    const store = makeStore();
    expect(store.createDeck({ title: deck.title }).ok).toBe(true);
    const source = loader();

    expect(await addReadyDeck(store, deck, source.load)).toEqual({
      ok: false,
      error: 'already-added',
    });
    expect(source.calls()).toBe(0);
  });

  it('reports a failed load without changing the state', async () => {
    const store = makeStore();
    const load = async (): Promise<string> => {
      throw new Error('offline');
    };

    expect(await addReadyDeck(store, deck, load)).toEqual({ ok: false, error: 'load-failed' });
    expect(store.get().decks).toHaveLength(0);
    expect(store.get().revision).toBe(0);
  });

  it('reports invalid data without changing the state', async () => {
    const store = makeStore();
    const source = loader('{"format":"other"}');

    expect(await addReadyDeck(store, deck, source.load)).toEqual({
      ok: false,
      error: 'invalid-deck',
    });
    expect(store.get().decks).toHaveLength(0);
  });

  it('reports a quota error without changing the state', async () => {
    const store = makeStore(new QuotaStorage());

    expect(await addReadyDeck(store, deck, loader().load)).toEqual({
      ok: false,
      error: 'save-quota',
    });
    expect(store.get().decks).toHaveLength(0);
    expect(store.get().revision).toBe(0);
  });
});
