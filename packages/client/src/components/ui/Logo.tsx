import wordmark from '../../assets/youl-wordmark.svg';

interface Props {
  // `nav`: DUEL at 1.875rem with 2px offsets, YOUL beside it.
  variant?: 'hero' | 'nav';
}

// Logo 7c « Arcade chromatique »: the official YOUL wordmark (never recolored) and DUEL skewed with a cyan / magenta aberration.
export function Logo({ variant = 'hero' }: Props): React.JSX.Element {
  return (
    <span className={`logo${variant === 'nav' ? ' is-nav' : ''}`} role="img" aria-label="Youl TCG Duel">
      <span className="logo__youl" aria-hidden="true">
        <img src={wordmark} alt="" draggable={false} />
      </span>
      <span className="logo__duel" aria-hidden="true">
        DUEL
      </span>
    </span>
  );
}
