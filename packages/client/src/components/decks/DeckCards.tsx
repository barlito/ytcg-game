import { type CardDefinition, type LocationDefinition, describeLocation } from '@ytcg-game/engine';
import { catalog } from '../../catalog.ts';
import { useTooltipAnchor } from '../../lib/useTooltipAnchor.ts';
import { Artwork } from '../Artwork.tsx';
import { Tooltip } from '../Tooltip.tsx';
import { DefinitionTip } from './DefinitionTip.tsx';
import { DefinitionFace } from './PoolTile.tsx';

interface Props {
  cards: readonly string[];
  terrain: string | null;
  // Cards the player no longer owns: shown greyed out.
  missing?: readonly string[];
  // Hand-sized tiles with their effect text, or small thumbnails (artwork and numbers).
  size?: 'large' | 'small';
}

function CardThumb({
  definition,
  missing,
  size,
}: {
  definition: CardDefinition;
  missing: boolean;
  size: 'large' | 'small';
}): React.JSX.Element {
  const { anchor, setAnchor, id, open, handlers } = useTooltipAnchor(false);
  return (
    <li className={`deck-cards__card${missing ? ' is-missing' : ''}`}>
      <button
        ref={setAnchor}
        type="button"
        className="card-slot"
        aria-label={definition.name}
        aria-describedby={open ? id : undefined}
        {...handlers}
      >
        <DefinitionFace definition={definition} size={size === 'large' ? 'full' : 'compact'} dim={missing} />
      </button>
      {open && (
        <Tooltip anchor={anchor} id={id}>
          <DefinitionTip definition={definition}>
            {missing && <p className="tip-text is-empty">Tu ne possèdes plus cette carte.</p>}
          </DefinitionTip>
        </Tooltip>
      )}
    </li>
  );
}

function TerrainThumb({ terrain }: { terrain: LocationDefinition }): React.JSX.Element {
  const text = describeLocation(catalog, terrain).join(' ') || 'Aucun effet.';
  return (
    <li className="deck-cards__terrain" title={text}>
      <Artwork image={terrain.image} className="deck-cards__terrain-art" />
      <span className="deck-cards__terrain-label">Terrain</span>
      <span className="deck-cards__terrain-name">{terrain.name}</span>
      <span className="deck-cards__terrain-text">{text}</span>
    </li>
  );
}

// The cards of a deck as the player will see them, cheapest first, then its terrain.
export function DeckCards({ cards, terrain, missing = [], size = 'small' }: Props): React.JSX.Element {
  const known = cards
    .flatMap((id) => catalog.cards.get(id) ?? [])
    .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name, 'fr'));
  const unknown = cards.length - known.length;
  const location = terrain === null ? undefined : catalog.locations.get(terrain);
  return (
    <ul className={`deck-cards is-${size}`}>
      {known.map((definition) => (
        <CardThumb key={definition.id} definition={definition} missing={missing.includes(definition.id)} size={size} />
      ))}
      {unknown > 0 && <li className="deck-cards__unknown">+{unknown} carte(s) inconnue(s) du jeu</li>}
      {location !== undefined && <TerrainThumb terrain={location} />}
    </ul>
  );
}
