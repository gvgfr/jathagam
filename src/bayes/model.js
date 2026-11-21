// Bayesian calibration of the traditional rules against a person's own life.
//
// Question asked, per kind of event: did the person's events fall in the
// periods (antarams) where the traditional rule "fired" more often than chance?
//   q = share of the checked time during which the rule fired
//   E = number of reported events (a rough date is spread over the periods it
//       overlaps, so counts can be fractional), h = how many fell in fired time
//   H0 (no connection): each event lands in fired time with probability q
//   H1 (rule works):   probability θ > q, with θ ~ Uniform(q, 1)
// Bayes factor BF = ∫_q^1 θ^h (1-θ)^(E-h) dθ / (1-q)  ÷  q^h (1-q)^(E-h).
// Kinds are combined by multiplying. Candidate birth times are compared by the
// same evidence (posterior ∝ prior × BF), because the chart, and so which
// periods fire, changes with the birth time.
import { computeChart } from '../engine/index.js';
import { antarams } from '../engine/dasa.js';
import { analyse } from '../palan/index.js';
import { ruleFires } from '../palan/plain.js';
import { EVENTS } from '../palan/eventTexts.js';

const YEAR = 365.25 * 86400000;

// ---- log-gamma (Lanczos) and log-beta
const G = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
export function lgamma(z) {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < 8; i++) x += G[i] / (z + i + 1);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
export const lbeta = (a, b) => lgamma(a) + lgamma(b) - lgamma(a + b);

/** Weak prior Beta(α, β) centred on the person's overall event rate. */
export function priorFor({ a, b, c, d }, strength = 2) {
  const rate = (a + c + 0.5) / (a + b + c + d + 1);
  return { al: strength * rate, be: strength * (1 - rate) };
}

/** log Bayes factor H1 (rule matters) vs H0 (chance) from a 2x2 table of (fractional) counts.
 *  a = fired & event, b = fired & none, c = not fired & event, d = not fired & none. */
export function logBF(t) {
  const { a, b, c, d } = t;
  const { al, be } = priorFor(t);
  return lbeta(a + al, b + be) + lbeta(c + al, d + be) - lbeta(a + c + al, b + d + be) - lbeta(al, be);
}

/** Posterior summaries: event rate when the rule fires, when it doesn't, lift and P(p1 > p0). */
export function posterior(t) {
  const { a, b, c, d } = t;
  const { al, be } = priorFor(t);
  const p1 = (a + al) / (a + b + al + be);
  const p0 = (c + al) / (c + d + al + be);
  // P(p1 > p0) by numeric integration on a grid
  const N = 2000;
  const dens = (x, al, be) => Math.exp((al - 1) * Math.log(x) + (be - 1) * Math.log(1 - x) - lbeta(al, be));
  let cdf0 = 0;
  let prob = 0;
  const h = 1 / N;
  for (let i = 0; i < N; i++) {
    const x = (i + 0.5) * h;
    cdf0 += dens(x, c + al, d + be) * h;
    prob += dens(x, a + al, b + be) * h * Math.min(1, cdf0);
  }
  return { p1, p0, lift: p1 / p0, pBetter: Math.min(1, Math.max(0, prob)) };
}

/** log Bayes factor (rule works vs no connection) for h of E events falling in
 *  time covered q by the rule. Numeric integration handles fractional counts. */
export function logBFbinom(h, E, q) {
  if (E <= 0 || q <= 0 || q >= 1) return 0;
  const N = 2000;
  const dx = (1 - q) / N;
  let num = 0;
  for (let i = 0; i < N; i++) {
    const th = q + (i + 0.5) * dx;
    num += Math.exp(h * Math.log(th) + (E - h) * Math.log(1 - th)) * dx;
  }
  num /= 1 - q;
  const den = Math.exp(h * Math.log(q) + (E - h) * Math.log(1 - q));
  return Math.log(num) - Math.log(den);
}

/** Plain-language strength of evidence for a Bayes factor (Kass & Raftery scale). */
export function verdict(bf) {
  if (bf < 1 / 3) return 'against';
  if (bf < 3) return 'none';
  if (bf < 20) return 'moderate';
  return 'strong';
}

/** All antarams of a chart's life, with the bhukti lord. */
function lifeAntarams(chart) {
  const out = [];
  for (const p of chart.dasa.periods) for (const b of p.bhuktis) for (const a of antarams(b)) out.push({ ...a, bl: b.lord });
  return out;
}

/** Turn a reported event {year, month?} into a time window. */
export function eventWindow(ev) {
  if (ev.month) return [Date.UTC(ev.year, ev.month - 1, 1), Date.UTC(ev.year, ev.month, 1)];
  return [Date.UTC(ev.year, 0, 1), Date.UTC(ev.year + 1, 0, 1)];
}

/**
 * Score one chart against reported events.
 * @param {object} chart computeChart() result
 * @param {Record<string, {year:number, month?:number}[]>} reported events by kind; [] = "never happened"
 * @param {Date} now
 */
export function scoreChart(chart, reported, now) {
  const A = analyse(chart);
  const birth = chart.input.utc.getTime();
  const fromT = birth + 16 * YEAR; // adult life; earlier reported events extend it below
  const ants = lifeAntarams(chart).filter((a) => a.end.getTime() > birth && a.start.getTime() < now.getTime());
  const kinds = {};
  let total = 0;
  for (const [k, evs] of Object.entries(reported)) {
    const wins = evs.map(eventWindow);
    const start = Math.min(fromT, ...wins.map((w) => w[0]));
    const t = { a: 0, b: 0, c: 0, d: 0 };
    let firedTime = 0;
    let allTime = 0;
    for (const an of ants) {
      const s = Math.max(an.start.getTime(), start);
      const e = Math.min(an.end.getTime(), now.getTime());
      if (e <= s) continue;
      const fired = ruleFires(A, k, an.bl, an.lord);
      // share of each reported event that falls in this antaram
      let y = 0;
      for (const [w0, w1] of wins) {
        const ov = Math.max(0, Math.min(w1, e) - Math.max(w0, s));
        y += ov / (w1 - w0);
      }
      y = Math.min(1, y);
      allTime += e - s;
      if (fired) firedTime += e - s;
      if (fired) {
        t.a += y;
        t.b += 1 - y;
      } else {
        t.c += y;
        t.d += 1 - y;
      }
    }
    const q = allTime ? firedTime / allTime : 0;
    const E = t.a + t.c;
    const lbf = logBFbinom(t.a, E, q);
    total += lbf;
    kinds[k] = { table: t, logBF: lbf, n: evs.length, share: q, expected: E * q, hits: t.a, events: E };
  }
  return { kinds, logBF: total, A, ants };
}

/**
 * Full calibration: candidate birth times, posterior over them, per-kind
 * learning at the most likely time, and a personal forecast.
 * @param {{utc: Date, lat: number, lon: number}} birth stated birth
 * @param {Record<string, object[]>} reported
 * @param {{toleranceMin?: number, stepMin?: number, now?: Date, horizonMonths?: number}} opts
 */
export function calibrate(birth, reported, opts = {}) {
  const tol = opts.toleranceMin ?? 30;
  const step = opts.stepMin ?? 5;
  const now = opts.now || new Date();
  const cands = [];
  for (let m = -tol; m <= tol; m += step) {
    const utc = new Date(birth.utc.getTime() + m * 60000);
    const chart = computeChart({ utc, lat: birth.lat, lon: birth.lon });
    const sc = scoreChart(chart, reported, now);
    // prior: highest at the stated time, half as likely at the edge of the tolerance
    const prior = tol ? 1 - (0.5 * Math.abs(m)) / tol : 1;
    cands.push({ offsetMin: m, utc, chart, score: sc, logPost: Math.log(prior) + sc.logBF });
  }
  const mx = Math.max(...cands.map((c) => c.logPost));
  const z = cands.reduce((s, c) => s + Math.exp(c.logPost - mx), 0);
  cands.forEach((c) => (c.post = Math.exp(c.logPost - mx) / z));
  const best = cands.reduce((a, c) => (c.post > a.post ? c : a));
  const stated = cands.find((c) => c.offsetMin === 0);
  // Only move away from the stated time when the data clearly prefer another
  // (Bayes factor > 3 against the stated time) AND the rules beat chance there;
  // otherwise the "best" time is just the luckiest coincidence among candidates.
  const useBest = best !== stated && best.score.logBF - stated.score.logBF > Math.log(3) && best.score.logBF > Math.log(3);
  const chosen = useBest ? best : stated;

  // Personal forecast: upcoming antarams where a rule that clearly worked for
  // this person (Bayes factor > 3 and more events when it fired) fires again,
  // at an age where that kind of event makes sense.
  const horizon = now.getTime() + (opts.horizonMonths ?? 24) * (YEAR / 12);
  const birthT = chosen.chart.input.utc.getTime();
  const ageOk = (k, t) => {
    const e = EVENTS.find((x) => x.key === k);
    const age = (t - birthT) / YEAR;
    return k === 'parents' ? age >= 25 && age <= 85 : !e || (age >= e.age[0] && age <= e.age[1]);
  };
  const trusted = Object.entries(chosen.score.kinds).filter(([, v]) => v.logBF > Math.log(3) && v.hits > v.expected);
  const forecast = [];
  for (const an of lifeAntarams(chosen.chart)) {
    if (an.end.getTime() <= now.getTime() || an.start.getTime() > horizon) continue;
    for (const [k, info] of trusted) {
      if (!ageOk(k, an.start.getTime()) || !ruleFires(chosen.score.A, k, an.bl, an.lord)) continue;
      forecast.push({ key: k, start: an.start, end: an.end, bf: Math.exp(info.logBF) });
    }
  }
  forecast.sort((x, y) => x.start - y.start);

  return {
    candidates: cands.map(({ offsetMin, utc, post, score }) => ({ offsetMin, utc, post, logBF: score.logBF })),
    best: { offsetMin: best.offsetMin, utc: best.utc, post: best.post },
    stated: { post: stated.post, logBF: stated.score.logBF },
    usedOffsetMin: chosen.offsetMin,
    movedTime: useBest,
    kinds: chosen.score.kinds,
    overall: { logBF: chosen.score.logBF, bf: Math.exp(chosen.score.logBF), verdict: verdict(Math.exp(chosen.score.logBF)) },
    forecast,
  };
}

export const EVENT_KINDS = ['marriage', 'childbirth', 'jobChange', 'promotion', 'business', 'property', 'homeMove', 'travel', 'studies', 'healthCare', 'safety', 'setback', 'parents'];
