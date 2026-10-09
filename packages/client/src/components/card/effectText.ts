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
