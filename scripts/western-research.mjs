#!/usr/bin/env node
// Descriptive, retrospective summary of the Westran-inspired timing signals
// for a research dataset (schema: src/western/research.js).
//   node scripts/western-research.mjs --data file.json            development records
//   node scripts/western-research.mjs --data file.json --heldout  held-out records (look once)
//   node scripts/western-research.mjs --data file.json --assign   write splits by connected group
//   ... --control [--per 500] [--seed 1] [--subjects a|both]       generated-partner comparison
// Real datasets hold personal data: keep them out of the repository.
// Predictive performance has not been evaluated.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, validate, assignSplits, generatedPartnerComparison, NOT_EVALUATED } from '../src/western/research.js';

const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const path = opt('--data');
if (!path) {
  console.log('Usage: --data <file.json> [--heldout] [--assign] [--orb 2.0167]');
  process.exit(0);
}
let ds = JSON.parse(readFileSync(path, 'utf8'));
if (args.includes('--assign')) {
  ds = assignSplits(ds);
  writeFileSync(path, JSON.stringify(ds, null, 1));
  console.log(`splits assigned by connected group and written to ${path}`);
}
const problems = validate(ds);
if (problems.length) {
  console.error('Dataset problems:\n- ' + problems.join('\n- '));
  process.exit(1);
}
const split = args.includes('--heldout') ? 'heldout' : 'dev';
if (args.includes('--control')) {
  const c = generatedPartnerComparison(ds, { split, perSubject: Number(opt('--per') || 100), seed: Number(opt('--seed') || 1), subjects: opt('--subjects') || 'both', opts: opt('--orb') ? { orbDeg: Number(opt('--orb')) } : {} });
  console.log(JSON.stringify(c, null, 1));
  console.log(`\n${ds.synthetic ? 'SYNTHETIC DATA — software test only. ' : ''}RETROSPECTIVE COMPARISON. ${NOT_EVALUATED}`);
  process.exit(0);
}
const res = describe(ds, { split: args.includes('--heldout') ? 'heldout' : 'dev', opts: opt('--orb') ? { orbDeg: Number(opt('--orb')) } : {} });
console.log(JSON.stringify(res, null, 1));
console.log(`\n${ds.synthetic ? 'SYNTHETIC DATA — software test only. ' : ''}RETROSPECTIVE DESCRIPTION. ${NOT_EVALUATED}`);
