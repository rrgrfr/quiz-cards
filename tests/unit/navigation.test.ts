import { describe, expect, it, vi } from 'vitest';
import { createNavigation } from '../../src/ui/navigation';

describe('navigation', () => {
  it('starts on the decks tab with no back history', () => {
    const nav = createNavigation();
    expect(nav.get()).toEqual({ name: 'decks' });
    expect(nav.canGoBack()).toBe(false);
    expect(nav.rootTab()).toBe('decks');
  });

  it('pushes a route and goes back to the root tab', () => {
    const nav = createNavigation();
    const listener = vi.fn();
    nav.subscribe(listener);

    nav.push({ name: 'deck', deckId: 'd1' });
    expect(nav.get()).toEqual({ name: 'deck', deckId: 'd1' });
    expect(nav.canGoBack()).toBe(true);
    expect(nav.rootTab()).toBe('decks');

    nav.back();
    expect(nav.get()).toEqual({ name: 'decks' });
    expect(nav.canGoBack()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('ignores back on the root route', () => {
    const nav = createNavigation();
    const listener = vi.fn();
    nav.subscribe(listener);

    nav.back();

    expect(nav.get()).toEqual({ name: 'decks' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('resets the stack when switching tabs', () => {
    const nav = createNavigation();
    nav.push({ name: 'deck', deckId: 'd1' });
    nav.push({ name: 'create-card', deckId: 'd1' });

    nav.goTab('settings');

    expect(nav.get()).toEqual({ name: 'settings' });
    expect(nav.canGoBack()).toBe(false);
    expect(nav.rootTab()).toBe('settings');
  });

  it('resumes a nested route with the decks tab as the root', () => {
    const nav = createNavigation('settings');
    nav.push({ name: 'deck', deckId: 'd1' });

    nav.resume({ name: 'card', cardId: 'c1' });

    expect(nav.get()).toEqual({ name: 'card', cardId: 'c1' });
    expect(nav.rootTab()).toBe('decks');
    nav.back();
    expect(nav.get()).toEqual({ name: 'decks' });
  });
});
