import type { ReactNode } from 'react';
import { AppNav, TabBar, type NavProps } from '../nav/AppNav.tsx';
import '../../styles/home.css';

interface Props extends NavProps {
  // The deck builder has its own bottom drawer: no tab bar there.
  tabs?: boolean;
  children: ReactNode;
}

// Page frame of the home and the deck builder: navigation (header, tab bar on mobile), backdrop, content.
export function HomeShell({ children, tabs = true, ...nav }: Props): React.JSX.Element {
  return (
    <div className="arena">
      <AppNav {...nav} />
      {children}
      {tabs && <TabBar {...nav} />}
    </div>
  );
}
