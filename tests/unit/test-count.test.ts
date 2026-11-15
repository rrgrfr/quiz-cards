import { describe, expect, it } from 'vitest';
import { DEFAULT_TEST_COUNT, initialTestCount } from '../../src/domain/test-count';

describe('initialTestCount', () => {
  it('defaults to 10 for a large pool', () => {
    expect(initialTestCount(239)).toBe(10);
    expect(initialTestCount(10)).toBe(10);
  });

  it('uses the whole pool when it is smaller than the default', () => {
    expect(initialTestCount(1)).toBe(1);
    expect(initialTestCount(5)).toBe(5);
  });

  it('returns zero for an empty pool', () => {
    expect(initialTestCount(0)).toBe(0);
  });

  it('keeps the default value at 10', () => {
    expect(DEFAULT_TEST_COUNT).toBe(10);
  });
});
