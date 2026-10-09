import {
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  DragOverlay,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { CardView, PlayerView } from '@ytcg-game/engine';
import type { ActionInput } from '@ytcg-game/server/protocol';
import { type ReactNode, useRef, useState } from 'react';
import { type DraggedCard, dropActions, parseDropId } from '../../dnd.ts';
import { CALM, type Sample, type Wind, windBetween } from '../../lib/dragWind.ts';
import { CardFace } from '../card/CardFace.tsx';
import { DragContext } from './DragContext.ts';

interface Props {
  view: PlayerView;
  send: (input: ActionInput) => void;
  children: ReactNode;
}

interface DragData {
  dragged: DraggedCard;
  card: CardView;
}

function dragDataOf(data: Record<string, unknown> | undefined): DragData | null {
  const value = data?.drag;
  return typeof value === 'object' && value !== null && 'dragged' in value && 'card' in value
    ? (value as DragData) // Set by useDraggable in DraggableCard, always this shape.
    : null;
}

function useWind(): { wind: Wind; move: (x: number, y: number) => void; reset: () => void } {
  const previous = useRef<Sample | null>(null);
  const [wind, setWind] = useState<Wind>(CALM);
  return {
    wind,
    move: (x, y) => {
      const sample = { x, y, t: performance.now() };
      if (previous.current !== null) {
        setWind(windBetween(previous.current, sample));
      }
      previous.current = sample;
    },
    reset: () => {
      previous.current = null;
      setWind(CALM);
    },
  };
}

function WindyCard({ card, wind }: { card: CardView; wind: Wind }): React.JSX.Element {
  const scale = 1.06 + wind.strength * 0.04;
  return (
    <div
      className="drag-overlay"
      style={{ transform: `rotateX(${wind.rx}deg) rotateY(${wind.ry}deg) scale(${scale})` }}
    >
      <CardFace card={card} />
    </div>
  );
}

// Mouse drags after a few pixels, touch after a short press: taps stay clicks (select, take back).
export function DuelDnd({ view, send, children }: Props): React.JSX.Element {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );
  const [active, setActive] = useState<DragData | null>(null);
  const { wind, move, reset } = useWind();
  const finish = (): void => {
    setActive(null);
    reset();
  };
  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event: DragStartEvent) => {
        setActive(dragDataOf(event.active.data.current));
      }}
      onDragMove={(event: DragMoveEvent) => {
        move(event.delta.x, event.delta.y);
      }}
      onDragEnd={(event: DragEndEvent) => {
        if (active !== null) {
          dropActions(view, active.dragged, parseDropId(event.over?.id)).forEach(send);
        }
        finish();
      }}
      onDragCancel={finish}
    >
      <DragContext value={active?.dragged ?? null}>{children}</DragContext>
      <DragOverlay dropAnimation={null}>
        {active === null ? null : <WindyCard card={active.card} wind={wind} />}
      </DragOverlay>
    </DndContext>
  );
}
