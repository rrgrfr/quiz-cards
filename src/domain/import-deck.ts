import { LIMITS } from './limits';

export type ImportIssueCode =
  | 'syntax'
  | 'format'
  | 'version'
  | 'deck-missing'
  | 'title-required'
  | 'title-long'
  | 'description-long'
  | 'cards-count'
  | 'question-required'
  | 'question-long'
  | 'answers-count'
  | 'answer-required'
  | 'answer-long'
  | 'answer-duplicate'
  | 'correct-index'
  | 'explanation-long'
  | 'file-too-large';

export interface ImportIssue {
  code: ImportIssueCode;
  card?: number;
  field?: string;
}

export interface ImportedCard {
  question: string;
  answers: [string, string, string, string];
  correctIndex: number;
  explanation?: string;
}

export interface ImportedDeck {
  title: string;
  description?: string;
  cards: ImportedCard[];
}

export type ImportResult = { ok: true; value: ImportedDeck } | { ok: false; issues: ImportIssue[] };

const MAX_ISSUES = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

/**
 * Parse and validate the personal-quiz-deck v1 contract (D-040…D-049).
 * Any issue rejects the whole file; nothing is written by this function.
 */
export function parseDeckFile(raw: string): ImportResult {
  const issues: ImportIssue[] = [];
  const add = (issue: ImportIssue): void => {
    if (issues.length < MAX_ISSUES) issues.push(issue);
  };

  if (raw.length > LIMITS.importFileBytes) {
    return { ok: false, issues: [{ code: 'file-too-large' }] };
  }

  let root: unknown;
  try {
    root = JSON.parse(raw);
  } catch {
    return { ok: false, issues: [{ code: 'syntax' }] };
  }

  if (!isRecord(root)) return { ok: false, issues: [{ code: 'format' }] };
  if (root.format !== 'personal-quiz-deck') return { ok: false, issues: [{ code: 'format' }] };
  if (root.schemaVersion !== 1) return { ok: false, issues: [{ code: 'version' }] };

  const deckValue = root.deck;
  if (!isRecord(deckValue)) return { ok: false, issues: [{ code: 'deck-missing' }] };

  const title = asText(deckValue.title);
  if (title === null || title.length === 0) add({ code: 'title-required', field: 'title' });
  else if (title.length > LIMITS.deckTitle) add({ code: 'title-long', field: 'title' });

  const descriptionRaw = deckValue.description;
  let description: string | undefined;
  if (descriptionRaw !== undefined) {
    if (typeof descriptionRaw !== 'string') add({ code: 'description-long', field: 'description' });
    else {
      const trimmed = descriptionRaw.trim();
      if (trimmed.length > LIMITS.deckDescription) {
        add({ code: 'description-long', field: 'description' });
      } else if (trimmed.length > 0) {
        description = trimmed;
      }
    }
  }

  const cardsValue = deckValue.cards;
  if (!Array.isArray(cardsValue) || cardsValue.length === 0) {
    add({ code: 'cards-count', field: 'cards' });
    return { ok: false, issues };
  }
  if (cardsValue.length > LIMITS.cardsPerDeck) {
    add({ code: 'cards-count', field: 'cards' });
    return { ok: false, issues };
  }

  const cards: ImportedCard[] = [];

  for (const [index, cardValue] of cardsValue.entries()) {
    const cardNumber = index + 1;
    if (!isRecord(cardValue)) {
      add({ code: 'question-required', card: cardNumber, field: 'question' });
      continue;
    }

    const question = asText(cardValue.question);
    if (question === null || question.length === 0) {
      add({ code: 'question-required', card: cardNumber, field: 'question' });
    } else if (question.length > LIMITS.question) {
      add({ code: 'question-long', card: cardNumber, field: 'question' });
    }

    const answersValue = cardValue.answers;
    if (!Array.isArray(answersValue) || answersValue.length !== 4) {
      add({ code: 'answers-count', card: cardNumber, field: 'answers' });
      continue;
    }

    const answers: string[] = [];
    let answersValid = true;
    for (const answerValue of answersValue) {
      const answer = asText(answerValue);
      if (answer === null || answer.length === 0) {
        add({ code: 'answer-required', card: cardNumber, field: 'answers' });
        answersValid = false;
        continue;
      }
      if (answer.length > LIMITS.answer) {
        add({ code: 'answer-long', card: cardNumber, field: 'answers' });
        answersValid = false;
      }
      answers.push(answer);
    }

    if (answers.length === 4) {
      const normalized = new Set<string>();
      for (const answer of answers) {
        const key = answer.toLocaleLowerCase('ru-RU');
        if (normalized.has(key)) {
          add({ code: 'answer-duplicate', card: cardNumber, field: 'answers' });
          answersValid = false;
          break;
        }
        normalized.add(key);
      }
    }

    const correctIndex = cardValue.correctAnswerIndex;
    if (
      typeof correctIndex !== 'number' ||
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex > 3
    ) {
      add({ code: 'correct-index', card: cardNumber, field: 'correctAnswerIndex' });
    }

    const explanationRaw = cardValue.explanation;
    let explanation: string | undefined;
    if (explanationRaw !== undefined) {
      if (typeof explanationRaw !== 'string') {
        add({ code: 'explanation-long', card: cardNumber, field: 'explanation' });
      } else {
        const trimmed = explanationRaw.trim();
        if (trimmed.length > LIMITS.explanation) {
          add({ code: 'explanation-long', card: cardNumber, field: 'explanation' });
        } else if (trimmed.length > 0) {
          explanation = trimmed;
        }
      }
    }

    if (
      answersValid &&
      answers.length === 4 &&
      typeof correctIndex === 'number' &&
      Number.isInteger(correctIndex) &&
      correctIndex >= 0 &&
      correctIndex <= 3 &&
      question !== null &&
      question.length > 0 &&
      question.length <= LIMITS.question
    ) {
      cards.push({
        question,
        answers: answers as [string, string, string, string],
        correctIndex,
        ...(explanation ? { explanation } : {}),
      });
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    value: {
      title: title as string,
      ...(description ? { description } : {}),
      cards,
    },
  };
}
