import { LIMITS } from './limits';
import type {
  CardDraft,
  CardValue,
  DeckDraft,
  DeckValue,
  FieldErrors,
  Validation,
} from './validation-types';

export type {
  CardDraft,
  CardValue,
  DeckDraft,
  DeckValue,
  FieldError,
  FieldErrors,
  Validation,
} from './validation-types';

const trim = (value: string): string => value.trim();

export function validateDeck(draft: DeckDraft): Validation<DeckValue> {
  const errors: FieldErrors = {};
  const title = trim(draft.title);
  if (title.length === 0) errors.title = { code: 'required' };
  else if (title.length > LIMITS.deckTitle)
    errors.title = { code: 'too-long', max: LIMITS.deckTitle };

  const description = trim(draft.description);
  if (description.length > LIMITS.deckDescription) {
    errors.description = { code: 'too-long', max: LIMITS.deckDescription };
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: description ? { title, description } : { title } };
}

export function validateCard(draft: CardDraft): Validation<CardValue> {
  const errors: FieldErrors = {};

  const question = trim(draft.question);
  if (question.length === 0) errors.question = { code: 'required' };
  else if (question.length > LIMITS.question) {
    errors.question = { code: 'too-long', max: LIMITS.question };
  }

  if (draft.answers.length !== 4) {
    errors.answers = { code: 'answers-count' };
  }

  const answers = draft.answers.map(trim);
  answers.forEach((answer, index) => {
    if (answer.length === 0) errors[`answer-${index}`] = { code: 'required' };
    else if (answer.length > LIMITS.answer) {
      errors[`answer-${index}`] = { code: 'too-long', max: LIMITS.answer };
    }
  });

  if (answers.length === 4) {
    const seen = new Set<string>();
    let duplicate = false;
    for (const answer of answers) {
      const normalized = answer.toLocaleLowerCase('ru-RU');
      if (normalized.length > 0) {
        if (seen.has(normalized)) duplicate = true;
        seen.add(normalized);
      }
    }
    if (duplicate) errors.answers = { code: 'duplicate' };
  }

  const explanation = trim(draft.explanation);
  if (explanation.length > LIMITS.explanation) {
    errors.explanation = { code: 'too-long', max: LIMITS.explanation };
  }

  const correct = draft.correctIndex;
  if (correct === null || !Number.isInteger(correct) || correct < 0 || correct > 3) {
    errors.correct = { code: 'correct-required' };
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      question,
      answers: answers as [string, string, string, string],
      correctIndex: correct as number,
      ...(explanation ? { explanation } : {}),
    },
  };
}
