import type { Attempt, StudySession } from './types';

export interface SessionAnswer {
  cardId: string;
  selectedAnswerId: string;
  isCorrect: boolean;
  answeredAt: string;
}

export interface BuildSessionParams {
  id: string;
  deckId: string;
  startedAt: string;
  completedAt: string;
  answers: readonly SessionAnswer[];
  attemptId: () => string;
}

/** Build a completed session with consistent counters (D-029). */
export function buildStudySession(params: BuildSessionParams): StudySession {
  const attempts: Attempt[] = params.answers.map((answer) => ({
    id: params.attemptId(),
    cardId: answer.cardId,
    selectedAnswerId: answer.selectedAnswerId,
    isCorrect: answer.isCorrect,
    answeredAt: answer.answeredAt,
  }));

  const correctCount = attempts.filter((attempt) => attempt.isCorrect).length;

  return {
    id: params.id,
    deckId: params.deckId,
    questionCount: attempts.length,
    correctCount,
    incorrectCount: attempts.length - correctCount,
    startedAt: params.startedAt,
    completedAt: params.completedAt,
    attempts,
  };
}

/** Percent of correct answers, or null when there is nothing to count (D-070). */
export function percent(correct: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((correct / total) * 100);
}
