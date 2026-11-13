import { describe, expect, it } from 'vitest';
import { shuffle, type RandomSource } from '../../src/domain/random';

function seeded(values: readonly number[]): RandomSource {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input, seeded([0.1, 0.5, 0.9, 0.3]));

    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('is deterministic for the same random source', () => {
    const first = shuffle([1, 2, 3, 4, 5], seeded([0.42, 0.17, 0.88]));
    const second = shuffle([1, 2, 3, 4, 5], seeded([0.42, 0.17, 0.88]));

    expect(first).toEqual(second);
  });

  it('keeps every element exactly once', () => {
    const result = shuffle(['a', 'b', 'c', 'd'], seeded([0.9, 0.1, 0.5]));
    expect(new Set(result).size).toBe(4);
  });
});
