import { LIMITS } from './limits';
import { validateState } from './state';
import type { AppState } from './types';

export type BackupIssueCode =
  'syntax' | 'format' | 'version' | 'data-missing' | 'invalid-state' | 'file-too-large';

export interface BackupIssue {
  code: BackupIssueCode;
}

export interface BackupCounts {
  decks: number;
  cards: number;
  sessions: number;
}

export type BackupParseResult =
  { ok: true; state: AppState; counts: BackupCounts } | { ok: false; issues: BackupIssue[] };

export interface BackupOptions {
  appVersion: string;
  exportedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Serialize the complete backup (D-050, D-051). */
export function createBackup(state: AppState, options: BackupOptions): string {
  return JSON.stringify(
    {
      format: 'personal-quiz-backup',
      schemaVersion: 1,
      appVersion: options.appVersion,
      exportedAt: options.exportedAt,
      data: {
        decks: state.decks,
        cards: state.cards,
        sessions: state.sessions,
        settings: state.settings,
      },
    },
    null,
    2,
  );
}

/**
 * Parse and fully validate a backup before any replacement (D-052, D-054).
 * The returned state keeps the restored ids and timestamps.
 */
export function parseBackup(raw: string): BackupParseResult {
  if (raw.length > LIMITS.stateBytes) return { ok: false, issues: [{ code: 'file-too-large' }] };

  let root: unknown;
  try {
    root = JSON.parse(raw);
  } catch {
    return { ok: false, issues: [{ code: 'syntax' }] };
  }

  if (!isRecord(root)) return { ok: false, issues: [{ code: 'format' }] };
  if (root.format !== 'personal-quiz-backup') return { ok: false, issues: [{ code: 'format' }] };
  if (root.schemaVersion !== 1) return { ok: false, issues: [{ code: 'version' }] };

  const data = root.data;
  if (!isRecord(data)) return { ok: false, issues: [{ code: 'data-missing' }] };

  const candidate: AppState = {
    schemaVersion: 1,
    revision: 0,
    decks: data.decks as AppState['decks'],
    cards: data.cards as AppState['cards'],
    sessions: data.sessions as AppState['sessions'],
    settings: data.settings as AppState['settings'],
  };

  const validation = validateState(candidate);
  if (!validation.ok) return { ok: false, issues: [{ code: 'invalid-state' }] };

  const state = validation.state;
  return {
    ok: true,
    state,
    counts: {
      decks: state.decks.length,
      cards: state.cards.length,
      sessions: state.sessions.length,
    },
  };
}
