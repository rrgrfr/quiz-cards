/** Default number of questions on the test setup screen (D-060). */
export const DEFAULT_TEST_COUNT = 10;

/** Initial slider value: min(10, N); 0 when the pool is empty. */
export function initialTestCount(available: number): number {
  return Math.max(0, Math.min(DEFAULT_TEST_COUNT, available));
}
