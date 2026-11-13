export type FieldError =
  | { code: 'required' }
  | { code: 'too-long'; max: number }
  | { code: 'answers-count' }
  | { code: 'duplicate' }
  | { code: 'correct-required' };

export type FieldErrors = Record<string, FieldError>;

export interface DeckDraft {
  title: string;
  description: string;
}

export interface DeckValue {
  title: string;
  description?: string;
}

export interface CardDraft {
  question: string;
  answers: string[];
  correctIndex: number | null;
  explanation: string;
}

export interface CardValue {
  question: string;
  answers: [string, string, string, string];
  correctIndex: number;
  explanation?: string;
}

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };
