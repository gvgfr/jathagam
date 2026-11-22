// Forecast evaluation harness: do astrological features add predictive value
// beyond a non-astrological baseline? Works on a cohort of people with known
// follow-up. Nothing here runs in the website; it is for `npm run eval`.
//
// Protocol (fixed before tuning; see AUDIT.md):
//  * Unit: person × event kind × calendar month, inside the person's follow-up
//    window, only for kinds the person answered about, only while eligible.
//  * Outcome: 1 if a month-precision event of that kind fell in that month;
//    0 if none; UNKNOWN (dropped) for every month of a year that holds a
//    year-only event. Unanswered kinds are dropped, never counted as 0.
//  * Splits: people are split into K folds. For each fold, models are fitted on
//    the OTHER people's months before the cutoff and scored on THIS fold's
//    people's months from the cutoff on (people and time both held out).
//    Hyper-parameters are chosen by inner person-folds on training data only.
//    People marked split: 'final' are never used unless final=true.
//  * Astrological feature: "the rule fires in this month" under one
//    pre-registered configuration (PREREG). Alternatives (KP) are separate
//    named experiments, not a search for the best fit.
//  * Models: M0 baseline (kind × age-band rates, smoothed), M1 = M0 + per-kind
//    rule-fired rate ratio shrunk towards 1, M2 = the site's own engine
//    (assumed Gaussian age curves + pooled λ with a "no effect" spike).
import { computeChart } from '../engine/index.js';
import { antarams } from '../engine/dasa.js';
import { analyse } from '../palan/index.js';
import { ruleFires } from '../palan/plain.js';
import { kpChart, kpFires } from '../engine/kp.js';
import { baseRate, SPIKE } from '../bayes/robust.js';
import { EVENT_DEFS } from './definitions.js';

export const PREREG = Object.freeze({ system: 'parasari', ayanamsa: 'lahiri', node: 'mean', yearDays: 365.25 });
const YEAR = 365.25 * 86400000;
const BANDS = [0, 25, 30, 35, 40, 50, 200];
const band = (age) => BANDS.findIndex((b, i) => age >= b && age < BANDS[i + 1]);
const mIdx = (y, m) => y * 12 + (m - 1); // m 1..12

/** Rule-fired lookup by month for one person. */
function firingByMonth(person, cfg) {
  const utc = new Date(person.birth.utc);
  const chart = computeChart({ utc, lat: person.birth.lat, lon: person.birth.lon }, { ayanamsa: cfg.ayanamsa, node: cfg.node, yearDays: cfg.yearDays });
  const A = cfg.system === 'parasari' ? analyse(chart) : null;
  const K = cfg.system === 'kp' ? kpChart(chart) : null;
  const ants = [];
  for (const p of chart.dasa.periods) for (const b of p.bhuktis) for (const a of antarams(b)) ants.push({ s: a.start.getTime(), e: a.end.getTime(), bl: b.lord, al: a.lord });
  const cache = {};
  return (kind, ms) => {
    const a = ants.find((x) => x.s <= ms && ms < x.e);
    if (!a) return 0;
    const key = `${kind}|${a.bl}|${a.al}`;
    if (!(key in cache)) cache[key] = (K ? kpFires(K, kind, a.bl, a.al) : ruleFires(A, kind, a.bl, a.al)) ? 1 : 0;
    return cache[key];
  };
}

/**
 * Aggregate one person's months into groups {kind, age, band, fired, part, n, s}
 * (part 0 = before cutoff, 1 = from cutoff). Logistic-type models on
 * categorical features only need these counts.
 */
export function personGroups(person, { cutoff, cfg = PREREG, fired: firedFn } = {}) {
  const fires = firedFn || firingByMonth(person, cfg);
  const birthMs = new Date(person.birth.utc).getTime();
  const [fy, fm] = person.followFrom.split('-').map(Number);
  const [ty, tm] = person.followTo.split('-').map(Number);
  const cut = cutoff ? mIdx(...cutoff.split('-').map(Number)) : Infinity;
  const groups = new Map();
  let unknown = 0;
  for (const kind of person.answered) {
    const evs = person.events[kind] || [];
    const monthHit = new Set(evs.filter((e) => e.month).map((e) => mIdx(e.year, e.month)));
    const yearOnly = new Set(evs.filter((e) => !e.month).map((e) => e.year));
    const def = EVENT_DEFS[kind];
    const firstEvent = evs.length ? Math.min(...evs.map((e) => mIdx(e.year, e.month || 1))) : Infinity;
    for (let i = mIdx(fy, fm); i <= mIdx(ty, tm); i++) {
      const y = Math.floor(i / 12);
      const ms = Date.UTC(y, i % 12, 15);
      const age = (ms - birthMs) / YEAR;
      if (def && (age < def.age[0] || age > def.age[1])) continue;
      if (def && !def.repeatable && i > firstEvent) break; // no longer at risk
      if (yearOnly.has(y)) {
        unknown++;
        continue;
      }
      const f = fires(kind, ms);
      const a = Math.floor(age);
      const part = i < cut ? 0 : 1;
      const key = `${kind}|${a}|${f}|${part}`;
      let g = groups.get(key);
      if (!g) groups.set(key, (g = { kind, age: a, band: band(a), fired: f, part, n: 0, s: 0 }));
      g.n++;
      if (monthHit.has(i)) g.s++;
    }
  }
  return { id: person.id, split: person.split || 'dev', groups: [...groups.values()], unknown };
}

const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
const clip = (p) => Math.min(1 - 1e-9, Math.max(1e-9, p));

// ------------------------------------------------------------------ models
/** M0: per-kind rate, per kind × age band, smoothed towards the kind rate with strength alpha (person-months). */
function fitM0(G, { alpha }) {
  const kind = {};
  const kb = {};
  for (const g of G) {
    (kind[g.kind] ||= { n: 0, s: 0 }).n += g.n;
    kind[g.kind].s += g.s;
    const k2 = `${g.kind}|${g.band}`;
    (kb[k2] ||= { n: 0, s: 0 }).n += g.n;
    kb[k2].s += g.s;
  }
  const pk = (k) => (kind[k] ? (kind[k].s + 0.5) / (kind[k].n + 1) : 1e-4);
  return (g) => {
    const c = kb[`${g.kind}|${g.band}`];
    return clip(c ? (c.s + alpha * pk(g.kind)) / (c.n + alpha) : pk(g.kind));
  };
}

/** M1: M0 × per-kind rate ratio for fired / not-fired months, shrunk towards 1 with strength beta (expected events). */
function fitM1(G, { alpha, beta }) {
  const p0 = fitM0(G, { alpha });
  if (!Number.isFinite(beta)) return p0;
  const r = {};
  for (const g of G) {
    const k = `${g.kind}|${g.fired}`;
    (r[k] ||= { O: 0, E: 0 }).O += g.s;
    r[k].E += g.n * p0(g);
  }
  return (g) => {
    const x = r[`${g.kind}|${g.fired}`];
    const ratio = x ? (x.O + beta) / (x.E + beta) : 1;
    return clip(p0(g) * ratio);
  };
}

/** M2: the site's engine: Gaussian age curve scaled to the training rate, plus pooled λ (spike-and-slab). useRules=false gives its baseline. */
function fitM2(G, { useRules = true } = {}) {
  const scale = {};
  for (const g of G) {
    (scale[g.kind] ||= { s: 0, w: 0 }).s += g.s;
    scale[g.kind].w += g.n * baseRate(g.kind, g.age + 0.5);
  }
  const h0 = (g) => (scale[g.kind].s + 0.5) / (scale[g.kind].w + 1) * baseRate(g.kind, g.age + 0.5);
  if (!useRules) return (g) => clip(scale[g.kind] ? h0(g) : 1e-4);
  // pooled λ on the training months, as in robust.js
  const st = {};
  for (const g of G) {
    const x = (st[g.kind] ||= { wF: 0, w: 0, h: 0, E: 0 });
    const w = g.n * baseRate(g.kind, g.age + 0.5);
    x.w += w;
    if (g.fired) {
      x.wF += w;
      x.h += g.s;
    }
    x.E += g.s;
  }
  const N = 101;
  const ll = [];
  for (let i = 0; i < N; i++) {
    const lam = i / (N - 1);
    let L = 0;
    for (const x of Object.values(st)) {
      if (!x.E) continue;
      const q = Math.min(0.999, Math.max(0.001, x.wF / x.w));
      const th = Math.min(0.999999, q + lam * (1 - q));
      L += x.h * Math.log(th / q) + (x.E - x.h) * Math.log((1 - th) / (1 - q));
    }
    ll.push(L);
  }
  const m = Math.max(...ll);
  const w = ll.map((x) => Math.exp(x - m));
  const z = w.reduce((a, b) => a + b, 0);
  const bf = (z / N) * Math.exp(m - ll[0]);
  const pEff = ((1 - SPIKE) * bf) / ((1 - SPIKE) * bf + SPIKE);
  const lam = w.reduce((a, x, i) => a + (x / z) * (i / (N - 1)), 0);
  return (g) => {
    if (!scale[g.kind]) return 1e-4;
    const x = st[g.kind];
    const q = Math.min(0.999, Math.max(0.001, x.wF / x.w));
    const th = q + lam * (1 - q);
    const lift = g.fired ? th / q : (1 - th) / (1 - q);
    return clip(h0(g) * (1 - pEff + pEff * lift));
  };
}

// ------------------------------------------------------------------ scoring
function lossOn(pred, G) {
  let brier = 0;
  let ll = 0;
  let n = 0;
  let s = 0;
  for (const g of G) {
    const p = pred(g);
    brier += g.n * p * p - 2 * p * g.s + g.s;
    ll -= g.s * Math.log(p) + (g.n - g.s) * Math.log(1 - p);
    n += g.n;
    s += g.s;
  }
  return { brier, ll, n, s };
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALPHAS = [100, 1000, 10000];
const BETAS = [1, 4, 16, 64, Infinity];

/** Choose alpha (M0) then beta (M1) by inner person-folds on training people's pre-cutoff months. */
function tune(trainPeople, k = 3) {
  const folds = Array.from({ length: k }, (_, i) => trainPeople.filter((_, j) => j % k === i));
  const cv = (fit) => {
    let L = 0;
    for (let i = 0; i < k; i++) {
      const tr = folds.flatMap((f, j) => (j === i ? [] : f.flatMap((p) => p.groups.filter((g) => g.part === 0))));
      const te = folds[i].flatMap((p) => p.groups.filter((g) => g.part === 0));
      if (!tr.length || !te.length) continue;
      L += lossOn(fit(tr), te).ll;
    }
    return L;
  };
  const alpha = ALPHAS.reduce((best, a) => (cv((G) => fitM0(G, { alpha: a })) < cv((G) => fitM0(G, { alpha: best })) ? a : best), ALPHAS[0]);
  const beta = BETAS.reduce((best, b) => (cv((G) => fitM1(G, { alpha, beta: b })) < cv((G) => fitM1(G, { alpha, beta: best })) ? b : best), Infinity);
  return { alpha, beta };
}

export const MODELS = ['M0 baseline', 'M1 baseline + rule', 'M2 site engine', 'M2 engine without rules'];

/**
 * Evaluate a cohort.
 * @param {ReturnType<typeof personGroups>[]} people
 * @param {{folds?: number, final?: boolean, seed?: number, boot?: number}} opts
 */
export function evaluate(people, { folds = 5, final = false, seed = 1, boot = 1000 } = {}) {
  const use = people.filter((p) => (final ? true : p.split !== 'final'));
  const testable = final ? use.filter((p) => p.split === 'final') : use;
  const perPerson = []; // {id, losses: [ {brier, ll, n, s} x models ]}
  const calib = MODELS.map(() => Array.from({ length: 10 }, () => ({ n: 0, s: 0, sp: 0 })));
  const tuned = [];
  for (let f = 0; f < folds; f++) {
    const test = testable.filter((_, i) => i % folds === f);
    const testIds = new Set(test.map((p) => p.id));
    const train = use.filter((p) => !testIds.has(p.id) && (final || p.split !== 'final'));
    if (!test.length || !train.length) continue;
    const hp = tune(train);
    tuned.push(hp);
    const G = train.flatMap((p) => p.groups.filter((g) => g.part === 0));
    const preds = [fitM0(G, hp), fitM1(G, hp), fitM2(G), fitM2(G, { useRules: false })];
    for (const p of test) {
      const T = p.groups.filter((g) => g.part === 1);
      if (!T.length) continue;
      perPerson.push({ id: p.id, losses: preds.map((pr) => lossOn(pr, T)) });
      preds.forEach((pr, mi) => {
        for (const g of T) {
          const q = pr(g);
          const b = calib[mi][Math.min(9, Math.floor(q / 0.005))]; // bins of width 0.005: monthly probabilities are small
          b.n += g.n;
          b.s += g.s;
          b.sp += q * g.n;
        }
      });
    }
  }
  const tot = (mi, arr = perPerson) => {
    const n = sum(arr, (x) => x.losses[mi].n);
    return { brier: sum(arr, (x) => x.losses[mi].brier) / n, ll: sum(arr, (x) => x.losses[mi].ll) / n, n, events: sum(arr, (x) => x.losses[mi].s) };
  };
  const res = MODELS.map((name, mi) => ({ name, ...tot(mi) }));
  for (const r of res) r.skill = 1 - r.brier / res[0].brier;
  // bootstrap over people: difference vs M0 (negative = better than baseline)
  const R = rng(seed);
  const diffs = MODELS.map(() => ({ brier: [], ll: [] }));
  for (let b = 0; b < boot; b++) {
    const smp = Array.from({ length: perPerson.length }, () => perPerson[Math.floor(R() * perPerson.length)]);
    const base = tot(0, smp);
    for (let mi = 1; mi < MODELS.length; mi++) {
      const t = tot(mi, smp);
      diffs[mi].brier.push(t.brier - base.brier);
      diffs[mi].ll.push(t.ll - base.ll);
    }
  }
  const ci = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    return [s[Math.floor(0.025 * s.length)], s[Math.floor(0.975 * s.length)]];
  };
  for (let mi = 1; mi < MODELS.length; mi++) {
    res[mi].dBrierCI = ci(diffs[mi].brier);
    res[mi].dLogLossCI = ci(diffs[mi].ll);
  }
  const calibration = calib.map((bins) => bins.filter((b) => b.n).map((b) => ({ meanP: b.sp / b.n, rate: b.s / b.n, n: b.n })));
  return { people: perPerson.length, models: res, calibration, tuned };
}

/**
 * Verdict in plain words: skill beyond baseline is "demonstrated" only if the
 * whole 95% interval of the log-loss difference is below zero.
 */
export function verdict(res) {
  const m1 = res.models[1];
  if (m1.dLogLossCI[1] < 0) return 'improvement';
  if (m1.dLogLossCI[0] > 0) return 'worse';
  return 'none';
}
