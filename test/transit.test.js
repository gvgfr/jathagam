import { describe, it, expect } from 'vitest';
import { gocharam } from '../src/engine/transit.js';

// Known sidereal (Lahiri) ingresses: Saturn entered Meenam on 29 Mar 2025;
// Saturn was in Kumbam from Jan 2023.
describe('gocharam', () => {
  it('Saturn in Meenam in Nov 2026, since late Mar 2025', () => {
    const g = gocharam(9, new Date('2026-11-21T00:00:00Z'));
    expect(g.saturn.sign).toBe(11);
    expect(g.saturn.house).toBe(3);
    const since = g.saturn.since.toISOString().slice(0, 10);
    expect(since >= '2025-03-27' && since <= '2025-03-31').toBe(true);
  });
  it('Ezharai Sani for Kumbam rasi is active in 2026 (Saturn in 2nd from Moon)', () => {
    const g = gocharam(10, new Date('2026-11-21T00:00:00Z'));
    expect(g.sadeSati.active).toBe(true);
    expect(g.sadeSati.phase).toBe(3);
    expect(g.sadeSati.start.getUTCFullYear()).toBe(2020); // Saturn entered Magaram Jan 2020
    expect(g.sadeSati.end.getUTCFullYear()).toBe(2027);
  });
});
