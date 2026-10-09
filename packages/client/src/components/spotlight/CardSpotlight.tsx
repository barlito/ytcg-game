import { SPOTLIGHT_MS } from '../../animation/queue.ts';
import type { CardContent } from '../../animation/spotlight.ts';
import { useCountSteps } from '../../animation/useCountSteps.ts';
import { catalog } from '../../catalog.ts';
import { CardBack, CardFace } from '../card/CardFace.tsx';
import { RARITY_LABEL, rarityGlyph } from '../card/rarity.ts';
import { EffectBlock, InfoPanel, PowerLine } from './EffectPanel.tsx';
import { aimAt } from './aim.ts';

// The power counter starts once the effect panel is in (38 % of the sequence).
const COUNT_DELAY_MS = Math.round(SPOTLIGHT_MS * 0.38);

function eyebrowOf(content: CardContent): string {
  return content.owner === 'Toi' ? 'Tu révèles' : `${content.owner} révèle`;
}

// The card rises face down, flips, its effect panel slides in, then it shrinks to its spot on the board.
export function CardSpotlight({ content, target }: { content: CardContent; target: string }): React.JSX.Element {
  const { card, rarity } = content;
  const power = useCountSteps(card.power, content.finalPower, COUNT_DELAY_MS);
  const meta = [`${rarityGlyph(rarity)} ${RARITY_LABEL[rarity]}`, content.universe, content.place].filter(Boolean);
  return (
    <div className={`spotlight__panel side-${content.side}`}>
      <div ref={aimAt(target)} className="spotlight__stage">
        <div className="spotlight__rotor">
          <div className="spotlight__face">
            <CardFace card={{ ...card, power }} />
          </div>
          <div className="spotlight__face is-back">
            <CardBack rarity={rarity} />
          </div>
        </div>
      </div>
      <InfoPanel eyebrow={eyebrowOf(content)} name={catalog.card(card.defId).name} meta={meta.join(' · ')}>
        <EffectBlock text={content.text} />
        <PowerLine base={card.power} final={content.finalPower} power={power} />
      </InfoPanel>
    </div>
  );
}
