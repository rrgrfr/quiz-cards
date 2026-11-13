export type RandomSource = () => number;

/** Unbiased random value in [0, 1) based on crypto.getRandomValues. */
export function cryptoRandom(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return (values[0] ?? 0) / 0x1_0000_0000;
}

/** Fisher–Yates shuffle; returns a new array and never mutates the input. */
export function shuffle<T>(items: readonly T[], random: RandomSource = cryptoRandom): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = copy[index] as T;
    copy[index] = copy[swapIndex] as T;
    copy[swapIndex] = current;
  }
  return copy;
}
