#!/usr/bin/env node
// Forecast evaluation. Usage:
//   node scripts/eval.mjs --synthetic            harness self-check (null + planted cohorts)
//   node scripts/eval.mjs --data cohort.json     real cohort (dev people only)
//   node scripts/eval.mjs --data cohort.json --final   ONE-TIME final test (locks)
//   options: --cutoff 2015-01  --system parasari|kp  --folds 5  --n 300
// Cohort file: [{ id, split: 'dev'|'final', birth: {utc, lat, lon},
//   followFrom: 'YYYY-MM', followTo: 'YYYY-MM', answered: [kinds],
//   events: { kind: [{year, month?}] } }]
// Real cohorts contain personal data: keep them out of the repository.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { personGroups, evaluate, verdict, PREREG } from '../src/forecast/evaluate.js';
import { syntheticCohort } from '../src/forecast/synthetic.js';

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const cutoff = opt('--cutoff', '2015-01');
const folds = Number(opt('--folds', 5));
const cfg = { ...PREREG, system: opt('--system', PREREG.system), ...(opt('--system') === 'kp' ? { ayanamsa: 'kp' } : {}) };

const f = (x, d = 5) => (x == null ? '—' : x.toFixed(d));
function report(title, people) {
  const t0 = Date.now();
  const G = people.map((p) => personGroups(p, { cutoff, cfg }));
  const unknown = G.reduce((a, p) => a + p.unknown, 0);
  const r = evaluate(G, { folds, final: args.includes('--final') });
  console.log(`\n## ${title}`);
  console.log(`people scored: ${r.people}; unknown (year-only) person-months dropped: ${unknown}; cutoff ${cutoff}; feature: ${cfg.system}/${cfg.ayanamsa}; ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log('| model | Brier | log loss | Brier skill vs M0 | ΔBrier 95% CI | Δlog loss 95% CI |');
  console.log('|---|---|---|---|---|---|');
  for (const m of r.models) console.log(`| ${m.name} | ${f(m.brier, 6)} | ${f(m.ll, 5)} | ${(m.skill * 100).toFixed(2)}% | ${m.dBrierCI ? m.dBrierCI.map((x) => f(x, 6)).join(' … ') : ''} | ${m.dLogLossCI ? m.dLogLossCI.map((x) => f(x, 5)).join(' … ') : ''} |`);
  console.log(`test person-months: ${r.models[0].n}, events: ${r.models[0].events}; tuned (alpha, beta) per fold: ${r.tuned.map((h) => `${h.alpha}/${h.beta}`).join(', ')}`);
  console.log(`verdict (M1 vs M0): ${{ improvement: 'predictive improvement demonstrated', none: 'no predictive improvement demonstrated', worse: 'rule feature made forecasts worse' }[verdict(r)]}`);
  console.log('calibration M1 (mean forecast → observed rate, person-months):', r.calibration[1].map((b) => `${f(b.meanP, 4)}→${f(b.rate, 4)} (${b.n})`).join('; '));
  return r;
}

if (args.includes('--synthetic')) {
  const n = Number(opt('--n', 300));
  console.log('# Harness self-check on SYNTHETIC cohorts (not real people)');
  report(`null: events ignore the chart (n=${n})`, syntheticCohort({ n, seed: 11, effect: 1 }));
  report(`planted: events 2.5× as likely in rule-fired months (n=${n})`, syntheticCohort({ n, seed: 12, effect: 2.5 }));
  report(`planted weak: 1.3× (n=${n})`, syntheticCohort({ n, seed: 13, effect: 1.3 }));
} else if (opt('--data')) {
  const path = opt('--data');
  const text = readFileSync(path, 'utf8');
  if (args.includes('--final')) {
    const lock = `${path}.final-used`;
    const hash = createHash('sha256').update(text).digest('hex');
    if (existsSync(lock) && !args.includes('--force')) {
      console.error(`Final test already run on this cohort (${readFileSync(lock, 'utf8').trim()}). Re-running it after seeing the result defeats its purpose. Use --force only to reproduce the same numbers.`);
      process.exit(1);
    }
    writeFileSync(lock, `${new Date().toISOString()} sha256:${hash}\n`);
  }
  report(`cohort ${path}${args.includes('--final') ? ' (FINAL TEST)' : ' (development folds)'}`, JSON.parse(text));
} else {
  console.log('Use --synthetic or --data <cohort.json>. See the header of this file.');
}
