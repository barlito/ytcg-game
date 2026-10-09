import { type CardDefinition, describeCard, statusRule } from '@ytcg-game/engine';
import { catalog } from '../../catalog.ts';
import type { PowerTrend } from '../../power.ts';
import { effectLines, effectTier } from './effectText.ts';
import { type RarityKey, rarityGlyph } from './rarity.ts';

// full: hand, previews, spotlight (effect text). compact: board, grids (no text). mini: small board cards (power only).
export type CardSize = 'full' | 'compact' | 'mini';

const TREND_LABEL = { up: ' renforcée', down: ' affaiblie', even: '' } as const;

export function ManaBadge({ cost }: { cost: number }): React.JSX.Element {
  return (
    <span className="tbadge tbadge--mana" aria-label={`Coût ${cost}`}>
      <span className="tbadge__shape">
        <span className="tbadge__num">{cost}</span>
      </span>
    </span>
  );
}

export function PowerBadge({ power, trend }: { power: number; trend: PowerTrend }): React.JSX.Element {
  return (
    <span className={`tbadge tbadge--power trend-${trend}`} aria-label={`Puissance ${power}${TREND_LABEL[trend]}`}>
      <span className="tbadge__shape">
        <span className="tbadge__num">{power}</span>
      </span>
    </span>
  );
}

// The effect text of a card, its status keywords in pink; the wording comes from the engine.
export function EffectText({ definition }: { definition: CardDefinition }): React.JSX.Element {
  const printed = describeCard(catalog, definition);
  const lines = effectLines(
    printed,
    definition.statuses.map((status) => statusRule(status).name),
  );
  return (
    <span className="tband__text" data-tier={effectTier(printed)}>
      {lines.map(({ keyword, text }) => (
        <span key={`${keyword}${text}`}>
          {keyword !== '' && <span className="tband__keyword">{keyword}</span>}
          {text !== '' && `${keyword === '' ? '' : ' '}${text}`}{' '}
        </span>
      ))}
    </span>
  );
}

interface BandProps {
  definition: CardDefinition;
  rarity: RarityKey;
  size: CardSize;
  cost: number;
  power: number;
  trend: PowerTrend;
}

// The « biseau verre » band: slanted glass, neon edge, effect text (full only) and the mana / rarity / power row.
export function CardBand({ definition, rarity, size, cost, power, trend }: BandProps): React.JSX.Element {
  return (
    <>
      <span className="tband">
        <span className="tband__glass" />
        <span className="tband__edge" />
        {size === 'full' && <EffectText definition={definition} />}
      </span>
      <span className="tband__badges">
        <ManaBadge cost={cost} />
        <span className="tband__rarity">{rarityGlyph(rarity)}</span>
        <PowerBadge power={power} trend={trend} />
      </span>
    </>
  );
}
