// ytcg serves its Vich uploads (card artwork) under /uploads/cards/.
const DEFAULT_YTCG_URL = 'https://ytcg.youlz.fr';

function ytcgUrl(): string {
  const configured: unknown = import.meta.env.VITE_YTCG_URL;
  return typeof configured === 'string' && configured !== '' ? configured.replace(/\/+$/, '') : DEFAULT_YTCG_URL;
}

export function artworkUrl(image: string | null): string | null {
  return image === null ? null : `${ytcgUrl()}/uploads/cards/${encodeURIComponent(image)}`;
}
