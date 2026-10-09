export type Lead = 'you' | 'opponent' | 'tie';

// Who leads a location from its two powers.
export function leadOf(power: { you: number; opponent: number }): Lead {
  if (power.you === power.opponent) {
    return 'tie';
  }
  return power.you > power.opponent ? 'you' : 'opponent';
}
