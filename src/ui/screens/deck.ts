import type { Store } from '../../application/store';
import { activeCardsCount, cardsOf, findDeck } from '../../domain/entities';
import { STRINGS } from '../../shared/strings';
import { el } from '../dom';
import { describeStoreError } from '../messages';
import type { Navigation } from '../navigation';
import { showToast } from '../toast';
import { renderMessageScreen } from './message';

export function renderDeck(store: Store, nav: Navigation, deckId: string): HTMLElement {
  const state = store.get();
  const deck = findDeck(state, deckId);
  if (!deck) return renderMessageScreen(STRINGS.deck.notFound, STRINGS.deck.notFoundText);

  const cards = cardsOf(state, deckId);
  const active = cards.filter((card) => !card.isArchived);
  const archived = cards.filter((card) => card.isArchived);

  const screen = el('section', 'screen');

  const title = el('h2', 'screen-title');
  title.textContent = deck.title;
  const meta = el('p', 'screen-note');
  meta.textContent = STRINGS.decks.cardsCount(activeCardsCount(state, deckId));
  screen.append(title, meta);

  if (deck.description) {
    const description = el('p', 'screen-note');
    description.textContent = deck.description;
    screen.append(description);
  }

  if (deck.isArchived) {
    const notice = el('p', 'notice');
    notice.textContent = STRINGS.deck.archivedNotice;
    screen.append(notice);
  }

  const actions = el('div', 'inline-actions');

  const start = el('button', 'primary-button');
  start.type = 'button';
  start.textContent = STRINGS.deck.startTest;
  start.disabled = deck.isArchived || active.length === 0;
  if (deck.isArchived) start.title = STRINGS.deck.archivedNotice;
  else if (active.length === 0) start.title = STRINGS.test.noCards;
  start.addEventListener('click', () => {
    nav.push({ name: 'test-setup', deckId });
  });

  if (!deck.isArchived) {
    const addCard = el('button', 'secondary-button');
    addCard.type = 'button';
    addCard.textContent = STRINGS.deck.addCard;
    addCard.addEventListener('click', () => {
      nav.push({ name: 'create-card', deckId });
    });
    actions.append(start, addCard);
  } else {
    actions.append(start);
  }

  const archiveDeck = el('button', 'secondary-button');
  archiveDeck.type = 'button';
  archiveDeck.textContent = deck.isArchived ? STRINGS.deck.restoreDeck : STRINGS.deck.archiveDeck;
  archiveDeck.addEventListener('click', () => {
    const nextArchived = !deck.isArchived;
    const result = store.setDeckArchived(deckId, nextArchived);
    if (!result.ok) {
      showToast(describeStoreError(result.error));
      return;
    }
    showToast(nextArchived ? STRINGS.deck.archiveNotice : STRINGS.deck.restoreNotice);
    if (nextArchived) nav.back();
  });
  actions.append(archiveDeck);
  screen.append(actions);

  const cardsTitle = el('h3', 'section-title');
  cardsTitle.textContent = STRINGS.deck.cardsTitle;
  screen.append(cardsTitle);

  if (active.length === 0) {
    const empty = el('div', 'empty-state');
    const emptyTitle = el('p', 'empty-title');
    emptyTitle.textContent = STRINGS.deck.emptyTitle;
    const emptyText = el('p', 'empty-text');
    emptyText.textContent = STRINGS.deck.emptyText;
    empty.append(emptyTitle, emptyText);
    screen.append(empty);
  } else {
    const list = el('div', 'card-list');
    for (const card of active) {
      const row = el('button', 'card-row');
      row.type = 'button';
      const text = el('span', 'card-row-title');
      text.textContent = card.question;
      row.append(text);
      row.addEventListener('click', () => {
        nav.push({ name: 'card', cardId: card.id });
      });
      list.append(row);
    }
    screen.append(list);
  }

  if (archived.length > 0) {
    const archivedTitle = el('h3', 'section-title');
    archivedTitle.textContent = STRINGS.deck.archivedCards;
    screen.append(archivedTitle);

    const archivedList = el('div', 'card-list');
    for (const card of archived) {
      const row = el('div', 'card-row');
      const text = el('span', 'card-row-title');
      text.textContent = card.question;
      const restore = el('button', 'link-button');
      restore.type = 'button';
      restore.textContent = STRINGS.common.restore;
      restore.addEventListener('click', () => {
        const result = store.setCardArchived(card.id, false);
        if (!result.ok) showToast(describeStoreError(result.error));
      });
      row.append(text, restore);
      archivedList.append(row);
    }
    screen.append(archivedList);
  }

  return screen;
}
