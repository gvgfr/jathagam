import { describe, it, expect } from 'vitest';
import { ashtakavarga } from '../src/engine/ashtakavarga.js';
import { dasamsaSign, saptamsaSign } from '../src/engine/vargas.js';
import { vimshottari, antarams } from '../src/engine/dasa.js';
import { transitWindows, monthlyPositions } from '../src/engine/transit.js';

describe('ashtakavarga', () => {
  it('fixed totals per planet and 337 overall, for any chart', () => {
    for (const signs of [
      { sun: 0, moon: 0, mars: 0, mercury: 0, jupiter: 0, venus: 0, saturn: 0, lagnam: 0 },
      { sun: 3, moon: 7, mars: 11, mercury: 2, jupiter: 5, venus: 9, saturn: 1, lagnam: 4 },
    ]) {
      const { bav, sav } = ashtakavarga(signs);
      const tot = (a) => a.reduce((x, y) => x + y, 0);
      expect(Object.fromEntries(Object.entries(bav).map(([k, v]) => [k, tot(v)]))).toEqual({ sun: 48, moon: 49, mars: 39, mercury: 54, jupiter: 56, venus: 52, saturn: 39 });
      expect(tot(sav)).toBe(337);
      bav.sun.forEach((v) => expect(v).toBeLessThanOrEqual(8));
    }
  });
});

describe('divisional charts', () => {
  it('D10: Mesham 0-3° -> Mesham; Rishabam 0-3° -> Magaram (9th from it)', () => {
    expect(dasamsaSign(1)).toBe(0);
    expect(dasamsaSign(31)).toBe(9);
    expect(dasamsaSign(29.9)).toBe(9); // Mesham last part -> 10th from Mesham
  });
  it('D7: Mesham first part -> Mesham; Rishabam first part -> Viruchigam (7th)', () => {
    expect(saptamsaSign(1)).toBe(0);
    expect(saptamsaSign(31)).toBe(7);
    expect(saptamsaSign(29.99)).toBe(6);
  });
});

describe('antaram', () => {
  it('nine sub-periods tile the bhukti, starting with its lord', () => {
    const d = vimshottari(100, new Date('2000-01-01T00:00:00Z'));
    const b = d.periods[1].bhuktis[3];
    const a = antarams(b);
    expect(a).toHaveLength(9);
    expect(a[0].lord).toBe(b.lord);
    expect(a[0].start.getTime()).toBe(b.start.getTime());
    expect(Math.abs(a[8].end - b.end)).toBeLessThan(2);
  });
});

describe('transit windows', () => {
  it('Saturn in Meenam spans 2025-2027', () => {
    const w = transitWindows('saturn', [11], new Date('2025-01-01'), new Date('2028-01-01'), 5);
    expect(w[0].start.getUTCFullYear()).toBe(2025);
    expect(w[0].end.getUTCFullYear()).toBe(2027);
  });
  it('monthly positions', () => {
    const m = monthlyPositions(new Date('2026-11-21'), 12);
    expect(m).toHaveLength(12);
    expect(m[0].saturn).toBe(11);
  });
});
