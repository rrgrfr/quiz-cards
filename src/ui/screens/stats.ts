import type { Store } from '../../application/store';
import { activeDecks } from '../../domain/entities';
import { summarize, summarizeDeck } from '../../domain/stats';
import { STRINGS } from '../../shared/strings';
import { el } from '../dom';
import type { Navigation } from '../navigation';

function statCard(label: string, value: string): HTMLElement {
  const card = el('div', 'stat-card');
  const valueNode = el('span', 'stat-value');
  valueNode.textContent = value;
  const labelNode = el('span', 'stat-label');
  labelNode.textContent = label;
  card.append(valueNode, labelNode);
  return card;
}

export function renderStats(store: Store, nav: Navigation): HTMLElement {
  const state = store.get();
  const overall = summarize(state.sessions);

  const screen = el('section', 'screen');

  const title = el('h2', 'screen-title');
  title.textContent = STRINGS.stats.title;
  screen.append(title);

  if (state.sessions.length === 0) {
    const empty = el('div', 'empty-state');
    const emptyTitle = el('p', 'empty-title');
    emptyTitle.textContent = STRINGS.stats.emptyTitle;
    const emptyText = el('p', 'empty-text');
    emptyText.textContent = STRINGS.stats.emptyText;
    empty.append(emptyTitle, emptyText);
    screen.append(empty);
    return screen;
  }

  const overallTitle = el('h3', 'section-title');
  overallTitle.textContent = STRINGS.stats.overall;

  const grid = el('div', 'stats-grid');
  grid.append(
    statCard(STRINGS.stats.tests, String(overall.tests)),
    statCard(STRINGS.stats.correct, String(overall.correct)),
    statCard(STRINGS.stats.incorrect, String(overall.incorrect)),
    statCard(STRINGS.stats.percent, overall.percent === null ? '—' : `${overall.percent}%`),
  );

  const byDeckTitle = el('h3', 'section-title');
  byDeckTitle.textContent = STRINGS.stats.byDeck;

  const list = el('div', 'card-list');
  let hasDeckStats = false;

  for (const deck of activeDecks(state)) {
    const summary = summarizeDeck(state.sessions, deck.id);
    if (summary.tests === 0) continue;

    hasDeckStats = true;
    const row = el('button', 'card-row');
    row.type = 'button';
    const name = el('span', 'card-row-title');
    name.textContent = deck.title;
    const meta = el('span', 'card-row-meta');
    meta.textContent = STRINGS.stats.deckMeta(summary.tests, summary.percent);
    row.append(name, meta);
    row.addEventListener('click', () => {
      nav.push({ name: 'deck', deckId: deck.id });
    });
    list.append(row);
  }

  screen.append(overallTitle, grid, byDeckTitle);
  if (hasDeckStats) {
    screen.append(list);
  } else {
    const note = el('p', 'screen-note');
    note.textContent = STRINGS.stats.noDeckStats;
    screen.append(note);
  }

  return screen;
}
