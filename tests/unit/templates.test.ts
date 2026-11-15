import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDeckFile } from '../../src/domain/import-deck';

function readTemplate(name: string): string {
  return readFileSync(new URL(`../../docs/templates/${name}`, import.meta.url), 'utf8');
}

describe.each(['deck-template.json', 'example-deck.json', 'sql-day7-deck.json'])('%s', (name) => {
  it('is valid according to the personal-quiz-deck contract', () => {
    const result = parseDeckFile(readTemplate(name));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title.length).toBeGreaterThan(0);
    expect(result.value.cards.length).toBeGreaterThan(0);

    for (const card of result.value.cards) {
      expect(card.answers).toHaveLength(4);
      expect(new Set(card.answers.map((answer) => answer.toLowerCase())).size).toBe(4);
      expect(Number.isInteger(card.correctIndex)).toBe(true);
      expect(card.correctIndex).toBeGreaterThanOrEqual(0);
      expect(card.correctIndex).toBeLessThanOrEqual(3);
    }
  });
});
