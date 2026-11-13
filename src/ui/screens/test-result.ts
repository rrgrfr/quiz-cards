import { percent } from '../../domain/sessions';
import { STRINGS } from '../../shared/strings';
import { el } from '../dom';
import type { Navigation } from '../navigation';
import { clearExitGuard } from '../navigation-guard';

export interface TestResultData {
  deckId: string;
  count: number;
  correct: number;
  total: number;
}

export function renderTestResult(nav: Navigation, data: TestResultData): HTMLElement {
  clearExitGuard();

  const screen = el('section', 'screen');

  const title = el('h2', 'screen-title');
  title.textContent = STRINGS.result.title;

  const stats = el('ul', 'result-list');
  const incorrect = Math.max(0, data.total - data.correct);
  const percentValue = percent(data.correct, data.total);

  const rows: Array<[string, string]> = [
    [STRINGS.result.correct, String(data.correct)],
    [STRINGS.result.incorrect, String(incorrect)],
    [STRINGS.result.percent, percentValue === null ? '—' : `${percentValue}%`],
  ];

  for (const [label, value] of rows) {
    const row = el('li', 'result-row');
    const labelNode = el('span', 'result-label');
    labelNode.textContent = label;
    const valueNode = el('span', 'result-value');
    valueNode.textContent = value;
    row.append(labelNode, valueNode);
    stats.append(row);
  }

  const actions = el('div', 'inline-actions');

  const toDeck = el('button', 'primary-button');
  toDeck.type = 'button';
  toDeck.textContent = STRINGS.result.toDeck;
  toDeck.addEventListener('click', () => {
    nav.resume({ name: 'deck', deckId: data.deckId });
  });

  const again = el('button', 'secondary-button');
  again.type = 'button';
  again.textContent = STRINGS.result.again;
  again.addEventListener('click', () => {
    nav.resume({ name: 'test', deckId: data.deckId, count: data.count });
  });

  actions.append(toDeck, again);
  screen.append(title, stats, actions);
  return screen;
}
