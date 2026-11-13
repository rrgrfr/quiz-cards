import { createId, nowIso } from './ids';
import type { AnswerOption, AppState, Card, Deck } from './types';
import type { CardValue, DeckValue } from './validate';
import { LIMITS } from './limits';

export interface Factory {
  now(): string;
  id(): string;
}

export const systemFactory: Factory = { now: nowIso, id: createId };

export function buildDeck(value: DeckValue, factory: Factory = systemFactory): Deck {
  const timestamp = factory.now();
  return {
    id: factory.id(),
    title: value.title,
    ...(value.description ? { description: value.description } : {}),
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildCard(
  value: CardValue,
  deckId: string,
  factory: Factory = systemFactory,
): Card {
  const answers: AnswerOption[] = value.answers.map((text) => ({ id: factory.id(), text }));
  const correct = answers[value.correctIndex];
  if (!correct) throw new Error('correct answer is missing');

  return {
    id: factory.id(),
    deckId,
    question: value.question,
    answers,
    correctAnswerId: correct.id,
    ...(value.explanation ? { explanation: value.explanation } : {}),
    isArchived: false,
    createdAt: factory.now(),
  };
}

export function findDeck(state: AppState, deckId: string): Deck | undefined {
  return state.decks.find((deck) => deck.id === deckId);
}

export function findCard(state: AppState, cardId: string): Card | undefined {
  return state.cards.find((card) => card.id === cardId);
}

export function activeDecks(state: AppState): Deck[] {
  return state.decks
    .filter((deck) => !deck.isArchived)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function archivedDecks(state: AppState): Deck[] {
  return state.decks.filter((deck) => deck.isArchived);
}

export function cardsOf(state: AppState, deckId: string): Card[] {
  return state.cards
    .filter((card) => card.deckId === deckId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function activeCardsCount(state: AppState, deckId: string): number {
  return state.cards.filter((card) => card.deckId === deckId && !card.isArchived).length;
}

export function archivedCards(state: AppState): Card[] {
  return state.cards.filter((card) => card.isArchived);
}

/** Archive a deck without touching its cards (D-085). */
export function withDeckArchived(
  state: AppState,
  deckId: string,
  archived: boolean,
  now: string,
): AppState {
  return {
    ...state,
    decks: state.decks.map((deck) =>
      deck.id === deckId ? { ...deck, isArchived: archived, updatedAt: now } : deck,
    ),
  };
}

/** Archive a card and touch its deck's updatedAt (D-025). */
export function withCardArchived(
  state: AppState,
  cardId: string,
  archived: boolean,
  now: string,
): AppState {
  const card = state.cards.find((item) => item.id === cardId);
  if (!card) return state;

  return {
    ...state,
    cards: state.cards.map((item) =>
      item.id === cardId ? { ...item, isArchived: archived } : item,
    ),
    decks: state.decks.map((deck) =>
      deck.id === card.deckId ? { ...deck, updatedAt: now } : deck,
    ),
  };
}

export function canAddCard(state: AppState, deckId: string): boolean {
  return state.cards.filter((card) => card.deckId === deckId).length < LIMITS.cardsPerDeck;
}
