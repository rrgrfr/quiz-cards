import { percent } from './sessions';
import type { Attempt, StudySession } from './types';

export interface StatsSummary {
  tests: number;
  answered: number;
  correct: number;
  incorrect: number;
  percent: number | null;
}

function summarizeAttempts(tests: number, attempts: readonly Attempt[]): StatsSummary {
  const answered = attempts.length;
  const correct = attempts.filter((attempt) => attempt.isCorrect).length;
  return {
    tests,
    answered,
    correct,
    incorrect: answered - correct,
    percent: percent(correct, answered),
  };
}

/** Overall statistics are always derived from sessions (D-069, D-070). */
export function summarize(sessions: readonly StudySession[]): StatsSummary {
  return summarizeAttempts(
    sessions.length,
    sessions.flatMap((session) => session.attempts),
  );
}

export function summarizeDeck(sessions: readonly StudySession[], deckId: string): StatsSummary {
  const deckSessions = sessions.filter((session) => session.deckId === deckId);
  return summarizeAttempts(
    deckSessions.length,
    deckSessions.flatMap((session) => session.attempts),
  );
}

export interface CardHistory {
  attempts: Attempt[];
  correct: number;
  incorrect: number;
  percent: number | null;
}

/** Latest attempts of a card (D-072): at most `limit` items, newest first. */
export function cardHistory(
  sessions: readonly StudySession[],
  cardId: string,
  limit = 20,
): CardHistory {
  const attempts = sessions
    .flatMap((session) => session.attempts)
    .filter((attempt) => attempt.cardId === cardId)
    .sort((left, right) => right.answeredAt.localeCompare(left.answeredAt));

  const correct = attempts.filter((attempt) => attempt.isCorrect).length;
  return {
    attempts: attempts.slice(0, limit),
    correct,
    incorrect: attempts.length - correct,
    percent: percent(correct, attempts.length),
  };
}
