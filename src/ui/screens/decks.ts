import { activeCardsCount, activeDecks } from '../../domain/entities';
import type { Store } from '../../application/store';
import { STRINGS } from '../../shared/strings';
import { el } from '../dom';
import type { Navigation } from '../navigation';

export function renderDecks(store: Store, nav: Navigation): HTMLElement {
  const state = store.get();
  const decks = activeDecks(state);
  const screen = el('section', 'screen');

  const head = el('div', 'screen-head');
  const title = el('h2', 'screen-title');
  title.textContent = STRINGS.decks.title;
  const archiveLink = el('button', 'link-button');
  archiveLink.type = 'button';
  archiveLink.textContent = STRINGS.decks.archiveLink;
  archiveLink.addEventListener('click', () => {
    nav.push({ name: 'archive' });
  });
  head.append(title, archiveLink);
  screen.append(head);

  const create = el('button', 'primary-button');
  create.type = 'button';
  create.textContent = STRINGS.decks.create;
  create.addEventListener('click', () => {
    nav.push({ name: 'create-deck' });
  });

  if (decks.length === 0) {
    const empty = el('div', 'empty-state');
    const emptyTitle = el('p', 'empty-title');
    emptyTitle.textContent = STRINGS.decks.emptyTitle;
    const emptyText = el('p', 'empty-text');
    emptyText.textContent = STRINGS.decks.emptyText;
    empty.append(emptyTitle, emptyText, create);
    screen.append(empty);
    return screen;
  }

  const list = el('div', 'deck-list');
  for (const deck of decks) {
    const item = el('button', 'deck-card');
    item.type = 'button';

    const name = el('span', 'deck-card-title');
    name.textContent = deck.title;
    const meta = el('span', 'deck-card-meta');
    meta.textContent = STRINGS.decks.cardsCount(activeCardsCount(state, deck.id));
    item.append(name, meta);

    if (deck.description) {
      const description = el('span', 'deck-card-text');
      description.textContent = deck.description;
      item.append(description);
    }

    item.addEventListener('click', () => {
      nav.push({ name: 'deck', deckId: deck.id });
    });
    list.append(item);
  }

  screen.append(list, create);
  return screen;
}
