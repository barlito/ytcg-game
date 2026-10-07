import { useState } from 'react';
import { artworkUrl } from '../artwork.ts';

interface Props {
  image: string | null;
  className: string;
}

// Renders nothing without artwork or when it fails to load, so the tile keeps its text-only layout.
export function Artwork({ image, className }: Props): React.JSX.Element | null {
  const [failed, setFailed] = useState(false);
  const src = artworkUrl(image);
  if (src === null || failed) {
    return null;
  }
  return (
    <img
      className={className}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => {
        setFailed(true);
      }}
    />
  );
}
