import { describe, expect, it } from 'vitest';
import { cardHistory, summarize, summarizeDeck } from '../../src/domain/stats';
import type { Attempt, StudySession } from '../../src/domain/types';

function attempt(id: string, cardId: string, isCorrect: boolean, answeredAt: string): Attempt {
  return { id, cardId, selectedAnswerId: `${cardId}-a`, isCorrect, answeredAt };
}

function session(
  id: string,
  deckId: string,
  attempts: Attempt[],
  completedAt = '2026-01-02T00:00:00.000Z',
): StudySession {
  const correct = attempts.filter((item) => item.isCorrect).length;
  return {
    id,
    deckId,
    questionCount: attempts.length,
    correctCount: correct,
    incorrectCount: attempts.length - correct,
    startedAt: '2026-01-01T00:00:00.000Z',
    completedAt,
    attempts,
  };
}

const sessions: StudySession[] = [
  session('s1', 'deck-1', [
    attempt('a1', 'card-1', true, '2026-01-01T00:01:00.000Z'),
    attempt('a2', 'card-2', false, '2026-01-01T00:02:00.000Z'),
    attempt('a3', 'card-1', true, '2026-01-01T00:03:00.000Z'),
  ]),
  session('s2', 'deck-2', [
    attempt('a4', 'card-1', false, '2026-01-02T00:01:00.000Z'),
    attempt('a5', 'card-3', true, '2026-01-02T00:02:00.000Z'),
  ]),
];

describe('summarize', () => {
  it('returns zeroes without sessions', () => {
    expect(summarize([])).toEqual({
      tests: 0,
      answered: 0,
      correct: 0,
      incorrect: 0,
      percent: null,
    });
  });

  it('aggregates tests, answers and percent', () => {
    expect(summarize(sessions)).toEqual({
      tests: 2,
      answered: 5,
      correct: 3,
      incorrect: 2,
      percent: 60,
    });
  });

  it('filters sessions by deck', () => {
    expect(summarizeDeck(sessions, 'deck-1')).toEqual({
      tests: 1,
      answered: 3,
      correct: 2,
      incorrect: 1,
      percent: 67,
    });
    expect(summarizeDeck(sessions, 'missing')).toEqual({
      tests: 0,
      answered: 0,
      correct: 0,
      incorrect: 0,
      percent: null,
    });
  });
});

describe('cardHistory', () => {
  it('returns newest attempts first with totals over all attempts', () => {
    const history = cardHistory(sessions, 'card-1', 2);

    expect(history.attempts.map((item) => item.id)).toEqual(['a4', 'a3']);
    expect(history.correct).toBe(2);
    expect(history.incorrect).toBe(1);
    expect(history.percent).toBe(67);
  });

  it('returns an empty history for an unknown card', () => {
    expect(cardHistory(sessions, 'missing')).toEqual({
      attempts: [],
      correct: 0,
      incorrect: 0,
      percent: null,
    });
  });
});
