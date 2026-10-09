// The pointer variables the ported ytcg holo recipes read (card_tilt.js), from a pointer position in 0..1 of the card.
export function holoPose(x: number, y: number): Record<string, string> {
  const fromCenter = Math.min(1, Math.hypot(x - 0.5, y - 0.5) * 2);
  return {
    '--pointer-x': `${(x * 100).toFixed(1)}%`,
    '--pointer-y': `${(y * 100).toFixed(1)}%`,
    '--pointer-from-left': x.toFixed(3),
    '--pointer-from-top': y.toFixed(3),
    '--pointer-from-center': fromCenter.toFixed(3),
    // ytcg damps the background position to 37..63 % / 33..67 %.
    '--background-x': `${(37 + 26 * x).toFixed(1)}%`,
    '--background-y': `${(33 + 34 * y).toFixed(1)}%`,
  };
}
