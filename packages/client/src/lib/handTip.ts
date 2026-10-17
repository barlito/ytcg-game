// Where a card tooltip shows: above its card, docked at the top of the screen, or not at all.
export type TipMode = 'anchor' | 'top' | 'off';

// A selected hand card must not hide the « Poser ici » buttons: its text is printed on the card when the hand is wide,
// else its tooltip stays open, docked at the top, away from the drop targets.
export function handTip(selected: boolean, narrow: boolean): TipMode {
  if (!selected) {
    return 'anchor';
  }
  return narrow ? 'top' : 'off';
}
