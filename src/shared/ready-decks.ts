export interface ReadyDeck {
  title: string;
  description: string;
  cards: number;
  file: string;
}

/** Ready-made decks shipped with the app; adding them is always explicit (D-138). */
export const READY_DECKS: readonly ReadyDeck[] = [
  {
    title: 'QA: DevTools, SQL, Postman, HTTP, Kafka, интеграции, Java и тест-дизайн',
    description:
      'Набор карточек по практическим темам QA: DevTools, SQL/PostgreSQL, Postman, HTTP-статусы, Kafka, интеграционное тестирование, логи, Java-автотесты и тест-дизайн.',
    cards: 239,
    file: 'decks/qa-core-239.json',
  },
];
