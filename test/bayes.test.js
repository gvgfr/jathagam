import { describe, it, expect } from 'vitest';
import { lgamma, lbeta, logBF, posterior, logBFbinom, verdict, calibrate, scoreChart } from '../src/bayes/model.js';
import { computeChart } from '../src/engine/index.js';
import { antarams } from '../src/engine/dasa.js';
import { analyse } from '../src/palan/index.js';
import { ruleFires } from '../src/palan/plain.js';

describe('maths', () => {
  it('lgamma matches known values', () => {
    expect(lgamma(1)).toBeCloseTo(0, 10);
    expect(lgamma(5)).toBeCloseTo(Math.log(24), 10);
    expect(lgamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 10);
    expect(lbeta(2, 3)).toBeCloseTo(Math.log(1 / 12), 10);
  });
  it('Bayes factor: perfect rule > 1, uninformative rule < 1', () => {
    expect(logBF({ a: 5, b: 0, c: 0, d: 50 })).toBeGreaterThan(Math.log(20));
    expect(logBF({ a: 1, b: 9, c: 5, d: 45 })).toBeLessThan(0); // same rate when fired or not
  });
  it('posterior lift and P(better)', () => {
    const p = posterior({ a: 4, b: 1, c: 1, d: 40 });
    expect(p.lift).toBeGreaterThan(5);
    expect(p.pBetter).toBeGreaterThan(0.95);
    expect(posterior({ a: 0, b: 0, c: 0, d: 0 }).pBetter).toBeCloseTo(0.5, 1);
  });
  it('verdicts', () => {
    expect(verdict(0.1)).toBe('against');
    expect(verdict(0.5)).toBe('none');
    expect(verdict(2)).toBe('none');
    expect(verdict(50)).toBe('strong');
  });
});

describe('calibration on synthetic lives', () => {
  const lat = 13.0827;
  const lon = 80.2707;
  const trueUtc = new Date('1977-07-27T19:00:00Z');
  const now = new Date('2026-11-21T00:00:00Z');

  // Build a life where events happen exactly when the true chart's rules fire
  function lifeFrom(utc, kinds) {
    const chart = computeChart({ utc, lat, lon });
    const A = analyse(chart);
    const rep = {};
    for (const k of kinds) rep[k] = [];
    for (const p of chart.dasa.periods)
      for (const b of p.bhuktis)
        for (const an of antarams(b)) {
          const mid = new Date((an.start.getTime() + an.end.getTime()) / 2);
          const age = (mid - utc) / (365.25 * 86400000);
          if (age < 18 || mid > now) continue;
          for (const k of kinds)
            if (ruleFires(A, k, b.lord, an.lord) && rep[k].length < 4) rep[k].push({ year: mid.getUTCFullYear(), month: mid.getUTCMonth() + 1 });
        }
    return rep;
  }

  it('a life that follows the rules scores well above chance', () => {
    const rep = lifeFrom(trueUtc, ['promotion', 'property', 'setback']);
    const chart = computeChart({ utc: trueUtc, lat, lon });
    const sc = scoreChart(chart, rep, now);
    expect(sc.logBF).toBeGreaterThan(Math.log(3));
  });

  it('a random life does not', () => {
    const rep = { promotion: [{ year: 2001 }, { year: 2013 }], property: [{ year: 2009, month: 3 }], setback: [{ year: 2019 }] };
    const chart = computeChart({ utc: trueUtc, lat, lon });
    const sc = scoreChart(chart, rep, now);
    expect(sc.logBF).toBeLessThan(Math.log(20));
  });

  it('recovers the true birth time from a stated time that is 20 minutes off', () => {
    const rep = lifeFrom(trueUtc, ['promotion', 'property', 'setback', 'jobChange', 'incomeRise'.length ? 'homeMove' : 'homeMove']);
    const stated = new Date(trueUtc.getTime() + 20 * 60000);
    const r = calibrate({ utc: stated, lat, lon }, rep, { toleranceMin: 30, stepMin: 5, now });
    const truth = r.candidates.find((c) => c.offsetMin === -20);
    expect(truth.post).toBeGreaterThan(r.stated.post);
    expect(Math.abs(r.best.offsetMin + 20)).toBeLessThanOrEqual(10);
    // the life was generated from the simplified rules, so they should win
    expect(r.systemPost.parasari).toBeGreaterThan(r.systemPost.kp);
  });
});

describe('personal forecast', () => {
  it('uses only rules with real evidence, and respects age', () => {
    const lat = 13.0827, lon = 80.2707, now = new Date('2026-11-21T00:00:00Z');
    const utc = new Date('1977-07-27T19:00:00Z');
    // random, unpatterned life: no rule should be trusted
    const r = calibrate({ utc, lat, lon }, { childbirth: [{ year: 2007 }, { year: 2011, month: 6 }], jobChange: [{ year: 2008 }], setback: [] }, { toleranceMin: 0, now });
    for (const f of r.forecast) expect(r.systems[f.system].kinds[f.key].logBF).toBeGreaterThan(Math.log(3));
    expect(r.forecast.some((f) => f.key === 'childbirth')).toBe(false); // age 49+
  });
});

describe('one-sided test', () => {
  it('a rule that fires only when nothing happens is not counted as working', () => {
    // 4 events, all in periods where the rule did NOT fire; rule fired 30 times
    const t = { a: 0, b: 30, c: 4, d: 166 };
    const p = posterior(t);
    const oneSided = logBF(t) + Math.log(Math.max(1e-9, p.pBetter) / 0.5);
    expect(oneSided).toBeLessThan(0);
  });
});

describe('event-in-rule-time test', () => {
  it('more hits than chance -> support; none -> against; never-happened -> no information', () => {
    expect(logBFbinom(3, 3, 0.1)).toBeGreaterThan(Math.log(20)); // all 3 events in 10% of the time
    expect(logBFbinom(1, 2, 0.11)).toBeGreaterThan(0); // 1 of 2 vs 0.2 expected: mild support
    expect(logBFbinom(0, 4, 0.11)).toBeLessThan(Math.log(1 / 3)); // 0 of 4
    expect(logBFbinom(0, 0, 0.3)).toBe(0);
  });
  it('matches the analytic value for whole numbers', () => {
    // h=1, E=2, q=0.11: num = (1/6 - (q^2/2 - q^3/3)) / (1-q), den = q(1-q)
    const q = 0.11;
    const num = (1 / 6 - (q * q / 2 - q ** 3 / 3)) / (1 - q);
    expect(logBFbinom(1, 2, q)).toBeCloseTo(Math.log(num / (q * (1 - q))), 4);
  });
});

describe('KP in the Bayesian check', () => {
  it('a life generated from KP rules is recognised as KP', () => {
    const lat = 13.0827, lon = 80.2707, now = new Date('2026-11-21T00:00:00Z');
    const utc = new Date('1977-07-27T19:00:00Z');
    const chart = computeChart({ utc, lat, lon });
    const sc = scoreChart(chart, { promotion: [], property: [], marriage: [] }, now, 'kp');
    const rep = { promotion: [], property: [], marriage: [], jobChange: [] };
    for (const an of sc.ants) {
      const mid = new Date((an.start.getTime() + an.end.getTime()) / 2);
      const age = (mid - utc) / (365.25 * 86400000);
      if (age < 18 || mid > now) continue;
      for (const k of Object.keys(rep)) if (sc.fires(k, an.bl, an.lord) && rep[k].length < 3) rep[k].push({ year: mid.getUTCFullYear(), month: mid.getUTCMonth() + 1 });
    }
    const r = calibrate({ utc, lat, lon }, rep, { toleranceMin: 0, now });
    expect(r.systems.kp.overall.logBF).toBeGreaterThan(Math.log(3));
    expect(r.kpVsParasari).toBeGreaterThan(1);
  });
});
