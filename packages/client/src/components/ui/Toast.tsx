import type { ReactNode } from 'react';

interface Props {
  title?: string;
  tone?: 'default' | 'danger';
  // Fixed at the bottom of the screen.
  floating?: boolean;
  children: ReactNode;
}

// Violet left border, magenta mono title: the one element that casts a shadow.
export function Toast({ title, tone = 'default', floating = false, children }: Props): React.JSX.Element {
  const classes = ['toast', tone === 'default' ? '' : `tone-${tone}`, floating ? 'is-floating' : ''];
  return (
    <div className={classes.filter(Boolean).join(' ')} role={tone === 'danger' ? 'alert' : 'status'}>
      {title !== undefined && <span className="toast__title">{title}</span>}
      {children}
    </div>
  );
}
