import type { GameAction } from '../action.ts';
import { IllegalActionError } from '../errors.ts';
import { LOCATION_CAPACITY } from '../rules.ts';
import type { PlayerIndex, PlayerState } from '../state.ts';
import type { GameBoard } from './board.ts';
import { cardAt, occupancy } from './state-access.ts';
import type { TurnFlow } from './turn.ts';

// Player actions during planning: checks every rule, then mutates the state.
export class ActionHandler {
  private readonly board: GameBoard;
  private readonly turns: TurnFlow;

  constructor(board: GameBoard, turns: TurnFlow) {
    this.board = board;
    this.turns = turns;
  }

  dispatch(action: GameAction): void {
    if (this.board.state.status === 'ended') {
      throw new IllegalActionError('gameOver', 'the game is over');
    }
    switch (action.type) {
      case 'play':
        this.play(action.player, action.card, action.location);
        return;
      case 'cancel':
        this.cancel(action.player, action.card);
        return;
      case 'endTurn':
        this.endTurn(action.player);
        return;
    }
  }

  private play(player: PlayerIndex, uid: string, location: number): void {
    const { state } = this.board;
    const playerState = this.planningPlayer(player);
    if (!playerState.hand.includes(uid)) {
      throw new IllegalActionError('cardNotInHand', `card ${uid} is not in hand`);
    }
    if (!Number.isInteger(location) || state.locations[location] === undefined) {
      throw new IllegalActionError('unknownLocation', `unknown location ${location}`);
    }
    const cost = this.board.definitionOf(uid).cost;
    const left = playerState.energy - playerState.spent;
    if (cost > left) {
      throw new IllegalActionError('notEnoughEnergy', `card ${uid} costs ${cost}, ${left} energy left`);
    }
    if (occupancy(state, player, location) >= LOCATION_CAPACITY) {
      throw new IllegalActionError('locationFull', `location ${location} is full`);
    }
    const card = cardAt(state, uid);
    playerState.hand.splice(playerState.hand.indexOf(uid), 1);
    playerState.pending.push(uid);
    playerState.spent += cost;
    card.zone = 'pending';
    card.location = location;
    card.playOrder = state.nextPlayOrder++;
  }

  private cancel(player: PlayerIndex, uid: string): void {
    const playerState = this.planningPlayer(player);
    if (!playerState.pending.includes(uid)) {
      throw new IllegalActionError('cardNotPending', `card ${uid} was not played this turn`);
    }
    const card = cardAt(this.board.state, uid);
    playerState.pending.splice(playerState.pending.indexOf(uid), 1);
    playerState.hand.push(uid);
    playerState.spent -= this.board.definitionOf(uid).cost;
    card.zone = 'hand';
    card.location = null;
    card.playOrder = null;
  }

  private endTurn(player: PlayerIndex): void {
    this.planningPlayer(player).ready = true;
    if (this.board.state.players.every((p) => p.ready)) {
      this.turns.resolve();
    }
  }

  // The player still planning this turn, or an error.
  private planningPlayer(player: PlayerIndex): PlayerState {
    const playerState = this.board.state.players[player as number];
    if (playerState === undefined) {
      throw new IllegalActionError('unknownPlayer', `unknown player ${String(player)}`);
    }
    if (playerState.ready) {
      throw new IllegalActionError('playerReady', 'the turn is already ended for this player');
    }
    return playerState;
  }
}
