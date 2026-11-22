import { describe, it, expect } from 'vitest';
import { EVENT_DEFS, eligible, weakShare, roundBirthTime } from '../src/forecast/definitions.js';
import { makeRecord, verifyRecord, resolve, score, exportRecords, importRecords, migrate, canonical } from '../src/forecast/record.js';
import { personGroups, evaluate, verdict } from '../src/forecast/evaluate.js';
import { syntheticCohort } from '../src/forecast/synthetic.js';
import { EVENT_KINDS } from '../src/bayes/model.js';

describe('event definitions', () => {
  it('every testable kind has yes/no/unknown in both languages', () => {
    for (const k of EVENT_KINDS) {
      const d = EVENT_DEFS[k];
      expect(d, k).toBeTruthy();
      for (const L of ['en', 'ta']) for (const f of ['yes', 'no', 'unknown']) expect(d[L][f].length, `${k} ${L} ${f}`).toBeGreaterThan(5);
    }
  });
  it('eligibility: age range and non-repeatable kinds', () => {
    expect(eligible('marriage', 30, [])).toBe(true);
    expect(eligible('marriage', 30, [{ year: 2002 }])).toBe(false); // first marriage only
    expect(eligible('childbirth', 49, [{ year: 2006 }])).toBe(true);
    expect(eligible('childbirth', 55, [])).toBe(false);
    expect(eligible('studies', 49, [])).toBe(false);
  });
  it('weak dates and round birth times', () => {
    expect(weakShare({ a: [{ year: 2000 }, { year: 2001, month: 3 }] })).toBe(0.5);
    expect(roundBirthTime('00', '30')).toBe(true);
    expect(roundBirthTime('10', '17')).toBe(false);
  });
});

describe('forecast records', () => {
  const base = { kind: 'jobChange', p: 0.2, base: 0.15, pEffect: 0.1, model: { method: 'x' }, inputs: { a: 1 }, defVersion: 1, now: Date.UTC(2026, 0, 1) };
  it('canonical JSON ignores key order', () => {
    expect(canonical({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(canonical({ a: [2, { c: 2, d: 1 }], b: 1 }));
  });
  it('seals, detects edits, and keeps the hash through resolution', async () => {
    const r = await makeRecord(base);
    expect(r.v).toBe(2);
    expect(r.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.to - r.from).toBeCloseTo(365.25 * 86400000, -3);
    expect(await verifyRecord(r)).toBe(true);
    expect(await verifyRecord(resolve(r, 'yes'))).toBe(true); // outcome is not sealed
    expect(await verifyRecord({ ...r, p: 0.9 })).toBe(false);
  });
  it('scores Brier, skill, log loss; unknown outcomes are excluded', () => {
    const recs = [
      { p: 0.8, base: 0.5, outcome: 'yes' },
      { p: 0.2, base: 0.5, outcome: 'no' },
      { p: 0.5, base: 0.5, outcome: 'unknown' },
      { p: 0.5, base: 0.5 },
    ];
    const s = score(recs);
    expect(s.n).toBe(2);
    expect(s.brier).toBeCloseTo(0.04, 6);
    expect(s.brierBase).toBeCloseTo(0.25, 6);
    expect(s.skill).toBeCloseTo(1 - 0.04 / 0.25, 6);
    expect(s.logLoss).toBeCloseTo(-Math.log(0.8), 6);
    expect(s.logLossBase).toBeCloseTo(Math.log(2), 6);
  });
  it('a forecast equal to the baseline has zero skill', () => {
    const s = score([{ p: 0.3, base: 0.3, outcome: 'yes' }, { p: 0.3, base: 0.3, outcome: 'no' }]);
    expect(s.skill).toBeCloseTo(0, 10);
  });
  it('migrates v1 records and round-trips export / import', async () => {
    const old = migrate({ id: 'jobChange|2025-1', kind: 'jobChange', p: 0.1, base: 0.1, from: 1, to: 2, outcome: 1 });
    expect(old.legacy).toBe(true);
    expect(old.outcome).toBe('yes');
    const r = await makeRecord(base);
    const file = exportRecords([r, old]);
    const res = await importRecords(file, []);
    expect(res.records).toHaveLength(2);
    expect(res.invalid).toBe(0);
    // importing an edited copy keeps both and flags it
    const tampered = JSON.parse(file);
    tampered.records[0].p = 0.99;
    tampered.records[0].hash = 'f'.repeat(64);
    const res2 = await importRecords(JSON.stringify(tampered), res.records);
    expect(res2.conflicts).toBe(1);
    expect(res2.invalid).toBe(1);
    await expect(importRecords('{"x":1}', [])).rejects.toThrow();
  });
});

describe('evaluation harness', () => {
  const person = {
    id: 'p1', birth: { utc: '1980-05-01T00:00:00Z', lat: 13.08, lon: 80.27 },
    followFrom: '2000-01', followTo: '2001-12', answered: ['jobChange', 'marriage'],
    events: { jobChange: [{ year: 2000, month: 3 }, { year: 2001 }], marriage: [{ year: 2000, month: 6 }] },
  };
  it('turns a history into person-months: year-only years are unknown, unanswered kinds absent, non-repeatable stops', () => {
    const g = personGroups(person, { cutoff: '2001-01', fired: () => 0 });
    const n = (kind, part) => g.groups.filter((x) => x.kind === kind && (part == null || x.part === part)).reduce((a, x) => a + x.n, 0);
    const s = (kind) => g.groups.filter((x) => x.kind === kind).reduce((a, x) => a + x.s, 0);
    expect(n('jobChange')).toBe(12); // 2001 is year-only -> 12 unknown months dropped
    expect(g.unknown).toBe(12);
    expect(s('jobChange')).toBe(1);
    expect(n('marriage')).toBe(6); // at risk Jan–Jun 2000, then no longer eligible
    expect(s('marriage')).toBe(1);
    expect(n('homeMove')).toBe(0); // not answered: never counted as "did not happen"
    expect(n('jobChange', 1)).toBe(0);
  });
  it('finds no skill in a null cohort and finds a strong planted effect', () => {
    const run = (effect, seed) => evaluate(syntheticCohort({ n: 120, seed, effect }).map((p) => personGroups(p, { cutoff: '2015-01' })), { folds: 4, boot: 200 });
    const nul = run(1, 3);
    expect(verdict(nul)).not.toBe('improvement');
    const planted = run(3, 4);
    expect(verdict(planted)).toBe('improvement');
    expect(planted.models[1].skill).toBeGreaterThan(0);
  }, 60000);
  it('final-split people are excluded unless the final test is requested', () => {
    const coh = syntheticCohort({ n: 40, seed: 5, finalShare: 0.5 });
    const G = coh.map((p) => personGroups(p, { cutoff: '2015-01' }));
    const nFinal = G.filter((p) => p.split === 'final').length;
    expect(nFinal).toBeGreaterThan(5);
    const dev = evaluate(G, { folds: 4, boot: 50 });
    expect(dev.people).toBeLessThanOrEqual(G.length - nFinal);
  }, 60000);
});
