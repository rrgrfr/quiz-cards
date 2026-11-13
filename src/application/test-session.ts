import { cryptoRandom, shuffle, type RandomSource } from '../domain/random';
import { buildStudySession, type SessionAnswer } from '../domain/sessions';
import type { AnswerOption, Card, Deck, StudySession } from '../domain/types';

export interface RuntimeQuestion {
  card: Card;
  answers: AnswerOption[];
}

export interface AnswerFeedback {
  isCorrect: boolean;
  correctAnswerId: string;
  explanation?: string;
}

export type NextResult = 'advanced' | 'finished' | 'blocked';

export interface TestSessionOptions {
  now: () => string;
  nowMs?: () => number;
  id: () => string;
  random?: RandomSource;
}

/** How long a rapid second tap is ignored after an answer (D-063). */
export const ANSWER_GUARD_MS = 300;

/**
 * In-memory test run: unique random cards, shuffled answers, one answer per
 * question, no persistence until the session is completed (D-028, D-062, D-063).
 */
export class TestSession {
  readonly deckId: string;
  readonly plannedCount: number;
  private readonly startedAt: string;
  private readonly questions: RuntimeQuestion[];
  private readonly answers: SessionAnswer[] = [];
  private readonly options: TestSessionOptions;
  private readonly nowMs: () => number;
  private index = 0;
  private answeredCurrent = false;
  private finished = false;
  private lockedUntil = 0;

  constructor(deck: Deck, cards: readonly Card[], count: number, options: TestSessionOptions) {
    const available = cards.filter((card) => card.deckId === deck.id && !card.isArchived);
    if (available.length === 0) throw new Error('No active cards in the deck');

    const planned = Math.min(Math.max(1, Math.trunc(count)), available.length);
    const random = options.random ?? cryptoRandom;

    this.options = options;
    this.nowMs = options.nowMs ?? (() => Date.now());
    this.deckId = deck.id;
    this.plannedCount = planned;
    this.startedAt = options.now();

    this.questions = shuffle(available, random)
      .slice(0, planned)
      .map((card) => ({ card, answers: shuffle(card.answers, random) }));
  }

  get total(): number {
    return this.questions.length;
  }

  get number(): number {
    return this.index + 1;
  }

  get answeredCount(): number {
    return this.answers.length;
  }

  get correctCount(): number {
    return this.answers.filter((answer) => answer.isCorrect).length;
  }

  get isLast(): boolean {
    return this.index === this.questions.length - 1;
  }

  get isFinished(): boolean {
    return this.finished;
  }

  get isAnsweredCurrent(): boolean {
    return this.answeredCurrent;
  }

  current(): RuntimeQuestion {
    const question = this.questions[this.index];
    if (!question) throw new Error('Test session is finished');
    return question;
  }

  answer(answerId: string): AnswerFeedback | null {
    if (this.finished || this.answeredCurrent) return null;
    if (this.nowMs() < this.lockedUntil) return null;

    const question = this.current();
    const selected = question.answers.find((answer) => answer.id === answerId);
    if (!selected) return null;

    const isCorrect = selected.id === question.card.correctAnswerId;
    this.answers.push({
      cardId: question.card.id,
      selectedAnswerId: selected.id,
      isCorrect,
      answeredAt: this.options.now(),
    });
    this.answeredCurrent = true;
    this.lockedUntil = this.nowMs() + ANSWER_GUARD_MS;

    return {
      isCorrect,
      correctAnswerId: question.card.correctAnswerId,
      ...(question.card.explanation ? { explanation: question.card.explanation } : {}),
    };
  }

  next(): NextResult {
    if (!this.answeredCurrent || this.finished) return 'blocked';

    if (this.index === this.questions.length - 1) {
      this.finished = true;
      return 'finished';
    }

    this.index += 1;
    this.answeredCurrent = false;
    return 'advanced';
  }

  buildSession(): StudySession {
    if (!this.finished) throw new Error('Test session is not finished');
    return buildStudySession({
      id: this.options.id(),
      deckId: this.deckId,
      startedAt: this.startedAt,
      completedAt: this.options.now(),
      answers: this.answers,
      attemptId: this.options.id,
    });
  }
}
