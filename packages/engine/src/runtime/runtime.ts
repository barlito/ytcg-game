import type { Catalog } from '../catalog.ts';
import type { GameEvent, GameState } from '../state.ts';
import { AbilityRunner } from './abilities.ts';
import { ActionHandler } from './actions.ts';
import { GameBoard } from './board.ts';
import { TurnFlow } from './turn.ts';

// Composition root: wires the parts around ONE mutable state and ONE event list.
export class Runtime {
  readonly events: GameEvent[] = [];
  readonly board: GameBoard;
  readonly turns: TurnFlow;
  readonly actions: ActionHandler;

  constructor(catalog: Catalog, state: GameState) {
    this.board = new GameBoard(catalog, state, this.events);
    const abilities = new AbilityRunner(this.board);
    this.board.onDestroyed = (uid) => {
      abilities.fireDestroyed(uid);
    };
    this.turns = new TurnFlow(this.board, abilities, this.events);
    this.actions = new ActionHandler(this.board, this.turns);
  }

  get state(): GameState {
    return this.board.state;
  }
}
