import { describe, expect, it } from 'vitest';
import { validateCard, validateDeck } from '../../src/domain/validate';

describe('validateDeck', () => {
  it('accepts a trimmed title and drops an empty description', () => {
    const result = validateDeck({ title: '  HTTP  ', description: '   ' });
    expect(result).toEqual({ ok: true, value: { title: 'HTTP' } });
  });

  it('rejects an empty or whitespace-only title', () => {
    const result = validateDeck({ title: '   ', description: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.title?.code).toBe('required');
  });

  it('rejects a title longer than 120 characters', () => {
    const result = validateDeck({ title: 'a'.repeat(121), description: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.title).toEqual({ code: 'too-long', max: 120 });
  });

  it('rejects a description longer than 200 characters', () => {
    const result = validateDeck({ title: 'HTTP', description: 'b'.repeat(201) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.description).toEqual({ code: 'too-long', max: 200 });
  });
});

describe('validateCard', () => {
  const valid = {
    question: '  Что такое HTTP?  ',
    answers: ['Протокол', 'База данных', 'Язык', 'Формат'],
    correctIndex: 0,
    explanation: '  Прикладной протокол  ',
  };

  it('accepts a valid draft and trims text', () => {
    const result = validateCard(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.question).toBe('Что такое HTTP?');
      expect(result.value.answers[0]).toBe('Протокол');
      expect(result.value.correctIndex).toBe(0);
      expect(result.value.explanation).toBe('Прикладной протокол');
    }
  });

  it('requires exactly four answers', () => {
    const result = validateCard({ ...valid, answers: ['a', 'b', 'c'] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.answers?.code).toBe('answers-count');
  });

  it('rejects empty answers', () => {
    const result = validateCard({ ...valid, answers: ['a', '  ', 'c', 'd'] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors['answer-1']?.code).toBe('required');
  });

  it('rejects duplicates ignoring case and spaces', () => {
    const result = validateCard({ ...valid, answers: ['HTTP', ' http ', 'c', 'd'] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.answers?.code).toBe('duplicate');
  });

  it('requires a correct answer index between 0 and 3', () => {
    for (const correctIndex of [null, -1, 4, 1.5]) {
      const result = validateCard({ ...valid, correctIndex });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.correct?.code).toBe('correct-required');
    }
  });

  it('enforces answer and explanation length limits', () => {
    const longAnswer = validateCard({ ...valid, answers: ['a'.repeat(201), 'b', 'c', 'd'] });
    expect(longAnswer.ok).toBe(false);

    const longExplanation = validateCard({ ...valid, explanation: 'e'.repeat(1001) });
    expect(longExplanation.ok).toBe(false);
    if (!longExplanation.ok) {
      expect(longExplanation.errors.explanation).toEqual({ code: 'too-long', max: 1000 });
    }
  });
});
