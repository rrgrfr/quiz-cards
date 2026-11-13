export interface AnswerOption {
  id: string;
  text: string;
}

export interface Deck {
  id: string;
  title: string;
  description?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  deckId: string;
  question: string;
  answers: AnswerOption[];
  correctAnswerId: string;
  explanation?: string;
  isArchived: boolean;
  createdAt: string;
}

export interface Attempt {
  id: string;
  cardId: string;
  selectedAnswerId: string;
  isCorrect: boolean;
  answeredAt: string;
}

export interface StudySession {
  id: string;
  deckId: string;
  questionCount: number;
  correctCount: number;
  incorrectCount: number;
  startedAt: string;
  completedAt: string;
  attempts: Attempt[];
}

export interface AppState {
  schemaVersion: 1;
  revision: number;
  decks: Deck[];
  cards: Card[];
  sessions: StudySession[];
  settings: Record<string, never>;
}
