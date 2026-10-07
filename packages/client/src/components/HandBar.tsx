import type { CardView } from '@ytcg-game/engine';
import { CardTile } from './CardTile.tsx';

interface Props {
  hand: CardView[];
  energyLeft: number;
  locked: boolean;
  selected: string | null;
  onSelect: (uid: string | null) => void;
}

export function HandBar({ hand, energyLeft, locked, selected, onSelect }: Props): React.JSX.Element {
  return (
    <div className="hand">
      {hand.map((card) => {
        const playable = !locked && card.cost <= energyLeft;
        return (
          <CardTile
            key={card.uid}
            card={card}
            selected={selected === card.uid}
            disabled={!playable}
            onClick={
              playable
                ? () => {
                    onSelect(selected === card.uid ? null : card.uid);
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
