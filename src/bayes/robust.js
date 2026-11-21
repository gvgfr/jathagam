// Robust Bayesian test of astrological rule systems against one person's life.
//
// A. Model space: every combination of rule system (simplified whole-sign /
//    KP), ayanamsa (Lahiri, Raman; KP uses its own), lunar node (mean/true)
//    and dasa year length (365.25, 360, 365.2564 days), and birth time within
//    the stated uncertainty. Equal prior over models, so trying many models
//    does not let one win by luck: the posterior shares belief between them.
// B. Age-aware chance: under "no connection", an event is more likely at ages
//    when such events are common (marriage late 20s, children early 30s ...),
//    so the chance level for a rule is the share of *expected events* (not of
//    time) that falls in the periods it points to.
// C. Out-of-sample: models are ranked on events before a split year and then
//    scored on the later events they never saw.
// D. Partial pooling: one "rule strength" λ in [0,1] is shared by all event
//    kinds (θ = q + λ(1 − q); λ = 0 is chance), estimated from all events at
//    once, instead of each kind paying its own complexity penalty.
// E. Probability forecasts for the coming windows, averaged over models
//    (Bayesian model averaging), which can be scored later (Brier score).
import { computeChart } from '../engine/index.js';
import { vimshottari, antarams } from '../engine/dasa.js';
import { analyse } from '../palan/index.js';
import { ruleFires } from '../palan/plain.js';
import { kpChart, kpFires } from '../engine/kp.js';
import { EVENTS } from '../palan/eventTexts.js';

const YEAR = 365.25 * 86400000;
const GRID = 101; // λ grid

// ---------------------------------------------------------------- B. base rates
// Relative frequency of each kind of event by age (rough population shapes):
// Gaussian bumps with a small floor so no age is impossible.
const BASE = {
  marriage: { m: 28, s: 4.5 }, childbirth: { m: 32, s: 5 }, jobChange: { m: 33, s: 10 }, promotion: { m: 38, s: 10 },
  business: { m: 38, s: 9 }, property: { m: 38, s: 10 }, homeMove: { m: 29, s: 10 }, travel: { m: 26, s: 6 },
  studies: { m: 21, s: 4 }, healthCare: { m: 70, s: 20 }, safety: { m: 30, s: 18 }, setback: { m: 42, s: 14 },
  parents: { m: 55, s: 10 }, incomeRise: { m: 38, s: 12 },
};
export function baseRate(kind, age) {
  const b = BASE[kind] || { m: 40, s: 20 };
  return 0.03 + Math.exp(-0.5 * ((age - b.m) / b.s) ** 2);
}

// ---------------------------------------------------------------- model grid
export function modelGrid() {
  const out = [];
  for (const system of ['parasari', 'kp'])
    for (const ayanamsa of system === 'kp' ? ['kp'] : ['lahiri', 'raman'])
      for (const node of ['mean', 'true'])
        for (const yearDays of [365.25, 360, 365.2564]) out.push({ system, ayanamsa, node, yearDays, id: `${system}|${ayanamsa}|${node}|${yearDays}` });
  return out;
}

/** Firing table: fires[kind][bhuktiLord][antaramLord] for one chart and rule system (81 pairs). */
const LORDS = ['ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury'];
function firingTable(chart, system, kinds) {
  const A = system === 'parasari' ? analyse(chart) : null;
  const K = system === 'kp' ? kpChart(chart) : null;
  const t = {};
  for (const k of kinds) {
    t[k] = {};
    for (const bl of LORDS) {
      t[k][bl] = {};
      for (const al of LORDS) t[k][bl][al] = K ? kpFires(K, k, bl, al) : ruleFires(A, k, bl, al);
    }
  }
  return t;
}

/** Spread an event over a window: [start, end] ms. */
const windowOf = (ev) => (ev.month ? [Date.UTC(ev.year, ev.month - 1, 1), Date.UTC(ev.year, ev.month, 1)] : [Date.UTC(ev.year, 0, 1), Date.UTC(ev.year + 1, 0, 1)]);

/**
 * Per-kind statistics in a time range [from, to): q = age-weighted share of
 * expected events in fired periods; h = events that fell in fired periods;
 * E = events in range.
 */
function stats(periods, fires, reported, birthMs, from, to) {
  const out = {};
  for (const [k, evs] of Object.entries(reported)) {
    if (!fires[k]) continue;
    let wF = 0;
    let wAll = 0;
    let h = 0;
    let E = 0;
    const wins = evs.map(windowOf);
    for (const p of periods) {
      const s = Math.max(p.start, from);
      const e = Math.min(p.end, to);
      if (e <= s) continue;
      const age = ((s + e) / 2 - birthMs) / YEAR;
      const w = (e - s) * baseRate(k, age);
      wAll += w;
      const fired = fires[k][p.bl][p.al];
      if (fired) wF += w;
      for (const [w0, w1] of wins) {
        const ov = Math.max(0, Math.min(w1, e) - Math.max(w0, s)) / (w1 - w0);
        E += ov;
        if (fired) h += ov;
      }
    }
    out[k] = { q: wAll ? Math.min(0.999, Math.max(0.001, wF / wAll)) : 0.5, h, E, firedShare: wAll ? wF / wAll : 0 };
  }
  return out;
}

/** Log-likelihood ratio grid over λ for the pooled model (D); index 0 is chance. */
function llGrid(st) {
  const g = new Float64Array(GRID);
  for (let i = 0; i < GRID; i++) {
    const lam = i / (GRID - 1);
    let ll = 0;
    for (const { q, h, E } of Object.values(st)) {
      if (E <= 0) continue;
      const th = Math.min(0.999999, q + lam * (1 - q));
      ll += h * Math.log(th / q) + (E - h) * Math.log((1 - th) / (1 - q));
    }
    g[i] = ll;
  }
  return g;
}
const logMeanExp = (arr) => {
  const m = Math.max(...arr);
  return m + Math.log(arr.reduce((s, x) => s + Math.exp(x - m), 0) / arr.length);
};
/** log Bayes factor (pooled rules vs chance), λ ~ Uniform(0, 1). */
export const pooledLogBF = (g) => logMeanExp(Array.from(g)) - g[0];

/** Per-kind one-sided Bayes factor θ ~ U(q, 1) (for the detail list). */
function kindLogBF({ q, h, E }) {
  if (E <= 0) return 0;
  const N = 400;
  let num = 0;
  for (let i = 0; i < N; i++) {
    const th = q + ((i + 0.5) / N) * (1 - q);
    num += Math.exp(h * Math.log(th / q) + (E - h) * Math.log((1 - th) / (1 - q)));
  }
  return Math.log(num / N);
}

// ---------------------------------------------------------------- main
/**
 * @param {{utc: Date, lat: number, lon: number}} birth
 * @param {Record<string, {year:number, month?:number}[]>} reported
 * @param {{toleranceMin?: number, stepMin?: number, now?: Date, horizonMonths?: number}} opts
 */
export function robustCheck(birth, reported, opts = {}) {
  const tol = opts.toleranceMin ?? 30;
  const step = opts.stepMin ?? (tol > 30 ? 10 : 5);
  const now = (opts.now || new Date()).getTime();
  const kinds = Object.keys(reported).filter((k) => reported[k].length);
  const models = modelGrid();

  // split year for the out-of-sample test (C): the median event date
  const allDates = kinds.flatMap((k) => reported[k].map((e) => windowOf(e)[0])).sort((a, b) => a - b);
  const splitMs = allDates.length >= 6 ? allDates[Math.floor(allDates.length / 2)] : null;
  const trainRep = {};
  const testRep = {};
  for (const k of kinds) {
    trainRep[k] = reported[k].filter((e) => splitMs && windowOf(e)[0] < splitMs);
    testRep[k] = reported[k].filter((e) => splitMs && windowOf(e)[0] >= splitMs);
  }

  const cells = []; // one per (model, birth time)
  const chartCache = new Map();
  for (let m = -tol; m <= tol; m += step) {
    const utc = new Date(birth.utc.getTime() + m * 60000);
    const timePrior = tol ? 1 - (0.5 * Math.abs(m)) / tol : 1;
    for (const mod of models) {
      const key = `${m}|${mod.ayanamsa}|${mod.node}`;
      if (!chartCache.has(key)) chartCache.set(key, computeChart({ utc, lat: birth.lat, lon: birth.lon }, { ayanamsa: mod.ayanamsa, node: mod.node }));
      const base = chartCache.get(key);
      const moon = base.planets.find((p) => p.key === 'moon');
      const dasa = vimshottari(moon.lon, utc, { yearDays: mod.yearDays });
      const chart = { ...base, dasa };
      const fires = firingTable(chart, mod.system, kinds);
      const periods = [];
      for (const p of dasa.periods) for (const b of p.bhuktis) for (const a of antarams(b)) periods.push({ start: a.start.getTime(), end: a.end.getTime(), bl: b.lord, al: a.lord });
      const bMs = utc.getTime();
      const startAll = Math.min(bMs + 16 * YEAR, ...allDates);
      const st = stats(periods, fires, reported, bMs, startAll, now);
      const g = llGrid(st);
      const cell = { offsetMin: m, utc, model: mod, timePrior, st, g, logBF: pooledLogBF(g), chart, fires, periods };
      if (splitMs) {
        cell.gTrain = llGrid(stats(periods, fires, trainRep, bMs, startAll, splitMs));
        cell.gTest = llGrid(stats(periods, fires, testRep, bMs, splitMs, now));
      }
      cells.push(cell);
    }
  }

  // posterior over (model, time): equal prior on models, timePrior on times
  const lw = cells.map((c) => Math.log(c.timePrior) + c.logBF);
  const mx = Math.max(...lw);
  const w = lw.map((x) => Math.exp(x - mx));
  const z = w.reduce((a, b) => a + b, 0);
  cells.forEach((c, i) => (c.post = w[i] / z));

  // model posterior (marginal over time) and time posterior (marginal over models)
  const modelPost = new Map();
  const timePost = new Map();
  for (const c of cells) {
    modelPost.set(c.model.id, (modelPost.get(c.model.id) || 0) + c.post);
    timePost.set(c.offsetMin, (timePost.get(c.offsetMin) || 0) + c.post);
  }
  const rankedModels = models.map((m) => ({ ...m, post: modelPost.get(m.id) })).sort((a, b) => b.post - a.post);
  const times = [...timePost.entries()].map(([offsetMin, post]) => ({ offsetMin, post, utc: new Date(birth.utc.getTime() + offsetMin * 60000) }));
  const stated = cells.filter((c) => c.offsetMin === 0);

  // overall evidence: Bayesian model average of the pooled Bayes factor at the stated time
  const avgBF = Math.exp(logMeanExp(stated.map((c) => c.logBF)));
  const bestCell = cells.reduce((a, c) => (c.post > a.post ? c : a));
  const bestAtStated = stated.reduce((a, c) => (c.logBF > a.logBF ? c : a));

  // λ posterior under the model average (rule strength for this person)
  const lamPost = new Float64Array(GRID);
  for (const c of cells) {
    const m = Math.max(...c.g);
    const ws = Array.from(c.g, (x) => Math.exp(x - m));
    const s = ws.reduce((a, b) => a + b, 0);
    ws.forEach((x, i) => (lamPost[i] += (c.post * x) / s));
  }
  const lamMean = Array.from(lamPost).reduce((a, p, i) => a + (p * i) / (GRID - 1), 0);
  let cum = 0;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < GRID; i++) {
    cum += lamPost[i];
    if (cum >= 0.05 && lo === 0 && i > 0) lo = (i - 1) / (GRID - 1);
    if (cum >= 0.95) {
      hi = i / (GRID - 1);
      break;
    }
  }

  // C. out-of-sample: rank models on the training events, score on the test events
  let oos = null;
  if (splitMs) {
    const trainW = cells.map((c) => Math.log(c.timePrior) + pooledLogBF(c.gTrain));
    const tm = Math.max(...trainW);
    const tw = trainW.map((x) => Math.exp(x - tm));
    const tz = tw.reduce((a, b) => a + b, 0);
    const pick = cells[trainW.indexOf(tm)];
    // predictive Bayes factor on test events, averaged with the training posterior
    const testBF = cells.reduce((acc, c, i) => acc + (tw[i] / tz) * Math.exp(pooledLogBF(c.gTest)), 0);
    oos = {
      splitYear: new Date(splitMs).getUTCFullYear(),
      trainModel: pick.model,
      trainBF: Math.exp(pooledLogBF(pick.gTrain)),
      testBF,
      testBFofPick: Math.exp(pooledLogBF(pick.gTest)),
      nTrain: kinds.reduce((a, k) => a + trainRep[k].length, 0),
      nTest: kinds.reduce((a, k) => a + testRep[k].length, 0),
    };
  }

  // per-kind detail at the most likely (model, time)
  const detail = {};
  for (const [k, s] of Object.entries(bestCell.st)) detail[k] = { ...s, expected: s.E * s.q, logBF: kindLogBF(s) };

  // E. probability forecasts for the next 24 months, averaged over models
  const horizon = now + (opts.horizonMonths ?? 12) * (YEAR / 12);
  const forecast = forecastBMA(cells, kinds, reported, now, horizon, lamMean);

  return {
    models: rankedModels,
    times,
    bestModel: bestCell.model,
    bestOffsetMin: bestCell.offsetMin,
    timeMoved: bestCell.offsetMin !== 0 && (timePost.get(bestCell.offsetMin) / bestCell.timePrior) / (timePost.get(0) / 1) > 3 && bestCell.logBF > Math.log(3),
    avgBF,
    bestBFatStated: Math.exp(bestAtStated.logBF),
    bestModelAtStated: bestAtStated.model,
    lambda: { mean: lamMean, lo, hi },
    oos,
    detail,
    forecast,
  };
}

/**
 * E. Forecast per kind: probability of at least one event in the next 12
 * months with the rules (model average) and without them (age-aware chance,
 * from the person's own past rate), plus the window the rules favour most.
 */
function forecastBMA(cells, kinds, reported, now, horizon, lamMean) {
  const top = [...cells].sort((a, b) => b.post - a.post).slice(0, 12);
  const z = top.reduce((a, c) => a + c.post, 0);
  const out = [];
  for (const k of kinds) {
    const e = EVENTS.find((x) => x.key === k);
    let pRule = 0;
    let pBase = 0;
    let bestWin = null;
    for (const c of top) {
      const st = c.st[k];
      if (!st || st.E <= 0) continue;
      const bMs = c.utc.getTime();
      const startPast = Math.min(bMs + 16 * YEAR, ...reported[k].map((x) => windowOf(x)[0]));
      let wPast = 0;
      for (let t = startPast; t < now; t += 0.25 * YEAR) wPast += 0.25 * baseRate(k, (t - bMs) / YEAR);
      const rate = st.E / Math.max(0.25, wPast); // events per base-rate-weighted year
      const th = st.q + lamMean * (1 - st.q);
      const liftF = th / st.q;
      const liftN = (1 - th) / (1 - st.q);
      let hRule = 0;
      let hBase = 0;
      for (const p of c.periods) {
        if (p.end <= now || p.start > horizon) continue;
        const s0 = Math.max(p.start, now);
        const s1 = Math.min(p.end, horizon);
        const age = ((s0 + s1) / 2 - bMs) / YEAR;
        if (e && (age < e.age[0] - 2 || age > e.age[1] + 2)) continue;
        const hz = rate * baseRate(k, age) * ((s1 - s0) / YEAR);
        const fired = c.fires[k][p.bl][p.al];
        hBase += hz;
        hRule += hz * (fired ? liftF : liftN);
        if (fired && c === top[0] && (!bestWin || s0 < bestWin.start)) bestWin = { start: new Date(s0), end: new Date(s1) };
      }
      pRule += (c.post / z) * (1 - Math.exp(-hRule));
      pBase += (c.post / z) * (1 - Math.exp(-hBase));
    }
    if (pBase > 0) out.push({ kind: k, p: pRule, base: pBase, window: bestWin });
  }
  return out.sort((a, b) => b.p - a.p);
}

// ---------------------------------------------------------------- Brier score
/** Brier score of resolved forecasts vs the same forecasts at base rate. */
export function brier(records) {
  const done = records.filter((r) => r.outcome === 0 || r.outcome === 1);
  if (!done.length) return null;
  const b = (key) => done.reduce((s, r) => s + (r[key] - r.outcome) ** 2, 0) / done.length;
  return { n: done.length, model: b('p'), chance: b('base') };
}
