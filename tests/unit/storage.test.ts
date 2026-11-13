import { describe, expect, it } from 'vitest';
import { createLocalStorageAdapter } from '../../src/infrastructure/storage';
import { STATE_KEY } from '../../src/shared/config';
import { createEmptyState } from '../../src/domain/state';
import type { AppState, Deck } from '../../src/domain/types';
import { MemoryStorage, QuotaStorage } from '../helpers/memory-storage';

const deck: Deck = {
  id: 'deck-1',
  title: 'HTTP',
  isArchived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('localStorage adapter', () => {
  it('returns an empty state when nothing is stored', () => {
    const adapter = createLocalStorageAdapter(new MemoryStorage());
    const loaded = adapter.load();

    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.decks).toHaveLength(0);
      expect(loaded.state.revision).toBe(0);
    }
  });

  it('round-trips a valid state', () => {
    const storage = new MemoryStorage();
    const state: AppState = { ...createEmptyState(), revision: 3, decks: [deck] };
    storage.setItem(STATE_KEY, JSON.stringify(state));

    const loaded = createLocalStorageAdapter(storage).load();

    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') expect(loaded.state.decks[0]?.id).toBe('deck-1');
  });

  it('reports broken JSON as corrupted', () => {
    const storage = new MemoryStorage();
    storage.setItem(STATE_KEY, '{not json');
    const loaded = createLocalStorageAdapter(storage).load();

    expect(loaded.status).toBe('corrupted');
    if (loaded.status !== 'ok') expect(loaded.raw).toBe('{not json');
  });

  it('reports an unknown schema version as unsupported', () => {
    const storage = new MemoryStorage();
    storage.setItem(STATE_KEY, JSON.stringify({ schemaVersion: 2, revision: 0 }));
    const loaded = createLocalStorageAdapter(storage).load();

    expect(loaded.status).toBe('unsupported');
  });

  it('reports a broken reference as corrupted', () => {
    const storage = new MemoryStorage();
    const state = {
      ...createEmptyState(),
      decks: [deck],
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
    storage.setItem(STATE_KEY, JSON.stringify(state));

    expect(createLocalStorageAdapter(storage).load().status).toBe('corrupted');
  });

  it('writes the serialized state under the state key', () => {
    const storage = new MemoryStorage();
    const adapter = createLocalStorageAdapter(storage);
    const state: AppState = { ...createEmptyState(), revision: 1, decks: [deck] };

    expect(adapter.save(state)).toEqual({ ok: true });
    expect(JSON.parse(storage.getItem(STATE_KEY) ?? '{}')).toMatchObject({ revision: 1 });
  });

  it('returns a quota error when the storage rejects the write', () => {
    const adapter = createLocalStorageAdapter(new QuotaStorage());

    expect(adapter.save(createEmptyState())).toEqual({ ok: false, error: 'quota' });
  });

  it('guards the write by state size before calling storage', () => {
    const storage = new MemoryStorage();
    const adapter = createLocalStorageAdapter(storage);
    const huge: AppState = {
      ...createEmptyState(),
      decks: [{ ...deck, description: 'x'.repeat(5 * 1024 * 1024) }],
    };

    expect(adapter.save(huge)).toEqual({ ok: false, error: 'quota' });
    expect(storage.getItem(STATE_KEY)).toBeNull();
  });

  it('clears the stored state', () => {
    const storage = new MemoryStorage();
    const adapter = createLocalStorageAdapter(storage);
    adapter.save(createEmptyState());

    adapter.clear();

    expect(storage.getItem(STATE_KEY)).toBeNull();
  });
});
