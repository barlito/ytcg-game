import type { ReactNode } from 'react';

// The « EFFET DÉCLENCHÉ » block: the full effect text from the engine.
export function EffectBlock({ text }: { text: readonly string[] }): React.JSX.Element {
  return (
    <div className="spotlight__effect">
      <span className="spotlight__effect-label">{text.length === 0 ? 'Effet' : 'Effet déclenché'}</span>
      {text.length === 0 ? (
        <p className="spotlight__text is-empty">Aucun effet.</p>
      ) : (
        text.map((line) => (
          <p key={line} className="spotlight__text">
            {line}
          </p>
        ))
      )}
    </div>
  );
}

interface PowerProps {
  base: number;
  final: number;
  // The value the counter shows now.
  power: number;
}

function powerTone(power: number, base: number): string {
  if (power === base) {
    return '';
  }
  return power > base ? 'is-up' : 'is-down';
}

// « PUISSANCE 7 → 13 »: the number counts step by step, green once above the base.
export function PowerLine({ base, final, power }: PowerProps): React.JSX.Element {
  return (
    <p className="spotlight__power">
      <span className="spotlight__power-label">Puissance</span>
      {final !== base && (
        <>
          <span className="spotlight__power-base">{base}</span>
          <span className="spotlight__power-arrow" aria-hidden="true">
            →
          </span>
        </>
      )}
      <span className={`spotlight__power-now ${powerTone(power, base)}`}>{power}</span>
    </p>
  );
}

interface InfoProps {
  eyebrow: string;
  name: string;
  meta: string;
  children: ReactNode;
}

export function InfoPanel({ eyebrow, name, meta, children }: InfoProps): React.JSX.Element {
  return (
    <div className="spotlight__info">
      <div className="spotlight__head">
        <span className="spotlight__eyebrow">{eyebrow}</span>
        <span className="spotlight__name">{name}</span>
        <span className="spotlight__meta">{meta}</span>
      </div>
      {children}
    </div>
  );
}
