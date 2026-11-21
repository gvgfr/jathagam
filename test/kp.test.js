import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { placidusCusps, kpAyanamsaMean, makeTime, jdTT } from '../src/engine/astro.js';
import { lords, houseIn, kpChart, kpFires, kpPromise, KP_EVENTS } from '../src/engine/kp.js';
import { computeChart } from '../src/engine/index.js';

const refs = JSON.parse(readFileSync(new URL('./reference-kp.json', import.meta.url)));
const arcmin = (a, b) => Math.abs(((a - b + 540) % 360) - 180) * 60;

describe('KP against Swiss Ephemeris (SIDM_KRISHNAMURTI, Placidus)', () => {
  it('ayanamsa within 1 arcsecond', () => {
    for (const r of refs) {
      const t = makeTime(new Date((r.jdUT - 2440587.5) * 86400000));
      expect(Math.abs(kpAyanamsaMean(jdTT(t)) - r.kpAyan) * 3600).toBeLessThan(1);
    }
  });
  it('all 12 Placidus cusps within 1 arcminute (40 random charts)', () => {
    for (const r of refs) {
      const c = placidusCusps(new Date((r.jdUT - 2440587.5) * 86400000), r.lat, r.lon);
      c.forEach((x, i) => expect(arcmin(x, r.cusps[i]), `cusp ${i + 1}`).toBeLessThan(1));
    }
  });
});

describe('KP sub lords', () => {
  it('star and sub lords at known points', () => {
    expect(lords(0.1)).toMatchObject({ sign: 'mars', star: 'ketu', sub: 'ketu' }); // start of Aswini
    // Aswini: Ketu sub is 7/120 of 13°20' = 0°46'40"; next sub Venus
    expect(lords(0.8).sub).toBe('venus');
    expect(lords(13.3).sub).toBe('mercury'); // last sub of Aswini
    expect(lords(13.34)).toMatchObject({ star: 'venus', sub: 'venus' }); // Bharani starts
    expect(lords(359.99)).toMatchObject({ sign: 'jupiter', star: 'mercury', sub: 'saturn' }); // end of Revathi
  });
  it('house lookup across 0°', () => {
    const cusps = [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320];
    expect(houseIn(cusps, 355)).toBe(1);
    expect(houseIn(cusps, 5)).toBe(1);
    expect(houseIn(cusps, 25)).toBe(2);
    expect(houseIn(cusps, 345)).toBe(12);
  });
});

describe('KP chart and rules', () => {
  const chart = computeChart({ utc: new Date('1977-07-27T19:00:00Z'), lat: 13.0827, lon: 80.2707 });
  const K = kpChart(chart);
  it('every house has at least its owner as significator', () => {
    for (let h = 1; h <= 12; h++) expect(K.sigOfHouse[h].has(K.owner(h))).toBe(true);
  });
  it('a planet in a house signifies it', () => {
    for (const [k, p] of Object.entries(K.planets)) expect(K.planetSig[k].has(p.house)).toBe(true);
  });
  it('rules only fire when the cusp sub-lord promises the event', () => {
    for (const key of Object.keys(KP_EVENTS))
      if (!kpPromise(K, key)) for (const a of ['sun', 'moon', 'mars']) for (const b of ['venus', 'saturn']) expect(kpFires(K, key, a, b)).toBe(false);
  });
});
