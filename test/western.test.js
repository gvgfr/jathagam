// Numerical-correctness and logic tests for the Westran-inspired timing
// engine and its research harness. None of these is a predictive-validation
// result: predictive performance has not been evaluated.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  tropicalLongitude, progressedInstant, positions, norm180, angularSeparation, aspectDeviation, aspectBetween,
  configurations, natalAspects, snapshot, timeline, timelineWithUncertainty, samePerson, YEAR_DAYS, DAY, MODEL_VERSION,
} from '../src/western/engine.js';
import { parseDatePrecision, validate, components, assignSplits, describe as describeData, generatedPartnerComparison, generatePartners, NOT_EVALUATED } from '../src/western/research.js';
import { DEFAULTS } from '../src/western/engine.js';
import { WUI } from '../src/i18n.js';

const ref = JSON.parse(readFileSync(new URL('./reference-western.json', import.meta.url)));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/western-synthetic.json', import.meta.url)));
const A = { birth: new Date('1977-07-27T19:00:00Z') };
const B = { birth: new Date('1980-03-10T08:00:00Z') };

describe('positions (numerical)', () => {
  it('Sun and Venus match Swiss Ephemeris (tropical, apparent, true equinox) within 10″', () => {
    for (const r of ref.rows) {
      const d = new Date(r.utc);
      expect(Math.abs(norm180(tropicalLongitude('sun', d) - r.sun)) * 3600, `${r.utc} sun`).toBeLessThan(10);
      expect(Math.abs(norm180(tropicalLongitude('venus', d) - r.venus)) * 3600, `${r.utc} venus`).toBeLessThan(10);
    }
  });
  it('rejects other bodies', () => expect(() => tropicalLongitude('mars', new Date())).toThrow());
});

describe('secondary progression mapping', () => {
  it('one year of life (yearDays) = one day after birth', () => {
    for (const yd of Object.values(YEAR_DAYS)) {
      const t = new Date(A.birth.getTime() + yd * DAY);
      expect(progressedInstant(A.birth, t, yd).getTime() - A.birth.getTime()).toBeCloseTo(DAY, 3);
    }
  });
  it('40 years: tropical vs Julian year differ by about a minute', () => {
    const t = new Date('2017-07-27T19:00:00Z');
    const diff = progressedInstant(A.birth, t, YEAR_DAYS.tropical) - progressedInstant(A.birth, t, YEAR_DAYS.julian);
    expect(diff / 60000).toBeGreaterThan(1);
    expect(diff / 60000).toBeLessThan(1.5);
  });
  it('leap-day birth and target dates are plain instants (no calendar arithmetic)', () => {
    const leap = new Date('2000-02-29T12:00:00Z');
    const target = new Date('2001-02-28T17:49:00Z'); // ~365.24 days later
    const p = progressedInstant(leap, target, YEAR_DAYS.tropical);
    expect(Math.abs(p - leap - DAY) / 60000).toBeLessThan(2);
    expect(progressedInstant(leap, leap).getTime()).toBe(leap.getTime());
  });
  it('the progressed Sun moves about a degree per year', () => {
    const p0 = positions(A.birth, new Date('2000-01-01T00:00:00Z')).sun;
    const p1 = positions(A.birth, new Date('2001-01-01T00:00:00Z')).sun;
    expect(norm180(p1 - p0)).toBeGreaterThan(0.9);
    expect(norm180(p1 - p0)).toBeLessThan(1.1);
  });
});

describe('angles and aspects', () => {
  it('wraps around 0°/360°', () => {
    expect(angularSeparation(359, 1)).toBeCloseTo(2, 12);
    expect(angularSeparation(1, 359)).toBeCloseTo(2, 12);
    expect(angularSeparation(10, 190)).toBeCloseTo(180, 12);
    expect(norm180(-190)).toBeCloseTo(170, 12);
    expect(aspectBetween(359.5, 0.5, ['conjunction'], 2)?.aspect).toBe('conjunction');
    expect(aspectBetween(0.5, 180.5 + 1.9, ['opposition'], 2)?.aspect).toBe('opposition');
  });
  it('trines on either side, oppositions across 0°', () => {
    expect(aspectDeviation(130, 10, 'trine').dev).toBeCloseTo(0, 12);
    expect(aspectDeviation(10, 130, 'trine').dev).toBeCloseTo(0, 12);
    expect(aspectDeviation(350, 230, 'trine').dev).toBeCloseTo(0, 12);
    expect(aspectDeviation(5, 185, 'opposition').dev).toBeCloseTo(0, 12);
  });
  it('orb boundary is inclusive; just beyond is excluded', () => {
    expect(aspectBetween(0, 120 + 2, ['trine'], 2)).toEqual({ aspect: 'trine', orb: 2 });
    expect(aspectBetween(0, 120 + 2 + 1e-6, ['trine'], 2)).toBeNull();
    const o201 = 2 + 1 / 60;
    expect(aspectBetween(0, 122.01, ['trine'], 2)).toBeNull();
    expect(aspectBetween(0, 122.01, ['trine'], o201)?.aspect).toBe('trine');
    expect(aspectBetween(0, 90, ['conjunction', 'trine', 'opposition'], 2)).toBeNull(); // squares are not in the set
  });
});

describe('configurations and partner directions', () => {
  it('8 distinct configurations: 4 layers × 2 directions', () => {
    const c = configurations();
    expect(c).toHaveLength(8);
    expect(new Set(c.map((x) => x.id)).size).toBe(8);
  });
  it('swapping partners maps A.sun-B.venus onto A.venus-B.sun with layers reversed (no double counting)', () => {
    const t = new Date('2005-06-01T00:00:00Z');
    const ab = snapshot(A, B, t);
    const ba = snapshot(B, A, t);
    for (const x of ab) {
      const dir = x.dir === 'A.sun-B.venus' ? 'A.venus-B.sun' : 'A.sun-B.venus';
      const y = ba.find((z) => z.layer === x.layer[1] + x.layer[0] && z.dir === dir);
      expect(angularSeparation(x.lonA, x.lonB)).toBeCloseTo(angularSeparation(y.lonA, y.lonB), 9);
    }
  });
  it('the same person twice is not a pair', () => {
    expect(samePerson({ birth: A.birth, lat: 1, lon: 2 }, { birth: new Date(A.birth), lat: 1, lon: 2 })).toBe(true);
    expect(timeline(A, { birth: new Date(A.birth) }, new Date('2000-01-01'), new Date('2010-01-01'))).toEqual([]);
  });
});

// a partner whose natal Venus sits within 0.5° of A's natal Sun (found by search, not hand-entered)
function partnerWithVenusOn(sunLon) {
  for (let t = Date.UTC(1978, 0, 1); t < Date.UTC(1986, 0, 1); t += DAY) {
    const d = new Date(t);
    if (angularSeparation(tropicalLongitude('venus', d), sunLon) < 0.5) return { birth: d };
  }
  throw new Error('none found');
}

describe('natal constants vs changing timing signals', () => {
  it('a natal–natal aspect is reported once as permanent and never enters the timeline', () => {
    const C = partnerWithVenusOn(positions(A.birth).sun);
    const nat = natalAspects(A, C);
    expect(nat.some((n) => n.layer === 'NN' && n.dir === 'A.sun-B.venus' && n.aspect === 'conjunction')).toBe(true);
    const snaps = [new Date('1995-01-01'), new Date('2015-01-01')].map((d) => snapshot(A, C, d).find((x) => x.layer === 'NN' && x.dir === 'A.sun-B.venus'));
    for (const s of snaps) expect(s).toMatchObject({ permanent: true, active: true });
    const tl = timeline(A, C, new Date('1995-01-01'), new Date('2015-01-01'));
    expect(tl.every((w) => w.layer !== 'NN')).toBe(true);
  });
});

describe('timeline entry / exit', () => {
  const from = new Date('1995-01-01T00:00:00Z');
  const to = new Date('2030-01-01T00:00:00Z');
  const tl = timeline(A, B, from, to);
  it('finds windows with exact instants inside them', () => {
    expect(tl.length).toBeGreaterThan(0);
    for (const w of tl) {
      expect(w.end > w.start).toBe(true);
      for (const e of w.exact) expect(e >= w.start && e <= w.end).toBe(true);
    }
  });
  it('edges are within the stated resolution: out of orb a few days before, in orb a few days after', () => {
    const orbAt = (w, d) => snapshot(A, B, d).find((x) => x.id === w.id);
    for (const w of tl.filter((x) => !x.openStart && !x.openEnd)) {
      const before = snapshot(A, B, new Date(w.start - 3 * DAY)).find((x) => x.id === w.id);
      const inside = snapshot(A, B, new Date(w.start.getTime() + 3 * DAY)).find((x) => x.id === w.id);
      expect(before.active && before.aspect === w.aspect).toBe(false);
      expect(inside.active && inside.aspect === w.aspect).toBe(true);
      const after = orbAt(w, new Date(w.end.getTime() + 3 * DAY));
      expect(after.active && after.aspect === w.aspect).toBe(false);
    }
  });
  it('a range that starts inside a window marks it open', () => {
    const w = tl[0];
    const mid = new Date((w.start.getTime() + w.end.getTime()) / 2);
    const part = timeline(A, B, mid, to).find((x) => x.id === w.id && x.aspect === w.aspect);
    expect(part.openStart).toBe(true);
    expect(part.start.getTime()).toBe(mid.getTime());
  });
});

describe('missing or uncertain birth time', () => {
  it('gives an envelope that contains the central window', () => {
    const Bu = { birth: B.birth, birthMin: new Date(B.birth - 12 * 3600000), birthMax: new Date(B.birth.getTime() + 12 * 3600000) };
    const ws = timelineWithUncertainty(A, Bu, new Date('1995-01-01'), new Date('2030-01-01'));
    expect(ws.length).toBeGreaterThan(0);
    for (const w of ws) {
      expect(w.uncertain).toBe(true);
      expect(w.earliest <= w.start && w.latest >= w.end).toBe(true);
      if (w.certainStart) expect(w.certainStart >= w.earliest && w.certainEnd <= w.latest).toBe(true);
    }
    // ±12 h of birth time is about ±0.5° of progressed position: edges move by months
    const spread = Math.max(...ws.map((w) => w.latest - w.end));
    expect(spread / DAY).toBeGreaterThan(30);
  });
  it('known times give no envelope', () => {
    for (const w of timelineWithUncertainty(A, B, new Date('1995-01-01'), new Date('2030-01-01'))) expect(w.uncertain).toBe(false);
  });
});

describe('research harness (synthetic fixtures only)', () => {
  it('parses date precision and rejects impossible dates', () => {
    expect(parseDatePrecision('2001-05-17').precision).toBe('day');
    expect(parseDatePrecision('2001-05').precision).toBe('month');
    expect(parseDatePrecision('2001').precision).toBe('year');
    expect(parseDatePrecision('2001-02-29')).toBeNull();
    expect(parseDatePrecision('2000-02-29').precision).toBe('day');
    expect(parseDatePrecision('2001-13')).toBeNull();
  });
  it('fixture is marked synthetic and valid', () => {
    expect(fixture.synthetic).toBe(true);
    expect(validate(fixture)).toEqual([]);
  });
  it('flags people shared across splits (leakage) and keeps groups together when assigning', () => {
    const bad = structuredClone(fixture);
    bad.relationships[1].split = 'heldout'; // r2 shares s1 with r1 (dev)
    expect(validate(bad).some((e) => e.includes('leakage'))).toBe(true);
    const assigned = assignSplits(bad, 0.5);
    expect(validate(assigned)).toEqual([]);
    for (const g of components(assigned)) expect(new Set(g.map((r) => r.split)).size).toBe(1);
  });
  it('rejects bad statuses and unknown time without bounds', () => {
    const bad = structuredClone(fixture);
    bad.relationships[0].events[0].status = 'maybe';
    bad.people[0].timeKnown = false;
    const errs = validate(bad);
    expect(errs.some((e) => e.includes('bad status'))).toBe(true);
    expect(errs.some((e) => e.includes('birthMin'))).toBe(true);
  });
  it('describes retrospectively, separates beginnings from marriages, excludes unknowns, and says it is not an evaluation', () => {
    const dev = describeData(fixture, { split: 'dev' });
    expect(dev.kind).toBe('retrospective-descriptive');
    expect(dev.predictivePerformance).toBe(NOT_EVALUATED);
    expect(dev.synthetic).toBe(true);
    expect(dev.modelVersion).toBe(MODEL_VERSION);
    expect(dev.pairs).toBe(2);
    expect(dev.events.beginning.n).toBe(2);
    expect(dev.events.marriage.n).toBe(1);
    expect(dev.events.beginning.byPrecision).toEqual({ day: 0, month: 1, year: 1 });
    expect(dev.excluded.didNotOccur).toBe(1);
    expect(dev.coverage).toBeGreaterThan(0);
    expect(dev.coverage).toBeLessThan(1);
    const held = describeData(fixture, { split: 'heldout' });
    expect(held.excluded.unknown).toBe(1);
    expect(held.pairs).toBe(2);
  }, 30000);
});

describe('Tamil / English text', () => {
  it('both languages have the same keys and the required label', () => {
    expect(Object.keys(WUI.ta).sort()).toEqual(Object.keys(WUI.en).sort());
    expect(WUI.en.badge).toBe('Experimental relationship timing — predictive accuracy not established.');
    expect(WUI.en.limits[0]).toContain('Predictive performance has not been evaluated.');
  });
  it('configuration names render in both languages', () => {
    expect(WUI.en.cfgName('PN', 'A.sun-B.venus', 'X', 'Y', 'trine')).toBe('Progressed Sun (X) trine natal Venus (Y)');
    expect(WUI.ta.cfgName('NP', 'A.venus-B.sun', 'X', 'Y', 'டிரைன் (120°)')).toBe('ஜனன சுக்கிரன் (X) – முன்னேற்ற சூரியன் (Y): டிரைன் (120°)');
  });
  it('makes no probability, compatibility-score or deterministic relationship claims', () => {
    // the intro is the explicit disclaimer ("no marriage chances … or claims that people will meet …"); check it says so, then scan everything else
    expect(WUI.en.intro.some((x) => /makes no predictions/.test(x))).toBe(true);
    const { intro, ...rest } = WUI.en;
    const all = JSON.stringify(rest, (k, v) => (typeof v === 'function' ? v.toString() : v));
    for (const bad of [/\d+\s*%/, /compatib\w* (score|percentage)\s*[:=\d]/i, /will (meet|marry|separate|divorce)/i, /chance of (marriage|meeting)/i]) expect(all).not.toMatch(bad);
  });
});

describe('generated-partner comparison (synthetic fixtures only)', () => {
  it('default orb is the author-stated 2°01′', () => expect(DEFAULTS.orbDeg).toBeCloseTo(2 + 1 / 60, 12));
  it('artificial partners: within the real birth year ± 2, real time of day, seeded', () => {
    let s = 42;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const real = new Date('1980-03-10T08:15:00Z');
    const fakes = generatePartners(real, 300, rnd);
    for (const f of fakes) {
      expect(f.getUTCFullYear()).toBeGreaterThanOrEqual(1978);
      expect(f.getUTCFullYear()).toBeLessThanOrEqual(1982);
      expect(f.getUTCHours() * 60 + f.getUTCMinutes()).toBe(8 * 60 + 15);
    }
    expect(new Set(fakes.map((f) => f.getUTCFullYear())).size).toBe(5);
    for (const f of generatePartners(real, 20, rnd, false)) expect(f.getUTCHours()).toBe(12);
  });
  it('is deterministic for a seed and labelled retrospective', () => {
    const a = generatedPartnerComparison(fixture, { perSubject: 40, seed: 9 });
    const b = generatedPartnerComparison(fixture, { perSubject: 40, seed: 9 });
    expect(a.rows).toEqual(b.rows);
    expect(a.kind).toBe('retrospective-generated-partner-comparison');
    expect(a.predictivePerformance).toBe(NOT_EVALUATED);
    expect(a.synthetic).toBe(true);
  });
  it('counting from both sides mirrors configurations exactly (flagged), and one side halves the subjects', () => {
    const both = generatedPartnerComparison(fixture, { perSubject: 20, seed: 3, subjects: 'both' });
    const one = generatedPartnerComparison(fixture, { perSubject: 20, seed: 3, subjects: 'a' });
    expect(both.mirrored).toBe(true);
    expect(one.mirrored).toBe(false);
    expect(both.subjects).toBe(2 * one.subjects);
    const get = (r, layer, dir, asp) => r.rows.find((x) => x.layer === layer && x.dir === dir && x.aspect === asp)?.observed || 0;
    for (const asp of ['conjunction', 'trine', 'opposition'])
      expect(get(both, 'NP', 'A.sun-B.venus', asp)).toBe(get(both, 'PN', 'A.venus-B.sun', asp));
  });
  it('keeps natal (permanent) rows apart from changing rows', () => {
    const r = generatedPartnerComparison(fixture, { perSubject: 20, seed: 3 });
    for (const x of r.rows) expect(x.permanent).toBe(x.layer === 'NN');
    expect(r.totals.changing).toBeDefined();
    expect(r.totals.natal).toBeDefined();
  });
  it('uses marriage only as a flagged substitute when no beginning date exists', () => {
    const ds = structuredClone(fixture);
    ds.relationships[0].events = [{ type: 'marriage', date: '2002-02-14', status: 'occurred' }];
    const r = generatedPartnerComparison(ds, { perSubject: 5, seed: 1 });
    expect(r.anchors.marriageSubstitute).toBe(1);
    expect(r.anchors.byPrecision.day).toBe(1);
  });
});
