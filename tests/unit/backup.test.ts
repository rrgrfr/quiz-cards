import { describe, expect, it } from 'vitest';
import { createBackup, parseBackup } from '../../src/domain/backup';
import type { AppState, Card, Deck, StudySession } from '../../src/domain/types';

const deck: Deck = {
  id: 'deck-1',
  title: 'HTTP',
  description: 'Основы',
  isArchived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const card: Card = {
  id: 'card-1',
  deckId: 'deck-1',
  question: 'Что такое HTTP?',
  answers: [
    { id: 'a1', text: 'Протокол' },
    { id: 'a2', text: 'База' },
    { id: 'a3', text: 'Язык' },
    { id: 'a4', text: 'Формат' },
  ],
  correctAnswerId: 'a1',
  isArchived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const session: StudySession = {
  id: 'session-1',
  deckId: 'deck-1',
  questionCount: 1,
  correctCount: 1,
  incorrectCount: 0,
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T00:01:00.000Z',
  attempts: [
    {
      id: 'attempt-1',
      cardId: 'card-1',
      selectedAnswerId: 'a1',
      isCorrect: true,
      answeredAt: '2026-01-01T00:00:30.000Z',
    },
  ],
};

const state: AppState = {
  schemaVersion: 1,
  revision: 7,
  decks: [deck],
  cards: [card],
  sessions: [session],
  settings: {},
};

describe('createBackup', () => {
  it('serializes the full contract without revision', () => {
    const raw = createBackup(state, {
      appVersion: '0.1.0',
      exportedAt: '2026-11-13T12:00:00.000Z',
    });
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    expect(parsed.format).toBe('personal-quiz-backup');
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.appVersion).toBe('0.1.0');
    expect(parsed.exportedAt).toBe('2026-11-13T12:00:00.000Z');
    const data = parsed.data as Record<string, unknown>;
    expect(data.decks).toHaveLength(1);
    expect(data.cards).toHaveLength(1);
    expect(data.sessions).toHaveLength(1);
    expect('revision' in data).toBe(false);
  });

  it('round-trips through parseBackup', () => {
    const raw = createBackup(state, {
      appVersion: '0.1.0',
      exportedAt: '2026-11-13T12:00:00.000Z',
    });

    const result = parseBackup(raw);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.counts).toEqual({ decks: 1, cards: 1, sessions: 1 });
    expect(result.state.decks[0]?.id).toBe('deck-1');
    expect(result.state.cards[0]?.id).toBe('card-1');
    expect(result.state.sessions[0]?.id).toBe('session-1');
    expect(result.state.revision).toBe(0);
  });
});

describe('parseBackup', () => {
  it('rejects broken JSON, format and version', () => {
    expect(parseBackup('{oops')).toEqual({ ok: false, issues: [{ code: 'syntax' }] });
    expect(parseBackup(JSON.stringify({ format: 'other' }))).toEqual({
      ok: false,
      issues: [{ code: 'format' }],
    });
    expect(
      parseBackup(JSON.stringify({ format: 'personal-quiz-backup', schemaVersion: 2 })),
    ).toEqual({ ok: false, issues: [{ code: 'version' }] });
  });

  it('rejects a backup without data', () => {
    expect(
      parseBackup(JSON.stringify({ format: 'personal-quiz-backup', schemaVersion: 1 })),
    ).toEqual({ ok: false, issues: [{ code: 'data-missing' }] });
  });

  it('rejects a backup with broken references', () => {
    const raw = JSON.stringify({
      format: 'personal-quiz-backup',
      schemaVersion: 1,
      data: {
        decks: [deck],
        cards: [{ ...card, deckId: 'missing' }],
        sessions: [],
        settings: {},
      },
    });

    expect(parseBackup(raw)).toEqual({ ok: false, issues: [{ code: 'invalid-state' }] });
  });

  it('rejects a file larger than the state limit', () => {
    expect(parseBackup('x'.repeat(4.5 * 1024 * 1024 + 1))).toEqual({
      ok: false,
      issues: [{ code: 'file-too-large' }],
    });
  });
});
