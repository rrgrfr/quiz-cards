import { describe, expect, it } from 'vitest';
import { parseDeckFile } from '../../src/domain/import-deck';

function deckFile(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    format: 'personal-quiz-deck',
    schemaVersion: 1,
    deck: {
      title: 'HTTP',
      description: 'Основы',
      cards: [
        {
          question: 'Что такое HTTP?',
          answers: ['Протокол', 'База', 'Язык', 'Формат'],
          correctAnswerIndex: 0,
          explanation: 'Прикладной протокол',
        },
      ],
      ...overrides,
    },
  });
}

function cardFile(card: Record<string, unknown>): string {
  return JSON.stringify({
    format: 'personal-quiz-deck',
    schemaVersion: 1,
    deck: { title: 'HTTP', cards: [card] },
  });
}

function issueCodes(raw: string): string[] {
  const result = parseDeckFile(raw);
  return result.ok ? [] : result.issues.map((issue) => issue.code);
}

describe('parseDeckFile', () => {
  it('accepts a valid deck and trims text', () => {
    const result = parseDeckFile(deckFile({ title: '  HTTP  ', description: '  Основы  ' }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.title).toBe('HTTP');
    expect(result.value.description).toBe('Основы');
    expect(result.value.cards).toHaveLength(1);
    expect(result.value.cards[0]?.correctIndex).toBe(0);
    expect(result.value.cards[0]?.answers[0]).toBe('Протокол');
  });

  it('ignores unknown fields', () => {
    const raw = deckFile({ extra: true });
    const result = parseDeckFile(raw);
    expect(result.ok).toBe(true);
  });

  it('rejects broken JSON, wrong format and version', () => {
    expect(issueCodes('{oops')).toEqual(['syntax']);
    expect(issueCodes(JSON.stringify({ format: 'other', schemaVersion: 1 }))).toEqual(['format']);
    expect(issueCodes(deckFile()).length).toBe(0);
    expect(issueCodes(JSON.stringify({ format: 'personal-quiz-deck', schemaVersion: 2 }))).toEqual([
      'version',
    ]);
  });

  it('rejects a missing deck and empty cards', () => {
    expect(issueCodes(JSON.stringify({ format: 'personal-quiz-deck', schemaVersion: 1 }))).toEqual([
      'deck-missing',
    ]);
    expect(issueCodes(deckFile({ cards: [] }))).toEqual(['cards-count']);
  });

  it('rejects a title that is empty or too long', () => {
    expect(issueCodes(deckFile({ title: '   ' }))).toEqual(['title-required']);
    expect(issueCodes(deckFile({ title: 'a'.repeat(121) }))).toEqual(['title-long']);
  });

  it('rejects an empty question and invalid answer sets', () => {
    expect(
      issueCodes(
        cardFile({
          question: '',
          answers: ['a', 'b', 'c', 'd'],
          correctAnswerIndex: 0,
        }),
      ),
    ).toContain('question-required');

    expect(
      issueCodes(
        cardFile({
          question: 'Q',
          answers: ['a', 'b', 'c'],
          correctAnswerIndex: 0,
        }),
      ),
    ).toContain('answers-count');

    expect(
      issueCodes(
        cardFile({
          question: 'Q',
          answers: ['a', 'b', 'c', 'd', 'e'],
          correctAnswerIndex: 0,
        }),
      ),
    ).toContain('answers-count');
  });

  it('rejects empty, duplicate and overlong answers', () => {
    expect(
      issueCodes(cardFile({ question: 'Q', answers: ['a', ' ', 'c', 'd'], correctAnswerIndex: 0 })),
    ).toContain('answer-required');

    expect(
      issueCodes(cardFile({ question: 'Q', answers: ['a', 'A', 'c', 'd'], correctAnswerIndex: 0 })),
    ).toContain('answer-duplicate');

    expect(
      issueCodes(
        cardFile({
          question: 'Q',
          answers: ['a'.repeat(201), 'b', 'c', 'd'],
          correctAnswerIndex: 0,
        }),
      ),
    ).toContain('answer-long');
  });

  it('rejects an invalid correctAnswerIndex', () => {
    for (const index of ['1', -1, 4, 1.5, null]) {
      expect(
        issueCodes(
          cardFile({ question: 'Q', answers: ['a', 'b', 'c', 'd'], correctAnswerIndex: index }),
        ),
      ).toContain('correct-index');
    }
  });

  it('reports the card number and keeps all issues', () => {
    const raw = JSON.stringify({
      format: 'personal-quiz-deck',
      schemaVersion: 1,
      deck: {
        title: 'HTTP',
        cards: [
          { question: '', answers: ['a', 'b', 'c', 'd'], correctAnswerIndex: 0 },
          { question: 'Q2', answers: ['a', 'b', 'c', 'd'], correctAnswerIndex: 9 },
        ],
      },
    });

    const result = parseDeckFile(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => [issue.card, issue.code])).toEqual([
      [1, 'question-required'],
      [2, 'correct-index'],
    ]);
  });

  it('rejects a file larger than 2 MB', () => {
    expect(issueCodes('x'.repeat(2 * 1024 * 1024 + 1))).toEqual(['file-too-large']);
  });
});
