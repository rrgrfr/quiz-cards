import { parseDeckFile } from '../domain/import-deck';
import type { Deck } from '../domain/types';
import type { ReadyDeck } from '../shared/ready-decks';
import type { Store, StoreError } from './store';

export type ReadyDeckError = 'already-added' | 'load-failed' | 'invalid-deck';

export type AddReadyDeckResult =
  { ok: true; value: Deck } | { ok: false; error: ReadyDeckError | StoreError };

/**
 * Add a ready-made deck on explicit user action (D-138). The title guards
 * against duplicates; a failed load or an invalid file leaves the state
 * untouched and is reported to the caller.
 */
export async function addReadyDeck(
  store: Store,
  deck: ReadyDeck,
  load: (file: string) => Promise<string>,
): Promise<AddReadyDeckResult> {
  if (store.get().decks.some((item) => item.title === deck.title)) {
    return { ok: false, error: 'already-added' };
  }

  let raw: string;
  try {
    raw = await load(deck.file);
  } catch {
    return { ok: false, error: 'load-failed' };
  }

  const parsed = parseDeckFile(raw);
  if (!parsed.ok) return { ok: false, error: 'invalid-deck' };

  return store.importDeck(parsed.value);
}
