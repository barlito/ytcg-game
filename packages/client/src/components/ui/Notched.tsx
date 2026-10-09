import type { ReactNode } from 'react';

export type NotchedTone = 'default' | 'you' | 'opponent' | 'active';

interface Props {
  tone?: NotchedTone;
  // 14px notch by default, 16px when large.
  large?: boolean;
  className?: string;
  children?: ReactNode;
}

// Panel with the top-left and bottom-right corners cut; `tone` picks the border (you cyan, opponent magenta, active violet).
export function Notched({ tone = 'default', large = false, className = '', children }: Props): React.JSX.Element {
  const classes = ['notched', tone === 'default' ? '' : `tone-${tone}`, large ? 'is-lg' : '', className];
  return <div className={classes.filter(Boolean).join(' ')}>{children}</div>;
}
