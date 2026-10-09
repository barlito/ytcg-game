export type ProgressTone = 'default' | 'you' | 'live' | 'warn';

interface Props {
  // 0..1, clamped.
  value: number;
  tone?: ProgressTone;
  label: string;
  className?: string;
}

// Slanted progress bar (skewX -20deg); the label is the accessible name.
export function Progress({ value, tone = 'default', label, className = '' }: Props): React.JSX.Element {
  const ratio = Math.min(1, Math.max(0, value));
  const classes = ['progress', tone === 'default' ? '' : `tone-${tone}`, className];
  return (
    <div
      className={classes.filter(Boolean).join(' ')}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
    >
      <div className="progress__fill" style={{ '--value': ratio } as React.CSSProperties} />
    </div>
  );
}
