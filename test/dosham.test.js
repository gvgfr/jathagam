import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { sevvaiDosham, raaguKethuDosham, kalaSarpaDosham, doshams } from '../src/engine/dosham.js';
import { computeChart } from '../src/engine/index.js';

// Minimal synthetic chart: signs only matter, except longitudes for kala sarpa
function chart({ lagna = 0, ...signs }) {
  const def = { sun: 0, moon: 0, mars: 0, mercury: 0, jupiter: 0, venus: 0, saturn: 0, rahu: 0, ketu: 6 };
  const s = { ...def, ...signs };
  return {
    lagnam: { sign: lagna },
    planets: Object.entries(s).map(([key, sign]) => ({ key, sign, lon: sign * 30 + 15 })),
  };
}

describe('sevvai dosham', () => {
  it('Mars in 7th from lagnam is triggered', () => {
    const d = sevvaiDosham(chart({ lagna: 0, mars: 6, moon: 2, venus: 2 }));
    expect(d.triggered).toBe(true);
    expect(d.present).toBe(true);
    expect(d.refs[0]).toMatchObject({ from: 'lagnam', house: 7, inHouse: true });
  });
  it('Mars in 7th but in Magaram (exalted) is cancelled', () => {
    const d = sevvaiDosham(chart({ lagna: 3, mars: 9, moon: 0, venus: 0, jupiter: 1 }));
    expect(d.triggered).toBe(true);
    expect(d.cancelled).toBe(true);
    expect(d.present).toBe(false);
    expect(d.exceptions).toContain('marsExalted');
  });
  it('Mars with Jupiter cancels', () => {
    const d = sevvaiDosham(chart({ lagna: 0, mars: 1, jupiter: 1, moon: 5, venus: 5 }));
    expect(d.refs[0].house).toBe(2);
    expect(d.exceptions).toContain('withJupiter');
    expect(d.present).toBe(false);
  });
  it('Mars in 3rd from lagnam and Moon: not triggered', () => {
    const d = sevvaiDosham(chart({ lagna: 0, mars: 2, moon: 0, venus: 10 }));
    expect(d.triggered).toBe(false);
  });
  it('from Venus alone does not trigger', () => {
    const d = sevvaiDosham(chart({ lagna: 0, mars: 2, moon: 0, venus: 8 }));
    expect(d.refs[2]).toMatchObject({ house: 7, inHouse: true });
    expect(d.triggered).toBe(false);
  });
});

describe('raagu-kethu dosham', () => {
  it('Raagu in lagnam is triggered', () => {
    expect(raaguKethuDosham(chart({ lagna: 4, rahu: 4, ketu: 10, moon: 2 })).present).toBe(true);
  });
  it('nodes in 3rd/9th from both lagnam and Moon: not triggered', () => {
    expect(raaguKethuDosham(chart({ lagna: 0, moon: 0, rahu: 2, ketu: 8 })).present).toBe(false);
  });
});

describe('kala sarpa dosham', () => {
  it('all planets between Raagu and Kethu', () => {
    const c = chart({ rahu: 0, ketu: 6, sun: 1, moon: 2, mars: 3, mercury: 4, jupiter: 5, venus: 1, saturn: 2 });
    c.planets.find((p) => p.key === 'rahu').lon = 5;
    c.planets.find((p) => p.key === 'ketu').lon = 185;
    const d = kalaSarpaDosham(c);
    expect(d.present).toBe(true);
    expect(d.variant).toBe('sarpa');
  });
  it('planets on both sides: not present', () => {
    const c = chart({ rahu: 0, ketu: 6, sun: 1, moon: 8 });
    c.planets.find((p) => p.key === 'rahu').lon = 5;
    expect(kalaSarpaDosham(c).present).toBe(false);
  });
});

describe('real charts', () => {
  const refs = JSON.parse(readFileSync(new URL('./reference-charts.json', import.meta.url))).charts;
  it('returns three results for every reference chart', () => {
    for (const c of refs) {
      const r = doshams(computeChart({ utc: new Date(c.utc), lat: c.lat, lon: c.lon }));
      expect(r.map((d) => d.key)).toEqual(['sevvai', 'raaguKethu', 'kalaSarpa']);
      r.forEach((d) => expect(typeof d.present).toBe('boolean'));
    }
  });
});
