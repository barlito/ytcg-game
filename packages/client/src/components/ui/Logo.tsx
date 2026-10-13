import youlLogo from '../../assets/youl-logo.svg';

interface Props {
  // `nav`: DUEL at 1.875rem with 2px offsets, YOUL beside it.
  variant?: 'hero' | 'nav';
}

// Logo 7c « Arcade chromatique »: the YOUL glyphs of the ytcg wordmark, solid and DUEL skewed with a cyan / magenta aberration.
export function Logo({ variant = 'hero' }: Props): React.JSX.Element {
  return (
    <span className={`logo${variant === 'nav' ? ' is-nav' : ''}`} role="img" aria-label="Youl TCG Duel">
      <span className="logo__youl" aria-hidden="true">
        <img src={youlLogo} alt="" draggable={false} />
      </span>
      <span className="logo__duel" aria-hidden="true">
        DUEL
      </span>
    </span>
  );
}
