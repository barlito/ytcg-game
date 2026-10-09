import { describe, expect, it } from 'vitest';
import { ROOM_CODE_MAX_LENGTH, normalizeRoomCode } from '../src/lib/roomCode.ts';

describe('normalizeRoomCode', () => {
  it('uppercases and drops spaces and dashes', () => {
    expect(normalizeRoomCode('kqx')).toBe('KQX');
    expect(normalizeRoomCode('  k q x ')).toBe('KQX');
    expect(normalizeRoomCode('K-Q-X')).toBe('KQX');
    expect(normalizeRoomCode('k–q\tx\n')).toBe('KQX');
  });

  it('keeps an empty entry empty', () => {
    expect(normalizeRoomCode(' - ')).toBe('');
  });

  it('allows the 4-letter fallback code', () => {
    expect(ROOM_CODE_MAX_LENGTH).toBe(4);
  });
});
