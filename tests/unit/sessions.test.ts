import { describe, expect, it } from 'vitest';
import { buildStudySession, percent } from '../../src/domain/sessions';

describe('buildStudySession', () => {
  it('computes counters from answers', () => {
    let counter = 0;
    const session = buildStudySession({
      id: 'session-1',
      deckId: 'deck-1',
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:05:00.000Z',
      attemptId: () => `attempt-${++counter}`,
      answers: [
        {
          cardId: 'c1',
          selectedAnswerId: 'a1',
          isCorrect: true,
          answeredAt: '2026-01-01T00:01:00.000Z',
        },
        {
          cardId: 'c2',
          selectedAnswerId: 'a2',
          isCorrect: false,
          answeredAt: '2026-01-01T00:02:00.000Z',
        },
        {
          cardId: 'c3',
          selectedAnswerId: 'a3',
          isCorrect: true,
          answeredAt: '2026-01-01T00:03:00.000Z',
        },
      ],
    });

    expect(session.questionCount).toBe(3);
    expect(session.correctCount).toBe(2);
    expect(session.incorrectCount).toBe(1);
    expect(session.attempts.map((attempt) => attempt.id)).toEqual([
      'attempt-1',
      'attempt-2',
      'attempt-3',
    ]);
  });
});

describe('percent', () => {
  it('rounds the share of correct answers', () => {
    expect(percent(2, 3)).toBe(67);
    expect(percent(1, 1)).toBe(100);
    expect(percent(0, 4)).toBe(0);
  });

  it('returns null when there is nothing to count', () => {
    expect(percent(0, 0)).toBeNull();
  });
});
