import type { AppState } from '../domain/types';

export type LoadResult =
  | { status: 'ok'; state: AppState }
  | { status: 'corrupted'; raw: string }
  | { status: 'unsupported'; raw: string };

export type SaveError = 'quota' | 'unavailable';

export type SaveResult = { ok: true } | { ok: false; error: SaveError };

export interface StoragePort {
  load(): LoadResult;
  save(state: AppState): SaveResult;
  clear(): void;
}
