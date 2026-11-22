// Synthetic cohorts for checking the evaluation harness itself. These are NOT
// data about real people and say nothing about whether astrology works. They
// answer two questions about the harness:
//   null cohort (effect = 1): events ignore the chart, so a sound harness must
//     NOT report skill beyond baseline (beyond the expected 5% false alarms);
//   planted cohort (effect > 1): events are more likely in rule-fired months,
//     so a sound harness SHOULD detect it given enough people.
// Event age curves here are deliberately different from the site's Gaussian
// assumptions, so the M2 baseline is tested against a curve it did not invent.
import { computeChart } from '../engine/index.js';
import { antarams } from '../engine/dasa.js';
import { analyse } from '../palan/index.js';
import { ruleFires } from '../palan/plain.js';
import { PREREG } from './evaluate.js';

const CITIES = [[13.08, 80.27], [9.93, 78.12], [11.0, 76.96], [10.79, 78.7], [12.97, 77.59], [8.73, 77.7]];
const YEAR = 365.25 * 86400000;

// annual hazard by age (true generating process, synthetic)
const HAZ = {
  marriage: (a) => (a < 20 ? 0.01 : a < 24 ? 0.12 : a < 30 ? 0.25 : a < 36 ? 0.12 : 0.03),
  childbirth: (a) => (a < 22 ? 0.01 : a < 28 ? 0.15 : a < 34 ? 0.18 : a < 40 ? 0.06 : 0.005),
  jobChange: (a) => (a < 30 ? 0.2 : a < 45 ? 0.12 : 0.06),
  homeMove: (a) => (a < 30 ? 0.2 : a < 45 ? 0.1 : 0.06),
  property: (a) => (a < 30 ? 0.02 : a < 50 ? 0.05 : 0.02),
};
export const SYN_KINDS = Object.keys(HAZ);

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

/**
 * @param {{n:number, seed?:number, effect?:number, yearOnlyShare?:number, followTo?:string, finalShare?:number}} o
 */
export function syntheticCohort({ n, seed = 7, effect = 1, yearOnlyShare = 0, followTo = '2026-10', finalShare = 0 }) {
  const R = rng(seed);
  const out = [];
  const [ty, tm] = followTo.split('-').map(Number);
  for (let i = 0; i < n; i++) {
    const utc = new Date(Date.UTC(1955, 0, 1) + R() * 40 * YEAR);
    const [lat, lon] = CITIES[Math.floor(R() * CITIES.length)];
    const chart = computeChart({ utc, lat, lon }, { ayanamsa: PREREG.ayanamsa, node: PREREG.node, yearDays: PREREG.yearDays });
    const A = analyse(chart);
    const ants = [];
    for (const p of chart.dasa.periods) for (const b of p.bhuktis) for (const a of antarams(b)) ants.push({ s: a.start.getTime(), e: a.end.getTime(), bl: b.lord, al: a.lord });
    const start = new Date(utc.getTime() + 18 * YEAR);
    const followFrom = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    const events = {};
    for (const kind of SYN_KINDS) {
      events[kind] = [];
      for (let y = start.getUTCFullYear(), m = start.getUTCMonth() + 1; y < ty || (y === ty && m <= tm); m === 12 ? ((m = 1), y++) : m++) {
        const ms = Date.UTC(y, m - 1, 15);
        const age = (ms - utc.getTime()) / YEAR;
        if (kind === 'marriage' && events.marriage.length) break;
        const a = ants.find((x) => x.s <= ms && ms < x.e);
        const fired = a && ruleFires(A, kind, a.bl, a.al);
        const h = (HAZ[kind](age) / 12) * (fired ? effect : 1);
        if (R() < h) events[kind].push(R() < yearOnlyShare ? { year: y } : { year: y, month: m });
      }
    }
    out.push({ id: `syn${i}`, split: R() < finalShare ? 'final' : 'dev', birth: { utc: utc.toISOString(), lat, lon }, followFrom, followTo, answered: SYN_KINDS, events });
  }
  return out;
}
