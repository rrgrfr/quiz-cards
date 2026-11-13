export type Tab = 'decks' | 'stats' | 'settings';

export const TABS: readonly Tab[] = ['decks', 'stats', 'settings'];

export type Route =
  | { name: Tab }
  | { name: 'create-deck' }
  | { name: 'deck'; deckId: string }
  | { name: 'create-card'; deckId: string }
  | { name: 'card'; cardId: string }
  | { name: 'archive' }
  | { name: 'test-setup'; deckId: string }
  | { name: 'test'; deckId: string; count: number }
  | { name: 'test-result'; deckId: string; count: number; correct: number; total: number };

export interface Navigation {
  get(): Route;
  canGoBack(): boolean;
  push(route: Route): void;
  back(): void;
  goTab(tab: Tab): void;
  resume(route: Route): void;
  rootTab(): Tab;
  subscribe(listener: (route: Route) => void): () => void;
}

/** In-memory navigation; v1 has no URL routing by design (D-089). */
export function createNavigation(initialTab: Tab = 'decks'): Navigation {
  let stack: Route[] = [{ name: initialTab }];
  const listeners = new Set<(route: Route) => void>();

  const current = (): Route => {
    const route = stack[stack.length - 1];
    if (!route) throw new Error('Navigation stack is empty');
    return route;
  };

  const notify = (): void => {
    const route = current();
    for (const listener of listeners) listener(route);
  };

  return {
    get: current,
    canGoBack: () => stack.length > 1,
    push(route) {
      stack = [...stack, route];
      notify();
    },
    back() {
      if (stack.length <= 1) return;
      stack = stack.slice(0, -1);
      notify();
    },
    goTab(tab) {
      stack = [{ name: tab }];
      notify();
    },
    resume(route) {
      stack = [{ name: 'decks' }, route];
      notify();
    },
    rootTab() {
      const root = stack[0];
      if (!root) throw new Error('Navigation stack is empty');
      return root.name as Tab;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
