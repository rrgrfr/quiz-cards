import { LIMITS } from '../domain/limits';
import { createEmptyState, validateState } from '../domain/state';
import type { AppState } from '../domain/types';
import { STATE_KEY } from '../shared/config';
import type { LoadResult, SaveResult, StoragePort } from '../application/ports';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createLocalStorageAdapter(storage: Storage): StoragePort {
  return {
    load(): LoadResult {
      const raw = storage.getItem(STATE_KEY);
      if (raw === null) return { status: 'ok', state: createEmptyState() };

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { status: 'corrupted', raw };
      }

      if (!isRecord(parsed) || parsed.schemaVersion !== 1) {
        return { status: 'unsupported', raw };
      }

      const validation = validateState(parsed);
      if (!validation.ok) return { status: 'corrupted', raw };
      return { status: 'ok', state: validation.state };
    },

    save(state: AppState): SaveResult {
      let serialized: string;
      try {
        serialized = JSON.stringify(state);
      } catch {
        return { ok: false, error: 'unavailable' };
      }

      // Guard before writing: Safari quota is about 5 MB (D-032).
      if (serialized.length > LIMITS.stateBytes) return { ok: false, error: 'quota' };

      try {
        storage.setItem(STATE_KEY, serialized);
        return { ok: true };
      } catch {
        return { ok: false, error: 'quota' };
      }
    },

    clear(): void {
      storage.removeItem(STATE_KEY);
    },
  };
}
