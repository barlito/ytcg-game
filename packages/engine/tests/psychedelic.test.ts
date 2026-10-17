import { describe, expect, it } from 'vitest';
import { describeCard, overridesStatus } from '../src/index.ts';
import { loadDataDir } from '../src/sim/data.ts';

const catalog = loadDataDir();
const psychedelic = [...catalog.cards.values()].filter((definition) => definition.extension === 'psychedelic');

// « Le Trip », good-trip version: Défonce buffs every Psychedelic card and never wears it down.
describe('Psychedelic (data)', () => {
  it('has its ten cards', () => {
    expect(psychedelic).toHaveLength(10);
  });

  it('every card defines its own Défonce effect, so none loses power from it', () => {
    for (const definition of psychedelic) {
      expect(overridesStatus(definition.abilities, 'high'), definition.name).toBe(true);
    }
  });

  it('every card prints a « Défoncée : » line', () => {
    for (const definition of psychedelic) {
      expect(describeCard(catalog, definition).some((line) => line.startsWith('Défoncée : +'))).toBe(true);
    }
  });
});
