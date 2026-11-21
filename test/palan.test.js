import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeChart } from '../src/engine/index.js';
import { generatePalan, houseOf, dignity, analyse } from '../src/palan/index.js';

const refs = JSON.parse(readFileSync(new URL('./reference-charts.json', import.meta.url))).charts;
const fmt = (a, b) => `${a.toISOString().slice(0, 10)} - ${b.toISOString().slice(0, 10)}`;

describe('palan rules', () => {
  it('whole-sign houses counted from lagnam', () => {
    expect(houseOf(5, 5)).toBe(1);
    expect(houseOf(4, 5)).toBe(12);
    expect(houseOf(2, 11)).toBe(4);
  });
  it('dignity: uchcham, neecham, aatchi', () => {
    expect(dignity('sun', 0)).toBe('exalted');
    expect(dignity('sun', 6)).toBe('debilitated');
    expect(dignity('saturn', 10)).toBe('own');
    expect(dignity('jupiter', 9)).toBe('debilitated');
    expect(dignity('venus', 11)).toBe('exalted');
    expect(dignity('rahu', 1)).toBeNull();
  });
});

describe('palan text for reference charts', () => {
  for (const c of refs) {
    const chart = computeChart({ utc: new Date(c.utc), lat: c.lat, lon: c.lon });
    for (const lang of ['en', 'ta']) {
      it(`${c.name} (${lang})`, () => {
        const now = new Date(new Date(c.utc).getTime() + 30 * 365.25 * 86400000);
        const p = generatePalan(chart, lang, fmt, now);
        expect(p.sections.map((x) => x.key)).toEqual(['brief', 'now', 'months', 'ahead', 'areas', 'direction', 'safety', 'transits', 'nature', 'dasa', 'gochara', 'yogas', 'areasTech', 'houses', 'planets']);
        const flat = (i) => (typeof i === 'string' ? [i] : [i.h, ...(i.p || []), ...(i.tips || []), i.why].filter(Boolean));
        const text = [p.note, p.excluded, ...p.sections.flatMap((s) => [s.title, ...s.items.flatMap(flat)])].join('\n');
        expect(text).not.toMatch(/undefined|NaN|null|\[object/);
        expect(p.sections.find((x) => x.key === 'houses').items).toHaveLength(12);
        expect(p.sections.find((x) => x.key === 'planets').items).toHaveLength(9);
        // plain sections: every period and life area gives advice
        for (const k of ['months', 'ahead', 'areas']) {
          const objs = p.sections.find((x) => x.key === k).items.filter((i) => typeof i === 'object' && i.h);
          objs.forEach((o) => expect(o.tips.length, `${k} tips`).toBeGreaterThan(0));
        }
        // life areas depend on age (30 years after birth here): no education after 30
        const areaNames = p.sections.find((x) => x.key === 'areas').items.map((i) => i.h);
        expect(areaNames.length).toBeGreaterThanOrEqual(4);
        if (lang === 'en') expect(areaNames).not.toContain('Education');
        // Interpretations never assert death, lifespan or illness outcomes
        if (lang === 'en') {
          const body = p.sections.flatMap((s) => s.items.flatMap(flat)).join(' ');
          expect(body).not.toMatch(/\b(death|die|dies|lifespan|longevity|disease|illness)\b/i);
          expect(body).toMatch(/tradition/i);
        }
      });
    }
  }
});

// Synthetic chart for yoga rules: signs only
function chartOf(lagna, signs) {
  return {
    lagnam: { sign: lagna },
    planets: Object.entries(signs).map(([key, sign]) => ({ key, sign, lon: sign * 30 + 10 })),
  };
}
const base = { sun: 0, moon: 0, mars: 0, mercury: 0, jupiter: 0, venus: 0, saturn: 0, rahu: 2, ketu: 8 };
const keys = (c) => analyse(c).yogas.map((y) => y.key);

describe('yogams', () => {
  it('Gajakesari: Guru in a kendra from the Moon', () => {
    expect(keys(chartOf(0, { ...base, moon: 1, jupiter: 7 }))).toContain('gajakesari');
    expect(keys(chartOf(0, { ...base, moon: 1, jupiter: 2 }))).not.toContain('gajakesari');
  });
  it('Hamsa: Guru exalted in Kadagam in a kendra (Mesham lagnam, 4th)', () => {
    expect(keys(chartOf(0, { ...base, jupiter: 3 }))).toContain('hamsa');
  });
  it('Yogakarakan: Sani for Rishabam lagnam (9th and 10th lord)', () => {
    const y = analyse(chartOf(1, base)).yogas.find((x) => x.key === 'yogakaraka');
    expect(y.planets).toEqual(['saturn']);
  });
  it('Parivarthana: Sevvai in Rishabam, Sukkiran in Mesham', () => {
    expect(keys(chartOf(0, { ...base, mars: 1, venus: 0, sun: 4, moon: 5, mercury: 6, jupiter: 8, saturn: 10 }))).toContain('parivarthana');
  });
  it('Neecha bhanga: Guru in Magaram with Sani in a kendra', () => {
    expect(keys(chartOf(0, { ...base, jupiter: 9, saturn: 3 }))).toContain('neechaBhanga');
  });
});

describe('lordship', () => {
  it('Mesham lagnam: Sevvai owns 1st and 8th, Sani owns 10th and 11th', () => {
    const a = analyse(chartOf(0, base));
    expect(a.owns('mars')).toEqual([1, 8]);
    expect(a.owns('saturn')).toEqual([10, 11]);
    expect(a.lordOf(7)).toBe('venus');
  });
  it('aspects: Sani in 1st aspects 3rd, 7th and 10th', () => {
    const a = analyse(chartOf(0, { ...base, saturn: 0, mars: 5, jupiter: 5 }));
    expect([3, 7, 10].every((h) => a.aspectsOn(h).includes('saturn'))).toBe(true);
    expect(a.aspectsOn(4)).not.toContain('saturn');
  });
});

import { significations, matchEvents } from '../src/palan/plain.js';
import { computeChart } from '../src/engine/index.js';
describe('signification method', () => {
  const chart = computeChart({ utc: new Date('1977-07-27T19:00:00Z'), lat: 13.0827, lon: 80.2707 });
  const A = analyse(chart);
  it('a planet signifies the house it sits in and the houses it rules', () => {
    const s = significations(A, 'saturn');
    expect(s.has(A.house('saturn'))).toBe(true);
    A.owns('saturn').forEach((h) => expect(s.has(h)).toBe(true));
  });
  it('promotion needs both the 10th and 11th; age limits marriage', () => {
    expect(matchEvents(new Set([10, 11]), 40).map((e) => e.key)).toContain('promotion');
    expect(matchEvents(new Set([10]), 40).map((e) => e.key)).not.toContain('promotion');
    expect(matchEvents(new Set([2, 7, 11]), 30).map((e) => e.key)).toContain('marriage');
    expect(matchEvents(new Set([2, 7, 11]), 55).map((e) => e.key)).not.toContain('marriage');
  });
  it('the sub-period planet must back at least half of the event houses', () => {
    expect(matchEvents(new Set([10, 11]), 40, new Set([3])).map((e) => e.key)).not.toContain('promotion');
    expect(matchEvents(new Set([10, 11]), 40, new Set([10])).map((e) => e.key)).toContain('promotion');
  });
});
