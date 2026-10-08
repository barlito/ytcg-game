import type { GameMessage } from '@ytcg-game/server/protocol';
import { createContext, useContext, useEffect, useState } from 'react';
import { useReducedMotion } from '../lib/useReducedMotion.ts';
import { type Placements, trackPlacements } from './placements.ts';
import { IDLE, type Queue, advance, currentStep, enqueue, stepsFor } from './queue.ts';
import { STILL, type Scene, sceneOf } from './scene.ts';

export interface Replay {
  scene: Scene;
  placements: Placements;
  skip: () => void;
}

interface Tracked {
  game: GameMessage;
  queue: Queue;
  placements: Placements;
}

function track(previous: Tracked | null, game: GameMessage, reducedMotion: boolean): Tracked {
  const steps = stepsFor(game.events, game.view.you, reducedMotion);
  return {
    game,
    queue: enqueue(previous?.queue ?? IDLE, steps),
    placements: trackPlacements(previous?.placements ?? new Map(), game.view, game.events),
  };
}

// Replays the events of every server message as a timed sequence on top of its final view.
export function useReplay(game: GameMessage): Replay {
  const reducedMotion = useReducedMotion();
  const [tracked, setTracked] = useState(() => track(null, game, reducedMotion));
  if (tracked.game !== game) {
    // A new message: adjust the state during render (React's pattern for props-derived state).
    setTracked(track(tracked, game, reducedMotion));
  }
  const step = currentStep(tracked.queue);
  useEffect(() => {
    if (step === null) {
      return;
    }
    const timer = setTimeout(() => {
      setTracked((current) => ({ ...current, queue: advance(current.queue) }));
    }, step.duration);
    return () => {
      clearTimeout(timer);
    };
  }, [step]);
  return {
    scene: sceneOf(tracked.queue),
    placements: tracked.placements,
    skip: () => {
      setTracked((current) => ({ ...current, queue: IDLE }));
    },
  };
}

export const ReplayContext = createContext<Pick<Replay, 'scene' | 'placements'>>({
  scene: STILL,
  placements: new Map(),
});

export function useScene(): Scene {
  return useContext(ReplayContext).scene;
}

export function usePlacements(): Placements {
  return useContext(ReplayContext).placements;
}
