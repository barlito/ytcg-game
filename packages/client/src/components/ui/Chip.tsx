import type { ReactNode } from 'react';

export type ChipTone = 'default' | 'live' | 'warn' | 'magenta' | 'cyan';

interface Props {
  tone?: ChipTone;
  // Filled violet (a selected filter chip); with tone cyan, filled cyan.
  active?: boolean;
  solid?: boolean;
  className?: string;
  children: ReactNode;
}

// Mono uppercase pill: status, filter, counter.
export function Chip({
  tone = 'default',
  active = false,
  solid = false,
  className = '',
  children,
}: Props): React.JSX.Element {
  const classes = [
    'chip',
    tone === 'default' ? '' : `tone-${tone}`,
    active ? 'is-active' : '',
    solid ? 'is-solid' : '',
    className,
  ];
  return <span className={classes.filter(Boolean).join(' ')}>{children}</span>;
}
