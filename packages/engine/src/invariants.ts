import type { CardZone, GameState } from './state.ts';

// Every card instance must sit in exactly one place, consistent with its zone. Returns the violations.
export function checkInvariants(state: GameState): string[] {
  const places = new Map<string, string[]>();
  const record = (uid: string, place: string): void => {
    places.set(uid, [...(places.get(uid) ?? []), place]);
  };
  state.players.forEach((player, index) => {
    player.deck.forEach((uid) => {
      record(uid, `deck:${index}`);
    });
    player.hand.forEach((uid) => {
      record(uid, `hand:${index}`);
    });
    player.pending.forEach((uid) => {
      record(uid, `pending:${index}`);
    });
  });
  state.locations.forEach((location, index) => {
    location.cards.forEach((uids, owner) => {
      uids.forEach((uid) => {
        record(uid, `board:${owner}:${index}`);
      });
    });
  });

  const issues: string[] = [];
  for (const card of Object.values(state.cards)) {
    const found = places.get(card.uid) ?? [];
    const expected = expectedPlace(card.zone, card.owner, card.location);
    if (expected === null ? found.length > 0 : found.length !== 1 || found[0] !== expected) {
      issues.push(`${card.uid} (${card.zone}) found in [${found.join(', ')}]`);
    }
  }
  for (const uid of places.keys()) {
    if (!(uid in state.cards)) {
      issues.push(`${uid} is listed but has no instance`);
    }
  }
  return issues;
}

function expectedPlace(zone: CardZone, owner: number, location: number | null): string | null {
  switch (zone) {
    case 'deck':
    case 'hand':
    case 'pending':
      return `${zone}:${owner}`;
    case 'board':
      return `board:${owner}:${location ?? '?'}`;
    case 'destroyed':
      return null;
  }
}
