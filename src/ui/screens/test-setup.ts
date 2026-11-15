import type { Store } from '../../application/store';
import { findDeck } from '../../domain/entities';
import { initialTestCount } from '../../domain/test-count';
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

  let count = initialTestCount(available.length);

  const screen = el('section', 'screen');
  const title = el('h2', 'screen-title');
  title.textContent = STRINGS.test.setupTitle;

  const hint = el('p', 'screen-note');
  hint.id = 'count-hint';
  hint.textContent = STRINGS.test.countHint(available.length);

  const countTitle = el('h3', 'section-title');
  countTitle.id = 'count-title';
  countTitle.textContent = STRINGS.test.countTitle;

  const value = el('output', 'count-value');
  value.setAttribute('for', 'count-slider');

  const slider = el('input', 'count-slider');
  slider.type = 'range';
  slider.id = 'count-slider';
  slider.min = '1';
  slider.max = String(available.length);
  slider.step = '1';
  slider.value = String(count);
  slider.disabled = available.length === 1;
  slider.setAttribute('aria-labelledby', 'count-title');
  slider.setAttribute('aria-describedby', 'count-hint');

  const start = el('button', 'primary-button');
  start.type = 'button';
  start.textContent = STRINGS.test.start;

  const update = (): void => {
    value.textContent = String(count);
  };

  slider.addEventListener('input', () => {
    count = Number(slider.value);
    update();
  });

  start.addEventListener('click', () => {
    nav.push({ name: 'test', deckId, count });
  });

  update();
  screen.append(title, hint, countTitle, value, slider, start);
  return screen;
}
