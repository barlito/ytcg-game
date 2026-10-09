import { describe, expect, it } from 'vitest';
import { CODE_ALPHABET, RoomCodes, drawCode } from '../src/room/room-code.ts';

describe('room codes', () => {
  it('draws letters of the alphabet only, without I and O', () => {
    expect(CODE_ALPHABET).not.toMatch(/[IO]/);
    for (let i = 0; i < 200; i++) {
      expect(drawCode(3)).toMatch(/^[A-HJ-NP-Z]{3}$/);
    }
  });

  it('hands a released code out again', () => {
    const codes = new RoomCodes(() => 0);
    codes.allocate();
    codes.release('AAA');
    expect(codes.allocate()).toBe('AAA');
  });

  it('redraws when the code is taken', () => {
    const draws = [0, 0, 0, 0, 0, 0, 1, 1, 1];
    const codes = new RoomCodes(() => draws.shift() ?? 2);
    expect(codes.allocate()).toBe('AAA');
    expect(codes.allocate()).toBe('BBB');
  });

  it('falls back to 4 letters when 3-letter codes keep colliding', () => {
    let calls = 0;
    const codes = new RoomCodes(() => {
      calls++;
      return calls > 153 ? calls % CODE_ALPHABET.length : 0;
    });
    expect(codes.allocate()).toBe('AAA');
    expect(codes.allocate()).toMatch(/^[A-Z]{4}$/);
  });
});
