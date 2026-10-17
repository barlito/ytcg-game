import { ytcgApiUrl } from '../../ytcg/api.ts';
import { Logo } from '../ui/Logo.tsx';
import '../../styles/nav.css';

export type NavSection = 'arena' | 'decks';

export interface NavProps {
  active: NavSection;
  onArena: () => void;
  // Absent: the section does not exist in this state (no ytcg session), the entry is disabled.
  onDecks?: (() => void) | undefined;
  // Why a disabled Decks entry is disabled (default: the decks come with a Youl TCG account).
  decksHint?: string | undefined;
  // Pseudo and avatar, only when known.
  player?: string | undefined;
}

interface EntryProps {
  label: string;
  current: boolean;
  onClick?: (() => void) | undefined;
  // Shown next to a disabled entry, like « Classement · bientôt ».
  hint?: string | undefined;
}

const DECKS_HINT = 'compte Youl TCG';

function Entry({ label, current, onClick, hint }: EntryProps): React.JSX.Element {
  const disabled = onClick === undefined && !current;
  return (
    <button
      type="button"
      className={`nav__link${current ? ' is-active' : ''}`}
      aria-current={current ? 'page' : undefined}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
      {disabled && hint !== undefined && <small>{hint}</small>}
    </button>
  );
}

function collectionUrl(): string {
  return `${ytcgApiUrl()}/collection`;
}

function Player({ name }: { name: string }): React.JSX.Element {
  return (
    <div className="nav__player">
      <span className="nav__name">{name}</span>
      <span className="nav__avatar" aria-hidden="true">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export function AppNav({ active, onArena, onDecks, decksHint = DECKS_HINT, player }: NavProps): React.JSX.Element {
  const name = player?.trim() ?? '';
  return (
    <header className="nav">
      <Logo variant="nav" />
      <nav className="nav__links" aria-label="Navigation">
        <Entry label="Arène" current={active === 'arena'} onClick={onArena} />
        <Entry label="Decks" current={active === 'decks'} onClick={onDecks} hint={decksHint} />
        <span className="nav__link is-soon" aria-disabled="true">
          Classement <small>bientôt</small>
        </span>
        <a className="nav__link" href={collectionUrl()}>
          Collection ↗
        </a>
      </nav>
      {name !== '' && <Player name={name} />}
    </header>
  );
}

function Tab({ label, current, onClick, hint }: EntryProps): React.JSX.Element {
  const disabled = onClick === undefined && !current;
  return (
    <button
      type="button"
      className={`tabbar__tab${current ? ' is-active' : ''}`}
      aria-current={current ? 'page' : undefined}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="tabbar__mark" />
      {label}
      {disabled && hint !== undefined && <small>{hint}</small>}
    </button>
  );
}

// Mobile tab bar: the active entry has a glowing magenta bar above it.
export function TabBar({ active, onArena, onDecks, decksHint = DECKS_HINT }: NavProps): React.JSX.Element {
  return (
    <nav className="tabbar" aria-label="Navigation mobile">
      <Tab label="Arène" current={active === 'arena'} onClick={onArena} />
      <Tab label="Decks" current={active === 'decks'} onClick={onDecks} hint={decksHint} />
      <span className="tabbar__tab is-soon" aria-disabled="true">
        <span className="tabbar__mark" />
        Classement
      </span>
      <a className="tabbar__tab" href={collectionUrl()}>
        <span className="tabbar__mark" />
        Collection ↗
      </a>
    </nav>
  );
}
