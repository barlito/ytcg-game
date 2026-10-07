import type { Catalog } from '../catalog.ts';
import { applyAction, openLocations, playableCards } from '../game.ts';
import type { Rng } from '../rng.ts';
import type { GameState, PlayerIndex } from '../state.ts';

// Plays random affordable cards on random open locations, sometimes holding back, then ends its turn.
export function playRandomTurn(catalog: Catalog, state: GameState, player: PlayerIndex, rng: Rng): GameState {
  let current = state;
  for (;;) {
    const cards = playableCards(catalog, current, player);
    const locations = openLocations(current, player);
    if (cards.length === 0 || locations.length === 0 || rng.next() < 0.1) {
      break;
    }
    current = applyAction(catalog, current, {
      type: 'play',
      player,
      card: rng.pick(cards),
      location: rng.pick(locations),
    }).state;
  }
  return applyAction(catalog, current, { type: 'endTurn', player }).state;
}
