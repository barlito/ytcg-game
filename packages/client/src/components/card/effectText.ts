export interface EffectLine {
  // The status keyword in bold pink (« Coriace. »), empty for an ability line.
  keyword: string;
  text: string;
}

// `describeCard` prints the status lines first (« Folie. » or « Défonce (règle). »), then the abilities.
export function effectLines(lines: readonly string[], statusNames: readonly string[]): EffectLine[] {
  return lines.map((line, index) => {
    const name = statusNames[index];
    if (name === undefined || !line.startsWith(name)) {
      return { keyword: '', text: line };
    }
    const rest = line.slice(name.length);
    return rest === '.' ? { keyword: line, text: '' } : { keyword: name, text: rest };
  });
}

// Font size step of the effect text: the longer the text, the smaller the type (the band also grows if needed).
export type EffectTier = 1 | 2 | 3;
export const TIER_MAX_LENGTH = { 1: 90, 2: 130 } as const;

export function effectTier(lines: readonly string[]): EffectTier {
  const length = lines.join(' ').length;
  if (length <= TIER_MAX_LENGTH[1]) {
    return 1;
  }
  return length <= TIER_MAX_LENGTH[2] ? 2 : 3;
}
