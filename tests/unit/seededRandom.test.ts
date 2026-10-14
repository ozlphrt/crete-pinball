import { describe, it, expect } from 'vitest';
import { SeededRandom } from '../../src/game/physics/seededRandom';

describe('SeededRandom', () => {
  it('reproduces exact identical sequence when given the same seed', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);

    const seq1 = Array.from({ length: 20 }, () => rng1.next());
    const seq2 = Array.from({ length: 20 }, () => rng2.next());

    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(54321);

    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());

    expect(seq1).not.toEqual(seq2);
  });

  it('produces numbers strictly within [0, 1) range', () => {
    const rng = new SeededRandom(999);
    for (let i = 0; i < 500; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('generates integers within specified [min, max] range', () => {
    const rng = new SeededRandom(42);
    for (let i = 0; i < 200; i++) {
      const intVal = rng.nextInt(5, 15);
      expect(intVal).toBeGreaterThanOrEqual(5);
      expect(intVal).toBeLessThanOrEqual(15);
      expect(Number.isInteger(intVal)).toBe(true);
    }
  });
});
