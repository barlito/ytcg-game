import { type CardDefinition, describeCard, statusRule } from '@ytcg-game/engine';
import { catalog } from '../../catalog.ts';
import type { CostFlow } from '../../animation/fx.ts';
import type { PowerTrend } from '../../power.ts';
import { effectLines, effectTier } from './effectText.ts';
import { type RarityKey, rarityGlyph } from './rarity.ts';

// full: hand, previews, spotlight (effect text). compact: board, grids (no text). mini: small board cards (power only).
export type CardSize = 'full' | 'compact' | 'mini';

const TREND_LABEL = { up: ' renforcée', down: ' affaiblie', even: '' } as const;

interface ManaProps {
  cost: number;
  // The printed cost: a different one outlines the badge (cheaper green, pricier red).
  printed?: number | undefined;
  // The change playing in the replay: the badge pulses and shows « old → new ».
  flow?: CostFlow | null;
}

function costTone(cost: number, printed: number | undefined): string {
  if (printed === undefined || printed === cost) {
    return '';
  }
  return cost < printed ? ' is-cheaper' : ' is-pricier';
}

export function ManaBadge({ cost, printed, flow = null }: ManaProps): React.JSX.Element {
  const pulse = flow === null ? '' : ` fx-cost-pulse ${flow.delta < 0 ? 'is-cheaper' : 'is-pricier'}`;
  return (
    <span className={`tbadge tbadge--mana${costTone(cost, printed)}${pulse}`} aria-label={`Coût ${cost}`}>
      <span className="tbadge__shape">
        <span className="tbadge__num">{cost}</span>
      </span>
      {flow !== null && flow.from !== flow.to && (
        <span className="tbadge__flow">
          {flow.from} → {flow.to}
        </span>
      )}
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
  costFlow: CostFlow | null;
}

// The « biseau verre » band: slanted glass, neon edge, effect text (full only) and the mana / rarity / power row.
export function CardBand({ definition, rarity, size, cost, power, trend, costFlow }: BandProps): React.JSX.Element {
  return (
    <>
      <span className="tband">
        <span className="tband__blur" />
        <span className="tband__glass" />
        <span className="tband__edge" />
        {size === 'full' && <EffectText definition={definition} />}
      </span>
      <span className="tband__badges">
        <ManaBadge cost={cost} printed={size === 'full' ? definition.cost : undefined} flow={costFlow} />
        <span className="tband__rarity">{rarityGlyph(rarity)}</span>
        <PowerBadge power={power} trend={trend} />
      </span>
    </>
  );
}
