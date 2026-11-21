import { describe, it, expect } from 'vitest';
import { robustCheck, modelGrid, baseRate, brier, pooledLogBF } from '../src/bayes/robust.js';
import { computeChart } from '../src/engine/index.js';
import { antarams } from '../src/engine/dasa.js';
import { analyse } from '../src/palan/index.js';
import { ruleFires } from '../src/palan/plain.js';

const lat = 13.0827, lon = 80.2707;
const utc = new Date('1977-07-27T19:00:00Z');
const now = new Date('2026-11-21T00:00:00Z');

describe('robust model pieces', () => {
  it('model grid: 12 simplified + 6 KP variants', () => {
    const g = modelGrid();
    expect(g).toHaveLength(18);
    expect(new Set(g.map((m) => m.id)).size).toBe(18);
  });
  it('age-aware base rates peak where events are common', () => {
    expect(baseRate('marriage', 28)).toBeGreaterThan(baseRate('marriage', 50) * 10);
    expect(baseRate('childbirth', 32)).toBeGreaterThan(baseRate('childbirth', 20));
    expect(baseRate('parents', 55)).toBeGreaterThan(baseRate('parents', 30));
  });
  it('pooled Bayes factor is 1 when the data carry no information', () => {
    expect(pooledLogBF(new Float64Array(101))).toBeCloseTo(0, 10);
  });
  it('Brier score', () => {
    const b = brier([{ p: 0.8, base: 0.5, outcome: 1 }, { p: 0.2, base: 0.5, outcome: 0 }, { p: 0.5, base: 0.5 }]);
    expect(b.n).toBe(2);
    expect(b.model).toBeCloseTo(0.04, 6);
    expect(b.chance).toBeCloseTo(0.25, 6);
  });
});

// A synthetic life whose events follow the simplified rules (Lahiri, mean node, 365.25-day dasa)
function ruleLife(kinds, perKind = 4) {
  const chart = computeChart({ utc, lat, lon });
  const A = analyse(chart);
  const rep = Object.fromEntries(kinds.map((k) => [k, []]));
  for (const p of chart.dasa.periods)
    for (const b of p.bhuktis)
      for (const an of antarams(b)) {
        const mid = new Date((an.start.getTime() + an.end.getTime()) / 2);
        const age = (mid - utc) / (365.25 * 86400000);
        if (age < 18 || mid > now) continue;
        for (const k of kinds) if (ruleFires(A, k, b.lord, an.lord) && rep[k].length < perKind) rep[k].push({ year: mid.getUTCFullYear(), month: mid.getUTCMonth() + 1 });
      }
  return rep;
}

describe('robust check on synthetic lives', () => {
  it('detects a life that follows the rules, picks the right family, and passes out-of-sample', () => {
    const rep = ruleLife(['jobChange', 'property', 'homeMove', 'setback', 'promotion']);
    const r = robustCheck({ utc, lat, lon }, rep, { toleranceMin: 0, now });
    expect(r.avgBF).toBeGreaterThan(3);
    expect(r.lambda.mean).toBeGreaterThan(0.25);
    const simplifiedLahiri = r.models.filter((m) => m.system === 'parasari' && m.ayanamsa === 'lahiri').reduce((a, m) => a + m.post, 0);
    expect(simplifiedLahiri).toBeGreaterThan(0.5);
    expect(r.oos.testBF).toBeGreaterThan(1);
  });
  it('does not find a pattern in an arbitrary life', () => {
    const y = (...ys) => ys.map((year) => ({ year }));
    const rep = { jobChange: y(2001, 2006, 2013, 2019), homeMove: y(2002, 2007, 2016), property: y(2011) };
    const r = robustCheck({ utc, lat, lon }, rep, { toleranceMin: 0, now });
    expect(r.avgBF).toBeLessThan(3);
  });
});
