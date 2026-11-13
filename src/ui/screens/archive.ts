import type { Store } from '../../application/store';
import { activeCardsCount, archivedCards, archivedDecks, findDeck } from '../../domain/entities';
import { STRINGS } from '../../shared/strings';
import { el } from '../dom';
import { describeStoreError } from '../messages';
import type { Navigation } from '../navigation';
import { showToast } from '../toast';

export function renderArchive(store: Store, _nav: Navigation): HTMLElement {
  const state = store.get();
  const decks = archivedDecks(state);
  const cards = archivedCards(state);

  const screen = el('section', 'screen');

  const title = el('h2', 'screen-title');
  title.textContent = STRINGS.archive.title;
  screen.append(title);

  const decksTitle = el('h3', 'section-title');
  decksTitle.textContent = STRINGS.archive.decks;
  screen.append(decksTitle);

  if (decks.length === 0) {
    const empty = el('p', 'screen-note');
    empty.textContent = STRINGS.archive.emptyDecks;
    screen.append(empty);
  } else {
    const list = el('div', 'card-list');
    for (const deck of decks) {
      const row = el('div', 'card-row');
      const text = el('span', 'card-row-title');
      text.textContent = deck.title;
      const meta = el('span', 'card-row-meta');
      meta.textContent = STRINGS.decks.cardsCount(activeCardsCount(state, deck.id));
      const restore = el('button', 'link-button');
      restore.type = 'button';
      restore.textContent = STRINGS.common.restore;
      restore.addEventListener('click', () => {
        const result = store.setDeckArchived(deck.id, false);
        if (!result.ok) showToast(describeStoreError(result.error));
      });
      row.append(text, meta, restore);
      list.append(row);
    }
    screen.append(list);
  }

  const cardsTitle = el('h3', 'section-title');
  cardsTitle.textContent = STRINGS.archive.cards;
  screen.append(cardsTitle);

  if (cards.length === 0) {
    const empty = el('p', 'screen-note');
    empty.textContent = STRINGS.archive.emptyCards;
    screen.append(empty);
  } else {
    const list = el('div', 'card-list');
    for (const card of cards) {
      const deck = findDeck(state, card.deckId);
      const row = el('div', 'card-row');
      const text = el('span', 'card-row-title');
      text.textContent = card.question;
      const meta = el('span', 'card-row-meta');
      meta.textContent = deck ? deck.title : '';
      const restore = el('button', 'link-button');
      restore.type = 'button';
      restore.textContent = STRINGS.common.restore;
      restore.addEventListener('click', () => {
        const result = store.setCardArchived(card.id, false);
        if (!result.ok) showToast(describeStoreError(result.error));
      });
      row.append(text, meta, restore);
      list.append(row);
    }
    screen.append(list);
  }

  return screen;
}
