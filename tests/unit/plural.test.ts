import { describe, expect, it } from 'vitest';
import { plural } from '../../src/shared/plural';

const forms = ['карточка', 'карточки', 'карточек'] as const;

describe('plural', () => {
  it('picks the Russian form for the count', () => {
    expect(plural(1, forms)).toBe('карточка');
    expect(plural(2, forms)).toBe('карточки');
    expect(plural(4, forms)).toBe('карточки');
    expect(plural(5, forms)).toBe('карточек');
    expect(plural(11, forms)).toBe('карточек');
    expect(plural(21, forms)).toBe('карточка');
    expect(plural(0, forms)).toBe('карточек');
  });
});
