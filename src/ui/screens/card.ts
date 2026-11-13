import type { Store } from '../../application/store';
import { findCard, findDeck } from '../../domain/entities';
import { cardHistory } from '../../domain/stats';
import { formatDateTime } from '../../shared/format';
import { STRINGS } from '../../shared/strings';
import { el } from '../dom';
import { describeStoreError } from '../messages';
import type { Navigation } from '../navigation';
import { showToast } from '../toast';
import { renderMessageScreen } from './message';

export function renderCard(store: Store, nav: Navigation, cardId: string): HTMLElement {
  const state = store.get();
  const card = findCard(state, cardId);
  if (!card) return renderMessageScreen(STRINGS.card.notFound, STRINGS.card.notFoundText);

  const deck = findDeck(state, card.deckId);

  const screen = el('section', 'screen');

  const title = el('h2', 'screen-title');
  title.textContent = card.question;
  screen.append(title);

  if (deck) {
    const deckName = el('p', 'screen-note');
    deckName.textContent = deck.title;
    screen.append(deckName);
  }

  if (card.isArchived) {
    const notice = el('p', 'notice');
    notice.textContent = STRINGS.card.archivedNotice;
    screen.append(notice);
  }

  const answers = el('ul', 'answer-list');
  for (const answer of card.answers) {
    const item = el('li', 'answer-item');
    const text = el('span', 'answer-text');
    text.textContent = answer.text;
    item.append(text);

    if (answer.id === card.correctAnswerId) {
      item.classList.add('is-correct');
      const badge = el('span', 'answer-badge');
      badge.textContent = STRINGS.card.correct;
      item.append(badge);
    }
    answers.append(item);
  }
  screen.append(answers);

  if (card.explanation) {
    const explanationTitle = el('h3', 'section-title');
    explanationTitle.textContent = STRINGS.card.explanation;
    const explanation = el('p', 'screen-note');
    explanation.textContent = card.explanation;
    screen.append(explanationTitle, explanation);
  }

  const historyTitle = el('h3', 'section-title');
  historyTitle.textContent = STRINGS.card.history;
  screen.append(historyTitle);

  const history = cardHistory(state.sessions, card.id);
  if (history.attempts.length === 0) {
    const empty = el('p', 'screen-note');
    empty.textContent = STRINGS.card.historyEmpty;
    screen.append(empty);
  } else {
    const list = el('ul', 'history-list');
    for (const attempt of history.attempts) {
      const row = el('li', 'history-row');
      const date = el('span', 'history-date');
      date.textContent = formatDateTime(attempt.answeredAt);
      const result = el('span', 'history-result');
      result.textContent = attempt.isCorrect ? STRINGS.test.correct : STRINGS.test.wrong;
      result.classList.add(attempt.isCorrect ? 'is-correct' : 'is-wrong');
      row.append(date, result);
      list.append(row);
    }

    const total = history.correct + history.incorrect;
    const totals = el('p', 'screen-note');
    totals.textContent = STRINGS.card.historyTotals(history.correct, total, history.percent);
    screen.append(list, totals);
  }

  const actions = el('div', 'inline-actions');
  const toggle = el('button', 'secondary-button');
  toggle.type = 'button';
  toggle.textContent = card.isArchived ? STRINGS.card.restore : STRINGS.card.archive;
  toggle.addEventListener('click', () => {
    const result = store.setCardArchived(card.id, !card.isArchived);
    if (!result.ok) {
      showToast(describeStoreError(result.error));
      return;
    }
    showToast(card.isArchived ? STRINGS.deck.restoreNotice : STRINGS.card.archivedNotice);
    if (!card.isArchived) nav.back();
  });
  actions.append(toggle);
  screen.append(actions);

  return screen;
}
