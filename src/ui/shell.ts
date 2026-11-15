import type { Store } from '../application/store';
import { APP_NAME } from '../shared/config';
import { STRINGS } from '../shared/strings';
import { el, staticMarkup } from './dom';
import { createNavigation, TABS, type Navigation, type Route, type Tab } from './navigation';
import { canLeave, clearExitGuard } from './navigation-guard';
import { renderArchive } from './screens/archive';
import { renderCard } from './screens/card';
import { renderCardForm } from './screens/card-form';
import { renderDeck } from './screens/deck';
import { renderDeckForm } from './screens/deck-form';
import { renderDecks } from './screens/decks';
import { renderReadyDecks } from './screens/ready-decks';
import { renderSettings } from './screens/settings';
import { renderStats } from './screens/stats';
import { renderTest } from './screens/test';
import { renderTestResult } from './screens/test-result';
import { renderTestSetup } from './screens/test-setup';

const TAB_ICONS: Record<Tab, string> = {
  decks:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/></svg>',
  stats:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10"/><path d="M12 20V4"/><path d="M19 20v-7"/></svg>',
  settings:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8"/></svg>',
};

function renderRoute(route: Route, store: Store, nav: Navigation): HTMLElement {
  switch (route.name) {
    case 'decks':
      return renderDecks(store, nav);
    case 'stats':
      return renderStats(store, nav);
    case 'settings':
      return renderSettings(store, nav);
    case 'create-deck':
      return renderDeckForm(store, nav);
    case 'ready-decks':
      return renderReadyDecks(store, nav);
    case 'deck':
      return renderDeck(store, nav, route.deckId);
    case 'create-card':
      return renderCardForm(store, nav, route.deckId);
    case 'card':
      return renderCard(store, nav, route.cardId);
    case 'archive':
      return renderArchive(store, nav);
    case 'test-setup':
      return renderTestSetup(store, nav, route.deckId);
    case 'test':
      return renderTest(store, nav, route.deckId, route.count);
    case 'test-result':
      return renderTestResult(nav, route);
  }
}

export function mountApp(root: HTMLElement, store: Store): void {
  const nav = createNavigation('decks');
  const shell = el('div', 'app');

  const header = el('header', 'app-header');
  const back = el('button', 'header-back');
  back.type = 'button';
  back.textContent = STRINGS.common.back;
  back.hidden = true;
  back.addEventListener('click', () => {
    if (!canLeave()) return;
    nav.back();
  });
  const title = el('h1', 'app-title');
  title.textContent = APP_NAME;
  header.append(back, title);

  const main = el('main', 'app-main');
  main.id = 'main';

  const tabbar = el('nav', 'tabbar');
  tabbar.setAttribute('aria-label', 'Разделы');
  const tabButtons = new Map<Tab, HTMLButtonElement>();

  for (const tab of TABS) {
    const button = el('button', 'tab');
    button.type = 'button';
    button.dataset.tab = tab;
    staticMarkup(button, TAB_ICONS[tab]);
    const label = el('span', 'tab-label');
    label.textContent = STRINGS.tabs[tab];
    button.append(label);
    button.addEventListener('click', () => {
      if (!canLeave()) return;
      nav.goTab(tab);
    });
    tabButtons.set(tab, button);
    tabbar.append(button);
  }

  const updateTabs = (active: Tab): void => {
    for (const [tab, button] of tabButtons) {
      const isActive = tab === active;
      button.classList.toggle('is-active', isActive);
      if (isActive) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
  };

  const render = (): void => {
    const route = nav.get();
    back.hidden = !nav.canGoBack();
    if (route.name !== 'test') clearExitGuard();
    tabbar.hidden = route.name === 'test';
    main.replaceChildren(renderRoute(route, store, nav));
    updateTabs(nav.rootTab());
    main.scrollTop = 0;
  };

  nav.subscribe(render);
  store.subscribe(render);
  render();

  shell.append(header, main, tabbar);
  root.replaceChildren(shell);
}
