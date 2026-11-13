import type { Store } from '../../application/store';
import { findDeck } from '../../domain/entities';
import { STRINGS } from '../../shared/strings';
import { el } from '../dom';
import type { Navigation } from '../navigation';
import { renderMessageScreen } from './message';

export function renderTestSetup(store: Store, nav: Navigation, deckId: string): HTMLElement {
  const state = store.get();
  const deck = findDeck(state, deckId);
  const available = state.cards.filter((card) => card.deckId === deckId && !card.isArchived);

  if (!deck || deck.isArchived || available.length === 0) {
    return renderMessageScreen(STRINGS.test.setupTitle, STRINGS.test.noCards);
  }

  let count = Math.min(10, available.length);

  const screen = el('section', 'screen');
  const title = el('h2', 'screen-title');
  title.textContent = STRINGS.test.setupTitle;

  const hint = el('p', 'screen-note');
  hint.textContent = STRINGS.test.countHint(available.length);

  const countTitle = el('h3', 'section-title');
  countTitle.textContent = STRINGS.test.countTitle;

  const stepper = el('div', 'stepper');
  const minus = el('button', 'stepper-button');
  minus.type = 'button';
  minus.textContent = '−';
  minus.setAttribute('aria-label', 'Меньше вопросов');

  const value = el('output', 'stepper-value');
  value.setAttribute('aria-live', 'polite');

  const plus = el('button', 'stepper-button');
  plus.type = 'button';
  plus.textContent = '+';
  plus.setAttribute('aria-label', 'Больше вопросов');

  stepper.append(minus, value, plus);

  const start = el('button', 'primary-button');
  start.type = 'button';
  start.textContent = STRINGS.test.start;

  const update = (): void => {
    value.textContent = String(count);
    minus.disabled = count <= 1;
    plus.disabled = count >= available.length;
  };

  minus.addEventListener('click', () => {
    count = Math.max(1, count - 1);
    update();
  });
  plus.addEventListener('click', () => {
    count = Math.min(available.length, count + 1);
    update();
  });
  start.addEventListener('click', () => {
    nav.push({ name: 'test', deckId, count });
  });

  update();
  screen.append(title, hint, countTitle, stepper, start);
  return screen;
}
