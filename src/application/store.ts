import { createId } from '../domain/ids';
import {
  buildCard,
  buildDeck,
  canAddCard,
  findCard,
  findDeck,
  withCardArchived,
  withDeckArchived,
  type Factory,
} from '../domain/entities';
import { validateState } from '../domain/state';
import type { AppState, Card, Deck, StudySession } from '../domain/types';
import type { CardValue, DeckValue } from '../domain/validate';
import type { ImportedDeck } from '../domain/import-deck';
import { CARD_COUNT_LIMIT, DECK_COUNT_LIMIT } from '../domain/limits';
import type { StoragePort } from './ports';

export type StoreError =
  | 'deck-not-found'
  | 'card-not-found'
  | 'deck-full'
  | 'limit-exceeded'
  | 'invalid-state'
  | 'save-quota'
  | 'save-failed';

export type StoreResult<T = void> = { ok: true; value: T } | { ok: false; error: StoreError };

export interface StoreOptions {
  now?: () => string;
  id?: () => string;
}

/**
 * Application store: every mutation is validated, persisted as one atomic
 * write and only then published (D-031). A failed write keeps the old state.
 */
export class Store {
  private state: AppState;
  private readonly listeners = new Set<() => void>();
  private readonly factory: Factory;

  constructor(
    private readonly port: StoragePort,
    initial: AppState,
    options: StoreOptions = {},
  ) {
    this.state = initial;
    this.factory = {
      now: options.now ?? (() => new Date().toISOString()),
      id: options.id ?? createId,
    };
  }

  get(): AppState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  createDeck(value: DeckValue): StoreResult<Deck> {
    const deck = buildDeck(value, this.factory);
    const error = this.commit({ ...this.state, decks: [...this.state.decks, deck] });
    return error ? { ok: false, error } : { ok: true, value: deck };
  }

  createCard(deckId: string, value: CardValue): StoreResult<Card> {
    if (!findDeck(this.state, deckId)) return { ok: false, error: 'deck-not-found' };
    if (!canAddCard(this.state, deckId)) return { ok: false, error: 'deck-full' };

    const card = buildCard(value, deckId, this.factory);
    const error = this.commit({
      ...this.state,
      cards: [...this.state.cards, card],
      decks: this.state.decks.map((deck) =>
        deck.id === deckId ? { ...deck, updatedAt: card.createdAt } : deck,
      ),
    });
    return error ? { ok: false, error } : { ok: true, value: card };
  }

  setDeckArchived(deckId: string, archived: boolean): StoreResult {
    if (!findDeck(this.state, deckId)) return { ok: false, error: 'deck-not-found' };
    const error = this.commit(withDeckArchived(this.state, deckId, archived, this.factory.now()));
    return error ? { ok: false, error } : { ok: true, value: undefined };
  }

  setCardArchived(cardId: string, archived: boolean): StoreResult {
    if (!findCard(this.state, cardId)) return { ok: false, error: 'card-not-found' };
    const error = this.commit(withCardArchived(this.state, cardId, archived, this.factory.now()));
    return error ? { ok: false, error } : { ok: true, value: undefined };
  }

  /** Persist a completed test session exactly once (D-068). */
  appendSession(session: StudySession): StoreResult<StudySession> {
    if (!findDeck(this.state, session.deckId)) return { ok: false, error: 'deck-not-found' };
    const error = this.commit({ ...this.state, sessions: [...this.state.sessions, session] });
    return error ? { ok: false, error } : { ok: true, value: session };
  }

  /** Reset statistics only: sessions and attempts, never content (D-073, D-074). */
  resetStatistics(): StoreResult {
    const error = this.commit({ ...this.state, sessions: [] });
    return error ? { ok: false, error } : { ok: true, value: undefined };
  }

  /** Import a validated deck as a new active deck (D-042, D-049). */
  importDeck(deck: ImportedDeck): StoreResult<Deck> {
    if (this.state.decks.length >= DECK_COUNT_LIMIT) return { ok: false, error: 'limit-exceeded' };
    if (this.state.cards.length + deck.cards.length > CARD_COUNT_LIMIT) {
      return { ok: false, error: 'limit-exceeded' };
    }

    const built = buildDeck(
      {
        title: deck.title,
        ...(deck.description ? { description: deck.description } : {}),
      },
      this.factory,
    );

    const cards = deck.cards.map((card) =>
      buildCard(
        {
          question: card.question,
          answers: card.answers,
          correctIndex: card.correctIndex,
          ...(card.explanation ? { explanation: card.explanation } : {}),
        },
        built.id,
        this.factory,
      ),
    );

    const error = this.commit({
      ...this.state,
      decks: [...this.state.decks, built],
      cards: [...this.state.cards, ...cards],
    });

    return error ? { ok: false, error } : { ok: true, value: built };
  }

  /** Replace the whole state with a validated backup (D-053). */
  restore(state: AppState): StoreResult {
    const error = this.commit(state);
    return error ? { ok: false, error } : { ok: true, value: undefined };
  }

  private commit(next: AppState): StoreError | null {
    const candidate: AppState = { ...next, revision: this.state.revision + 1 };
    const validation = validateState(candidate);
    if (!validation.ok) return 'invalid-state';

    const saved = this.port.save(candidate);
    if (!saved.ok) return saved.error === 'quota' ? 'save-quota' : 'save-failed';

    this.state = candidate;
    for (const listener of this.listeners) listener();
    return null;
  }
}
