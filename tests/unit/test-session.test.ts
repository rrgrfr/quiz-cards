import { describe, expect, it } from 'vitest';
import { ANSWER_GUARD_MS, TestSession } from '../../src/application/test-session';
import type { Card, Deck } from '../../src/domain/types';
import type { RandomSource } from '../../src/domain/random';

const deck: Deck = {
  id: 'deck-1',
  title: 'HTTP',
  isArchived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeCard(index: number, correctIndex = 0): Card {
  const answers = [0, 1, 2, 3].map((answerIndex) => ({
    id: `c${index}-a${answerIndex}`,
    text: `Ответ ${answerIndex + 1}`,
  }));
  return {
    id: `card-${index}`,
    deckId: deck.id,
    question: `Вопрос ${index}`,
    answers,
    correctAnswerId: answers[correctIndex]?.id ?? 'missing',
    isArchived: false,
    createdAt: `2026-01-0${index}T00:00:00.000Z`,
  };
}

function seeded(values: readonly number[]): RandomSource {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}

function makeSession(cards: Card[], count: number, clock: { value: number } = { value: 0 }) {
  let counter = 0;
  const session = new TestSession(deck, cards, count, {
    now: () => new Date(1_700_000_000_000 + clock.value).toISOString(),
    nowMs: () => clock.value,
    id: () => `id-${++counter}`,
    random: seeded([0.13, 0.71, 0.42, 0.93, 0.27]),
  });
  return { session, clock };
}

describe('TestSession', () => {
  it('clamps the requested count to the pool and draws unique cards', () => {
    const cards = [makeCard(1), makeCard(2), makeCard(3)];
    const clock = { value: 0 };
    const { session } = makeSession(cards, 10, clock);

    expect(session.total).toBe(3);
    expect(session.plannedCount).toBe(3);

    const seen = new Set<string>();
    for (let questionIndex = 0; questionIndex < 3; questionIndex += 1) {
      const current = session.current();
      expect(seen.has(current.card.id)).toBe(false);
      seen.add(current.card.id);
      expect(current.answers).toHaveLength(4);

      session.answer(current.answers[0]!.id);
      clock.value += ANSWER_GUARD_MS;
      if (questionIndex < 2) expect(session.next()).toBe('advanced');
    }
  });

  it('accepts only the first answer for a question', () => {
    const { session } = makeSession([makeCard(1)], 1);
    const question = session.current();

    const first = session.answer(question.answers[2]!.id);
    const second = session.answer(question.answers[1]!.id);

    expect(first).not.toBeNull();
    expect(first?.isCorrect).toBe(question.answers[2]!.id === question.card.correctAnswerId);
    expect(second).toBeNull();
    expect(session.answeredCount).toBe(1);
    expect(session.isAnsweredCurrent).toBe(true);
  });

  it('ignores a rapid second question answer within the guard window', () => {
    const clock = { value: 1_000 };
    const { session } = makeSession([makeCard(1, 0), makeCard(2, 1)], 2, clock);

    session.answer(session.current().answers[0]!.id);
    expect(session.next()).toBe('advanced');

    const blocked = session.answer(session.current().answers[1]!.id);
    expect(blocked).toBeNull();

    clock.value += ANSWER_GUARD_MS;
    const allowed = session.answer(session.current().answers[1]!.id);
    expect(allowed).not.toBeNull();
  });

  it('finishes after the last answer and builds a consistent session', () => {
    const clock = { value: 0 };
    const { session } = makeSession([makeCard(1), makeCard(2)], 2, clock);

    const first = session.current();
    const wrongOption = first.answers.find((answer) => answer.id !== first.card.correctAnswerId)!;
    session.answer(wrongOption.id);
    clock.value += ANSWER_GUARD_MS;
    expect(session.next()).toBe('advanced');

    const second = session.current();
    const correctOption = second.answers.find(
      (answer) => answer.id === second.card.correctAnswerId,
    )!;
    const feedback = session.answer(correctOption.id);
    expect(feedback?.isCorrect).toBe(true);
    clock.value += ANSWER_GUARD_MS;
    expect(session.next()).toBe('finished');
    expect(session.isFinished).toBe(true);

    const data = session.buildSession();
    expect(data.questionCount).toBe(2);
    expect(data.correctCount).toBe(1);
    expect(data.incorrectCount).toBe(1);
    expect(data.attempts).toHaveLength(2);
    expect(Date.parse(data.completedAt)).toBeGreaterThanOrEqual(Date.parse(data.startedAt));
  });

  it('refuses to build a session before it is finished', () => {
    const { session } = makeSession([makeCard(1)], 1);
    expect(() => session.buildSession()).toThrow();
  });

  it('cannot advance before answering', () => {
    const { session } = makeSession([makeCard(1)], 1);
    expect(session.next()).toBe('blocked');
  });
});
