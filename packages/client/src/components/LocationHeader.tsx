import { type LocationView, type PlayerEvent, describeLocation } from '@ytcg-game/engine';
import { useScene } from '../animation/useReplay.ts';
import { catalog } from '../catalog.ts';
import { leadOf } from '../lib/lead.ts';
import { terrainState } from '../lib/terrainRules.ts';
import { Artwork } from './Artwork.tsx';

const OWNER_LABEL = { you: 'Ton terrain', opponent: 'Terrain adverse', random: 'Terrain aléatoire' } as const;

// Hexagon score: solid and glowing for the side that leads, hollow for the other.
function ScoreHex({ side, value, lit }: { side: 'you' | 'opponent'; value: number; lit: boolean }): React.JSX.Element {
  return (
    <span
      className={`score-hex side-${side}${lit ? ' is-lit' : ''}`}
      aria-label={`Puissance ${side === 'you' ? 'à toi' : 'adverse'} ${String(value)}`}
    >
      <span className="score-hex__num">{value}</span>
    </span>
  );
}

interface TileProps {
  location: LocationView;
  children: React.ReactNode;
}

// Opponent hexagon, name and effect, your hexagon (the grid areas move the scores under the text on phones).
function TileBody({ location, children }: TileProps): React.JSX.Element {
  const lead = leadOf(location.power);
  return (
    <>
      <ScoreHex side="opponent" value={location.power.opponent} lit={lead === 'opponent'} />
      <div className="tile-text">{children}</div>
      <ScoreHex side="you" value={location.power.you} lit={lead === 'you'} />
    </>
  );
}

function HiddenHeader({ location }: { location: LocationView }): React.JSX.Element {
  return (
    <header className="location-tile tone-hidden is-hidden" data-location-header={location.index}>
      <TileBody location={location}>
        <span className="tile-owner">Terrain caché</span>
        <span className="location-name">Lieu inconnu</span>
        <span className="location-text">Se révèle bientôt.</span>
      </TileBody>
    </header>
  );
}

// Locations an event is about (a reaction of a card is shown on the card, not on the tile).
function touched(event: PlayerEvent): number[] {
  if (event.type === 'cardMoved') {
    return [event.from, event.to];
  }
  const own = event.type === 'abilityTriggered' && event.card === null;
  return event.type === 'locationRevealed' || event.type === 'cardRevealed' || own ? [event.location] : [];
}

// The tile flips when its terrain is revealed, flashes when a card lands on or leaves the location, and lights up
// when its own reaction triggers.
function tileEffects(current: PlayerEvent | null, index: number): string {
  if (current === null || !touched(current).includes(index)) {
    return '';
  }
  if (current.type === 'locationRevealed') {
    return ' fx-flip';
  }
  return current.type === 'abilityTriggered' ? ' fx-trigger' : ' fx-flash';
}

// The terrain rules at a glance: « 3 places », « Ouvre au tour 2 », « Fermé à partir du tour 5 ».
function RulePills({ pills }: { pills: readonly string[] }): React.JSX.Element | null {
  if (pills.length === 0) {
    return null;
  }
  return (
    <span className="tile-rules">
      {pills.map((pill) => (
        <span key={pill} className="tile-rule">
          {pill}
        </span>
      ))}
    </span>
  );
}

function RevealedHeader({ location, defId, turn }: HeaderProps & { defId: string }): React.JSX.Element {
  const scene = useScene();
  const terrain = catalog.location(defId);
  const text = describeLocation(catalog, terrain).join(' ') || 'Aucun effet.';
  const tone = location.chosenBy ?? 'random';
  return (
    <header
      className={`location-tile tone-${tone}${tileEffects(scene.current, location.index)}`}
      data-location-header={location.index}
    >
      <Artwork key={terrain.id} image={terrain.image} className="location-art" />
      <TileBody location={location}>
        <span className="tile-owner">{OWNER_LABEL[tone]}</span>
        <span className="location-name">{terrain.name}</span>
        <span className="location-text">{text}</span>
        <RulePills pills={terrainState(terrain.rules, turn).pills} />
      </TileBody>
    </header>
  );
}

interface HeaderProps {
  location: LocationView;
  turn: number;
}

export function LocationHeader({ location, turn }: HeaderProps): React.JSX.Element {
  const scene = useScene();
  if (location.defId === null || scene.hiddenLocations.has(location.index)) {
    return <HiddenHeader location={location} />;
  }
  return <RevealedHeader location={location} defId={location.defId} turn={turn} />;
}
