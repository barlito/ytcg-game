import type { PlayerView } from '@ytcg-game/engine';
import type { SeatInfo } from '@ytcg-game/server/protocol';
import { SPOTLIGHT_MS } from '../animation/queue.ts';
import { type SpotlightContent, spotlightContent, spotlightTarget } from '../animation/spotlight.ts';
import { useScene } from '../animation/useReplay.ts';
import { catalog } from '../catalog.ts';
import { Artwork } from './Artwork.tsx';
import { CardFace } from './card/CardFace.tsx';

interface Props {
  view: PlayerView;
  seats: readonly SeatInfo[];
}

// Sets the flight to the board slot as CSS variables (offsets ignore the running transform).
function aimAt(selector: string): (figure: HTMLElement | null) => void {
  return (figure) => {
    figure?.style.setProperty('--spot-ms', `${String(SPOTLIGHT_MS)}ms`);
    const target = figure === null ? null : document.querySelector(selector);
    if (figure === null || target === null || figure.offsetWidth === 0) {
      return;
    }
    const box = target.getBoundingClientRect();
    const dx = box.left + box.width / 2 - (figure.offsetLeft + figure.offsetWidth / 2);
    const dy = box.top + box.height / 2 - (figure.offsetTop + figure.offsetHeight / 2);
    figure.style.setProperty('--fly-x', `${String(Math.round(dx))}px`);
    figure.style.setProperty('--fly-y', `${String(Math.round(dy))}px`);
    figure.style.setProperty('--fly-scale', String(Math.max(0.15, box.width / figure.offsetWidth)));
  };
}

function EffectText({ text }: { text: readonly string[] }): React.JSX.Element {
  if (text.length === 0) {
    return <p className="spotlight__text is-empty">Aucun effet.</p>;
  }
  return (
    <>
      {text.map((line) => (
        <p key={line} className="spotlight__text">
          {line}
        </p>
      ))}
    </>
  );
}

interface PanelProps<K extends SpotlightContent['kind']> {
  content: Extract<SpotlightContent, { kind: K }>;
  target: string;
}

function CardSpotlight({ content, target }: PanelProps<'card'>): React.JSX.Element {
  const { card } = content;
  return (
    <div className={`spotlight__panel side-${content.side}`}>
      <div ref={aimAt(target)} className="spotlight__figure">
        <CardFace card={card} />
      </div>
      <div className="spotlight__caption">
        <p className="spotlight__owner">
          <span className={`spotlight__chip side-${content.side}`}>{content.owner}</span> → {content.place}
        </p>
        <p className="spotlight__name">{catalog.card(card.defId).name}</p>
        <p className="spotlight__stats">
          Coût {card.cost} · Puissance {card.power}
        </p>
        <EffectText text={content.text} />
      </div>
    </div>
  );
}

function TerrainSpotlight({ content, target }: PanelProps<'location'>): React.JSX.Element {
  const location = catalog.location(content.defId);
  return (
    <div className="spotlight__panel is-terrain">
      <div ref={aimAt(target)} className="spotlight__figure spotlight__terrain">
        <Artwork image={location.image} className="spotlight__terrain-art" />
        <span className="spotlight__terrain-name">{location.name}</span>
      </div>
      <div className="spotlight__caption">
        <p className="spotlight__owner">
          <span className="spotlight__chip">{content.owner}</span> Un lieu se révèle
        </p>
        <p className="spotlight__name">{location.name}</p>
        <p className="spotlight__stats">{catalog.extensions.get(location.extension ?? '') ?? 'Terrain neutre'}</p>
        <EffectText text={content.text} />
        <p className="spotlight__text is-empty">Un terrain touche les cartes des deux camps.</p>
      </div>
    </div>
  );
}

// The revealed card or terrain, enlarged in the center, then flying to its spot; never catches the pointer.
export function Spotlight({ view, seats }: Props): React.JSX.Element | null {
  const { spotlight } = useScene();
  const content = spotlight === null ? null : spotlightContent(spotlight, view, seats);
  if (spotlight === null || content === null) {
    return null;
  }
  const target = spotlightTarget(spotlight);
  return (
    <div key={JSON.stringify(spotlight)} className="spotlight" role="status" aria-live="polite">
      {content.kind === 'card' ? (
        <CardSpotlight content={content} target={target} />
      ) : (
        <TerrainSpotlight content={content} target={target} />
      )}
    </div>
  );
}
