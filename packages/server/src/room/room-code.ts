import { randomInt } from 'node:crypto';

// No I / O: easy to confuse with 1 / 0 when read out loud or typed.
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const CODE_LENGTH = 3;
export const FALLBACK_CODE_LENGTH = 4;
const ATTEMPTS = 50;

export function drawCode(length: number, pick: (max: number) => number = randomInt): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET.charAt(pick(CODE_ALPHABET.length));
  }
  return code;
}

// Short codes of the live rooms of one server: redraw on collision, 4 letters when 3 are crowded.
export class RoomCodes {
  private readonly live = new Set<string>();

  private readonly pick: (max: number) => number;

  constructor(pick: (max: number) => number = randomInt) {
    this.pick = pick;
  }

  allocate(): string {
    for (const length of [CODE_LENGTH, FALLBACK_CODE_LENGTH]) {
      for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
        const code = drawCode(length, this.pick);
        if (!this.live.has(code)) {
          this.live.add(code);
          return code;
        }
      }
    }
    throw new Error('no free room code');
  }

  release(code: string): void {
    this.live.delete(code);
  }
}
