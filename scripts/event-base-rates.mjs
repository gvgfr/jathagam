#!/usr/bin/env node
// How often does each Palan event rule fire for people IN GENERAL?
// Generates src/palan/baseRates.json: for each rule system and age band, the
// share of sub-period time (antarams) in which each event's rule fires (the
// Palan's own three-level rules, via periodRules), over
// a reference cohort of random birth moments (seeded, reproducible).
// The Palan uses this to avoid telling everyone the same thing: an event that
// fires for most people at a given age says nothing specific about anyone.
// This measures how COMMON a statement is, not whether it is TRUE.
//   node scripts/event-base-rates.mjs [--n 400]
import { writeFileSync } from 'node:fs';
import { computeChart } from '../src/engine/index.js';
import { antarams } from '../src/engine/dasa.js';
import { analyse } from '../src/palan/index.js';
import { periodRules } from '../src/palan/plain.js';
import { kpChart } from '../src/engine/kp.js';
import { EVENTS } from '../src/palan/eventTexts.js';

const args = process.argv.slice(2);
const N = Number(args.includes('--n') ? args[args.indexOf('--n') + 1] : 400);
const YEAR = 365.25 * 86400000;
const BANDS = [18, 25, 30, 35, 40, 45, 50, 55, 60, 70, 81];
const band = (age) => BANDS.findIndex((b, i) => age >= b && age < BANDS[i + 1]);
const PLACES = [[13.08, 80.27], [9.93, 78.12], [11.0, 76.96], [40.71, -74.0], [51.5, -0.12], [1.35, 103.82]];
let seed = 20261122;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const keys = [...EVENTS.map((e) => e.key).filter((k) => k !== 'travel'), 'parents', 'safety'];
const acc = { parasari: {}, kp: {} };
for (const sys of Object.keys(acc)) for (const k of keys) acc[sys][k] = BANDS.slice(0, -1).map(() => ({ on: 0, all: 0 }));

for (let i = 0; i < N; i++) {
  const utc = new Date(Date.UTC(1940, 0, 1) + rnd() * 70 * YEAR);
  const [lat, lon] = PLACES[Math.floor(rnd() * PLACES.length)];
  const chart = computeChart({ utc, lat, lon });
  const A = analyse(chart);
  const K = kpChart(chart);
  // exactly the Palan's rules, with the three-level (dasa, bhukti, antaram) condition
  const R = { parasari: periodRules(A, null), kp: periodRules(A, K) };
  for (const p of chart.dasa.periods)
    for (const b of p.bhuktis)
      for (const a of antarams(b)) {
        const mid = (a.start.getTime() + a.end.getTime()) / 2;
        const age = (mid - utc.getTime()) / YEAR;
        const bi = band(age);
        if (bi < 0) continue;
        const w = (a.end - a.start) / YEAR;
        const fired = (r) => {
          const set = new Set(r.eventsAt(b.lord, a.lord, age, p.lord).map((e) => e.key));
          if (r.safetyAnt(b.lord, a.lord, p.lord)) set.add('safety');
          return set;
        };
        const par = fired(R.parasari);
        const kp = fired(R.kp);
        for (const k of keys) {
          const e = EVENTS.find((x) => x.key === k);
          const eligible = !e || (age >= e.age[0] && age <= e.age[1]);
          if (!eligible) continue;
          for (const [sys, set] of [['parasari', par], ['kp', kp]]) {
            acc[sys][k][bi].all += w;
            if (set.has(k)) acc[sys][k][bi].on += w;
          }
        }
      }
}
const out = { generated: new Date().toISOString().slice(0, 10), cohort: N, seed: 20261122, bands: BANDS, note: 'Share of sub-period time in which each event rule fires, by age band, over random birth moments. Measures how common a statement is, not whether it is true.', rates: {} };
for (const sys of Object.keys(acc)) {
  out.rates[sys] = {};
  for (const k of keys) out.rates[sys][k] = acc[sys][k].map((x) => (x.all ? Math.round((x.on / x.all) * 1000) / 1000 : null));
}
writeFileSync(new URL('../src/palan/baseRates.json', import.meta.url), JSON.stringify(out, null, 1));
for (const sys of Object.keys(acc)) {
  console.log(`\n${sys}`);
  for (const k of keys) console.log(k.padEnd(12), out.rates[sys][k].map((x) => (x == null ? '  -  ' : x.toFixed(2))).join(' '));
}
