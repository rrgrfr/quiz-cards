import type { StoreError } from '../application/store';
import type { BackupIssueCode } from '../domain/backup';
import type { ImportIssueCode } from '../domain/import-deck';
import type { FieldError } from '../domain/validate';
import { STRINGS } from '../shared/strings';

export function describeIssue(code: ImportIssueCode | BackupIssueCode): string {
  return STRINGS.issues[code] ?? code;
}

export function describeFieldError(error: FieldError): string {
  switch (error.code) {
    case 'required':
      return STRINGS.errors.required;
    case 'too-long':
      return STRINGS.errors.tooLong(error.max);
    case 'answers-count':
      return STRINGS.errors.answersCount;
    case 'duplicate':
      return STRINGS.errors.duplicate;
    case 'correct-required':
      return STRINGS.errors.correctRequired;
  }
}

export function describeStoreError(error: StoreError): string {
  switch (error) {
    case 'deck-not-found':
      return STRINGS.errors.deckNotFound;
    case 'card-not-found':
      return STRINGS.errors.cardNotFound;
    case 'deck-full':
      return STRINGS.errors.deckFull;
    case 'limit-exceeded':
      return STRINGS.issues['limit-exceeded'];
    case 'save-quota':
      return STRINGS.errors.saveQuota;
    case 'save-failed':
      return STRINGS.errors.saveFailed;
    case 'invalid-state':
      return STRINGS.errors.invalidState;
  }
}
