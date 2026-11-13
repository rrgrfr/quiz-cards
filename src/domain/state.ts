import { LIMITS } from './limits';
import type { AppState, Card } from './types';

export function createEmptyState(): AppState {
  return {
    schemaVersion: 1,
    revision: 0,
    decks: [],
    cards: [],
    sessions: [],
    settings: {},
  };
}

export type StateValidation = { ok: true; state: AppState } | { ok: false; reason: string };

function fail(reason: string): StateValidation {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isText(value: unknown, max: number, min = 1): value is string {
  if (typeof value !== 'string') return false;
  const length = value.trim().length;
  return length >= min && length <= max;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Validates the whole persisted state: identity, referential integrity and
 * session invariants (D-029, section 3 of the data spec).
 */
export function validateState(value: unknown): StateValidation {
  if (!isRecord(value)) return fail('state is not an object');
  if (value.schemaVersion !== 1) return fail('unsupported schemaVersion');

  const revision = value.revision;
  if (!isNonNegativeInteger(revision)) return fail('invalid revision');

  const decksValue = value.decks;
  const cardsValue = value.cards;
  const sessionsValue = value.sessions;
  const settings = value.settings;

  if (!Array.isArray(decksValue)) return fail('decks is not an array');
  if (!Array.isArray(cardsValue)) return fail('cards is not an array');
  if (!Array.isArray(sessionsValue)) return fail('sessions is not an array');
  if (!isRecord(settings)) return fail('settings is not an object');

  const ids = new Set<string>();
  const takeId = (id: unknown): boolean => {
    if (typeof id !== 'string' || id.length === 0) return false;
    if (ids.has(id)) return false;
    ids.add(id);
    return true;
  };

  const deckIds = new Set<string>();
  for (const deck of decksValue) {
    if (!isRecord(deck)) return fail('deck is not an object');
    if (!takeId(deck.id)) return fail('deck id is invalid or duplicated');
    if (!isText(deck.title, LIMITS.deckTitle)) return fail('deck title is invalid');
    if (deck.description !== undefined && !isText(deck.description, LIMITS.deckDescription, 0)) {
      return fail('deck description is invalid');
    }
    if (typeof deck.isArchived !== 'boolean') return fail('deck isArchived is invalid');
    if (!isIsoDate(deck.createdAt) || !isIsoDate(deck.updatedAt)) {
      return fail('deck timestamps are invalid');
    }
    deckIds.add(deck.id as string);
  }

  const cards = new Map<string, Card>();
  for (const card of cardsValue) {
    if (!isRecord(card)) return fail('card is not an object');
    if (!takeId(card.id)) return fail('card id is invalid or duplicated');
    if (typeof card.deckId !== 'string' || !deckIds.has(card.deckId)) {
      return fail('card references an unknown deck');
    }
    if (!isText(card.question, LIMITS.question)) return fail('card question is invalid');
    if (!Array.isArray(card.answers) || card.answers.length !== 4) {
      return fail('card answers must contain four options');
    }

    const texts = new Set<string>();
    for (const answer of card.answers) {
      if (!isRecord(answer)) return fail('answer is not an object');
      if (!takeId(answer.id)) return fail('answer id is invalid or duplicated');
      if (!isText(answer.text, LIMITS.answer)) return fail('answer text is invalid');
      const normalized = (answer.text as string).trim().toLocaleLowerCase('ru-RU');
      if (texts.has(normalized)) return fail('answers are duplicated');
      texts.add(normalized);
    }

    if (
      typeof card.correctAnswerId !== 'string' ||
      !card.answers.some((answer) => isRecord(answer) && answer.id === card.correctAnswerId)
    ) {
      return fail('correctAnswerId does not match any answer');
    }
    if (card.explanation !== undefined && !isText(card.explanation, LIMITS.explanation, 0)) {
      return fail('card explanation is invalid');
    }
    if (typeof card.isArchived !== 'boolean') return fail('card isArchived is invalid');
    if (!isIsoDate(card.createdAt)) return fail('card timestamp is invalid');

    cards.set(card.id as string, card as unknown as Card);
  }

  for (const session of sessionsValue) {
    if (!isRecord(session)) return fail('session is not an object');
    if (!takeId(session.id)) return fail('session id is invalid or duplicated');
    if (typeof session.deckId !== 'string' || !deckIds.has(session.deckId)) {
      return fail('session references an unknown deck');
    }
    if (!isNonNegativeInteger(session.questionCount)) return fail('questionCount is invalid');
    if (!isNonNegativeInteger(session.correctCount)) return fail('correctCount is invalid');
    if (!isNonNegativeInteger(session.incorrectCount)) return fail('incorrectCount is invalid');
    if (!isIsoDate(session.startedAt) || !isIsoDate(session.completedAt)) {
      return fail('session timestamps are invalid');
    }
    if (Date.parse(session.completedAt) < Date.parse(session.startedAt)) {
      return fail('session completes before it starts');
    }
    if (!Array.isArray(session.attempts)) return fail('attempts is not an array');
    if (session.questionCount !== session.attempts.length) {
      return fail('questionCount does not match attempts');
    }
    if (session.incorrectCount !== session.questionCount - session.correctCount) {
      return fail('session counters are inconsistent');
    }
    if (
      session.correctCount !==
      session.attempts.filter((a) => isRecord(a) && a.isCorrect === true).length
    ) {
      return fail('correctCount does not match attempts');
    }
    for (const attempt of session.attempts) {
      if (!isRecord(attempt)) return fail('attempt is not an object');
      if (!takeId(attempt.id)) return fail('attempt id is invalid or duplicated');
      const card = typeof attempt.cardId === 'string' ? cards.get(attempt.cardId) : undefined;
      if (!card) return fail('attempt references an unknown card');
      if (card.deckId !== session.deckId) {
        return fail('attempt card belongs to another deck');
      }
      if (
        typeof attempt.selectedAnswerId !== 'string' ||
        !card.answers.some((answer) => answer.id === attempt.selectedAnswerId)
      ) {
        return fail('attempt answer does not belong to the card');
      }
      const expected = card.correctAnswerId === attempt.selectedAnswerId;
      if (attempt.isCorrect !== expected) return fail('attempt correctness is invalid');
      if (!isIsoDate(attempt.answeredAt)) return fail('attempt timestamp is invalid');
    }
  }

  return { ok: true, state: value as unknown as AppState };
}
