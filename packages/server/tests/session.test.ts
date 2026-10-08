import { IllegalActionError } from '@ytcg-game/engine';
import { describe, expect, it } from 'vitest';
import { GameSession, SessionError } from '../src/session/game-session.ts';
import { ALICE, BOB, catalog, randomDeck } from './support.ts';

function startedSession(): GameSession {
  const session = new GameSession(catalog, 'session');
  session.seat(ALICE, randomDeck(1));
  session.seat(BOB, randomDeck(2));
  session.start();
  return session;
}

describe('game session', () => {
  it('seats two distinct players, then refuses anyone else', () => {
    const session = new GameSession(catalog, 'seats');
    expect(session.seat(ALICE, randomDeck(1))).toBe(0);
    expect(() => session.seat(ALICE, randomDeck(1))).toThrow(SessionError);
    expect(session.seat(BOB, randomDeck(2))).toBe(1);
    expect(session.isFull).toBe(true);
    expect(() => session.seat({ id: 'dev:carol', name: 'Carol' }, randomDeck(3))).toThrow(SessionError);
    expect(session.lobby().seats.map((seat) => seat.name)).toEqual(['Alice', 'Bob']);
  });

  it('plays for the seat of the sender, whatever the input says', () => {
    const session = startedSession();
    const view = session.messageFor(1, [], null).view;
    expect(view.locations.filter((location) => location.chosenBy !== null).length).toBeLessThanOrEqual(1);
    const card = view.hand[0]?.uid ?? '';
    expect(() => session.apply(0, { type: 'play', card, location: 0 })).toThrow(IllegalActionError);
  });

  it('lets a player redraw their hand on turn 1', () => {
    const session = startedSession();
    const events = session.apply(0, { type: 'mulligan' });
    expect(events).toContainEqual({ type: 'handRedrawn', player: 0 });
    expect(session.messageFor(0, [], null).view.canMulligan).toBe(false);
    expect(session.messageFor(1, [], null).view.canMulligan).toBe(true);
  });

  it('ends the turn of every player still planning when the timer elapses', () => {
    const session = startedSession();
    session.apply(0, { type: 'endTurn' });
    expect(session.turn).toBe(1);
    const events = session.timeout();
    expect(session.turn).toBe(2);
    expect(events).toContainEqual({ type: 'turnStarted', turn: 2 });
  });

  it('plays a full game through timeouts and reports the score outcome', () => {
    const session = startedSession();
    while (!session.isOver) {
      session.timeout();
    }
    expect(session.outcome()?.reason).toBe('score');
    expect(session.messageFor(0, [], { deadline: 123, revealUntil: 100 })).toMatchObject({
      turnDeadline: null,
      revealUntil: null,
    });
  });

  it('gives the win to the other player on forfeit and refuses further actions', () => {
    const session = startedSession();
    session.forfeit(1);
    expect(session.outcome()).toEqual({ winner: 0, reason: 'forfeit' });
    expect(() => session.apply(0, { type: 'endTurn' })).toThrow(SessionError);
    expect(session.messageFor(0, [], null).outcome?.reason).toBe('forfeit');
  });

  it("never sends a player the opponent's hand", () => {
    const session = startedSession();
    const aliceHand = session.messageFor(0, [], null).view.hand.map((card) => card.uid);
    const toBob = JSON.stringify(session.messageFor(1, [], null));
    for (const uid of aliceHand) {
      expect(toBob).not.toContain(`"${uid}"`);
    }
  });
});
