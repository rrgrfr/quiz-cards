import { addReadyDeck } from '../../application/ready-decks';
import type { Store } from '../../application/store';
import type { Deck } from '../../domain/types';
import { loadReadyDeck } from '../../infrastructure/ready-decks';
import { READY_DECKS, type ReadyDeck } from '../../shared/ready-decks';
import { STRINGS } from '../../shared/strings';
import { el } from '../dom';
import { describeStoreError } from '../messages';
import type { Navigation } from '../navigation';
import { showToast } from '../toast';

async function addDeck(
  store: Store,
  nav: Navigation,
  deck: ReadyDeck,
  button: HTMLButtonElement,
): Promise<void> {
  button.disabled = true;
  button.textContent = STRINGS.readyDecks.adding;

  const result = await addReadyDeck(store, deck, loadReadyDeck);

  if (!result.ok) {
    button.disabled = false;
    button.textContent = STRINGS.readyDecks.add;
    if (result.error === 'already-added') showToast(STRINGS.readyDecks.exists);
    else if (result.error === 'load-failed') showToast(STRINGS.readyDecks.loadFailed);
    else if (result.error === 'invalid-deck') showToast(STRINGS.readyDecks.invalid);
    else showToast(describeStoreError(result.error));
    return;
  }

  showToast(STRINGS.readyDecks.success(result.value.title));
  nav.resume({ name: 'deck', deckId: result.value.id });
}

function renderReadyCard(
  store: Store,
  nav: Navigation,
  deck: ReadyDeck,
  existing: Deck | undefined,
): HTMLElement {
  const card = el('div', 'ready-card');

  const name = el('h3', 'ready-title');
  name.textContent = deck.title;
  const description = el('p', 'ready-text');
  description.textContent = deck.description;
  const meta = el('p', 'ready-meta');
  meta.textContent = STRINGS.decks.cardsCount(deck.cards);
  card.append(name, description, meta);

  if (existing && !existing.isArchived) {
    const status = el('p', 'ready-status');
    status.textContent = STRINGS.readyDecks.added;
    const open = el('button', 'secondary-button');
    open.type = 'button';
    open.textContent = STRINGS.readyDecks.open;
    open.addEventListener('click', () => {
      nav.push({ name: 'deck', deckId: existing.id });
    });
    card.append(status, open);
    return card;
  }

  if (existing && existing.isArchived) {
    const status = el('p', 'ready-status');
    status.textContent = STRINGS.readyDecks.archived;
    const archive = el('button', 'secondary-button');
    archive.type = 'button';
    archive.textContent = STRINGS.readyDecks.openArchive;
    archive.addEventListener('click', () => {
      nav.push({ name: 'archive' });
    });
    card.append(status, archive);
    return card;
  }

  const add = el('button', 'primary-button');
  add.type = 'button';
  add.textContent = STRINGS.readyDecks.add;
  add.addEventListener('click', () => {
    void addDeck(store, nav, deck, add);
  });
  card.append(add);
  return card;
}

export function renderReadyDecks(store: Store, nav: Navigation): HTMLElement {
  const state = store.get();
  const screen = el('section', 'screen');

  const title = el('h2', 'screen-title');
  title.textContent = STRINGS.readyDecks.title;

  const lead = el('p', 'screen-note');
  lead.textContent = STRINGS.readyDecks.lead;

  const list = el('div', 'deck-list');
  for (const deck of READY_DECKS) {
    const existing = state.decks.find((item) => item.title === deck.title);
    list.append(renderReadyCard(store, nav, deck, existing));
  }

  screen.append(title, lead, list);
  return screen;
}
