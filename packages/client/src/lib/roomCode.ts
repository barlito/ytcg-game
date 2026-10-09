// Longest code the server hands out (3 letters, 4 when crowded).
export const ROOM_CODE_MAX_LENGTH = 4;

// Friend code typed by hand: any case, spaces and dashes (« k7-q2x », « KQ X ») are tolerated.
export function normalizeRoomCode(raw: string): string {
  return raw.replace(/[\s\-–—]+/g, '').toUpperCase();
}
