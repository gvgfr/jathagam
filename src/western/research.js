// Research harness for the Westran-inspired timing experiment. DESCRIPTIVE and
// RETROSPECTIVE only: aspect frequencies, how much of an observation window
// the timing signals cover, and whether recorded events fell inside them.
// It does not, and cannot from event-only data, measure forecasting accuracy.
// Every result carries: "Predictive performance has not been evaluated."
//
// Dataset schema (version 1). Keep real datasets OUT of the repository.
// {
//   "schema": "gv-jathagam/western-research", "version": 1,
//   "synthetic": false,                       // true for test fixtures
//   "people": [{
//     "id": "p1",
//     "birth": "1977-07-27T19:00:00Z",        // UTC instant (stated or central)
//     "birthMin": "...", "birthMax": "...",   // optional: time uncertainty bounds
//     "timeKnown": true                       // false = only the date is known
//   }],
//   "relationships": [{
//     "id": "r1", "a": "p1", "b": "p2",
//     "split": "dev" | "heldout",             // must be equal for every relationship
//                                             // in one connected group of people
//     "observedFrom": "1995", "observedTo": "2020-06",  // follow-up, any precision
//     "events": [{
//       "type": "beginning" | "marriage" | "separation",
//       "date": "2001-05-17" | "2001-05" | "2001",       // precision is read from the form
//       "status": "occurred" | "did-not-occur" | "unknown"
//     }]
//   }]
// }
// "did-not-occur" means confirmed not to have happened within the observed
// period (e.g. never married); "unknown" means not known and is excluded.
import { timeline, natalAspects, samePerson, DEFAULTS, MODEL_VERSION } from './engine.js';

export const NOT_EVALUATED = 'Predictive performance has not been evaluated.';
export const EVENT_TYPES = ['beginning', 'marriage', 'separation'];
export const STATUSES = ['occurred', 'did-not-occur', 'unknown'];

/** Parse "YYYY", "YYYY-MM" or "YYYY-MM-DD" to an interval [start, end) in UTC with its precision. */
export function parseDatePrecision(s) {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(String(s || ''));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = m[2] ? Number(m[2]) : null;
  const d = m[3] ? Number(m[3]) : null;
  if (mo != null && (mo < 1 || mo > 12)) return null;
  if (d != null) {
    const start = Date.UTC(y, mo - 1, d);
    if (new Date(start).getUTCDate() !== d) return null; // e.g. 2001-02-29
    return { precision: 'day', start: new Date(start), end: new Date(start + 86400000) };
  }
  if (mo != null) return { precision: 'month', start: new Date(Date.UTC(y, mo - 1, 1)), end: new Date(Date.UTC(y, mo, 1)) };
  return { precision: 'year', start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y + 1, 0, 1)) };
}

/** Connected groups of people linked by relationships (repeated partners stay together). */
export function components(ds) {
  const parent = new Map(ds.people.map((p) => [p.id, p.id]));
  const find = (x) => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)));
  for (const r of ds.relationships) if (parent.has(r.a) && parent.has(r.b)) parent.set(find(r.a), find(r.b));
  const groups = new Map();
  for (const r of ds.relationships) {
    const root = find(r.a);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(r);
  }
  return [...groups.values()];
}

/** Validate a dataset; returns a list of problems (empty = valid). */
export function validate(ds) {
  const errs = [];
  if (ds?.schema !== 'gv-jathagam/western-research' || ds.version !== 1) errs.push('schema/version must be gv-jathagam/western-research v1');
  const people = new Map((ds?.people || []).map((p) => [p.id, p]));
  for (const p of ds?.people || []) {
    if (Number.isNaN(new Date(p.birth).getTime())) errs.push(`person ${p.id}: invalid birth`);
    if (p.timeKnown === false && !(p.birthMin && p.birthMax)) errs.push(`person ${p.id}: unknown birth time needs birthMin and birthMax`);
  }
  for (const r of ds?.relationships || []) {
    if (!people.has(r.a) || !people.has(r.b)) errs.push(`relationship ${r.id}: unknown person`);
    else if (r.a === r.b) errs.push(`relationship ${r.id}: a and b are the same person`);
    if (!['dev', 'heldout'].includes(r.split)) errs.push(`relationship ${r.id}: split must be dev or heldout`);
    for (const k of ['observedFrom', 'observedTo']) if (r[k] && !parseDatePrecision(r[k])) errs.push(`relationship ${r.id}: bad ${k}`);
    for (const e of r.events || []) {
      if (!EVENT_TYPES.includes(e.type)) errs.push(`relationship ${r.id}: bad event type ${e.type}`);
      if (!STATUSES.includes(e.status)) errs.push(`relationship ${r.id}: bad status ${e.status}`);
      if (e.status === 'occurred' && !parseDatePrecision(e.date)) errs.push(`relationship ${r.id}: occurred event needs a date`);
    }
  }
  for (const g of components(ds || { people: [], relationships: [] })) {
    if (new Set(g.map((r) => r.split)).size > 1) errs.push(`relationships ${g.map((r) => r.id).join(', ')} share people but have different splits (leakage)`);
  }
  return errs;
}

/** Deterministically assign dev / heldout by connected group (hash of the smallest relationship id). */
export function assignSplits(ds, heldoutShare = 0.3) {
  const h = (s) => [...s].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 7) / 4294967296;
  const out = { ...ds, relationships: ds.relationships.map((r) => ({ ...r })) };
  for (const g of components(out)) {
    const key = g.map((r) => r.id).sort()[0];
    const split = h(key) < heldoutShare ? 'heldout' : 'dev';
    for (const r of g) r.split = split;
  }
  return out;
}

const personOf = (p) => ({ birth: new Date(p.birth), birthMin: p.birthMin ? new Date(p.birthMin) : null, birthMax: p.birthMax ? new Date(p.birthMax) : null, lat: p.lat, lon: p.lon });

/**
 * Descriptive retrospective summary for one partition.
 * @param {object} ds dataset
 * @param {{split?: 'dev'|'heldout', opts?: object, windowYears?: number}} o
 */
export function describe(ds, { split = 'dev', opts = {}, windowYears = 5 } = {}) {
  const problems = validate(ds);
  if (problems.length) throw new Error(`invalid dataset: ${problems[0]}`);
  const o = { ...DEFAULTS, ...opts };
  const people = new Map(ds.people.map((p) => [p.id, p]));
  const rels = ds.relationships.filter((r) => r.split === split);
  const natalFreq = {};
  let pairs = 0;
  let pairsWithNatal = 0;
  const events = [];
  let coveredMs = 0;
  let observedMs = 0;
  const excluded = { unknown: 0, didNotOccur: 0 };
  for (const r of rels) {
    const pa = personOf(people.get(r.a));
    const pb = personOf(people.get(r.b));
    if (samePerson(pa, pb)) continue;
    pairs++;
    const nat = natalAspects(pa, pb, o);
    if (nat.length) pairsWithNatal++;
    for (const n of nat) natalFreq[`${n.dir} ${n.aspect}`] = (natalFreq[`${n.dir} ${n.aspect}`] || 0) + 1;
    // observation window: given follow-up, or windowYears either side of the events
    const occurred = (r.events || []).filter((e) => e.status === 'occurred').map((e) => ({ ...e, iv: parseDatePrecision(e.date) }));
    excluded.unknown += (r.events || []).filter((e) => e.status === 'unknown').length;
    excluded.didNotOccur += (r.events || []).filter((e) => e.status === 'did-not-occur').length;
    const from = r.observedFrom ? parseDatePrecision(r.observedFrom).start : occurred.length ? new Date(Math.min(...occurred.map((e) => e.iv.start)) - windowYears * 365.25 * 86400000) : null;
    const to = r.observedTo ? parseDatePrecision(r.observedTo).end : occurred.length ? new Date(Math.max(...occurred.map((e) => e.iv.end)) + windowYears * 365.25 * 86400000) : null;
    if (!from || !to || to <= from) continue;
    const wins = timeline(pa, pb, from, to, o);
    const uncertain = !!(pa.birthMin || pb.birthMin);
    // union of all changing-signal windows
    const spans = wins.map((w) => [w.start.getTime(), w.end.getTime()]).sort((x, y) => x[0] - y[0]);
    const merged = [];
    for (const s of spans) {
      if (merged.length && s[0] <= merged.at(-1)[1]) merged.at(-1)[1] = Math.max(merged.at(-1)[1], s[1]);
      else merged.push([...s]);
    }
    const cover = (a, b) => merged.reduce((acc, [s, e]) => acc + Math.max(0, Math.min(e, b) - Math.max(s, a)), 0);
    coveredMs += cover(from.getTime(), to.getTime());
    observedMs += to - from;
    for (const e of occurred) {
      const a = e.iv.start.getTime();
      const b = e.iv.end.getTime();
      const share = cover(a, b) / (b - a); // fraction of the date's precision interval inside a window
      events.push({ relationship: r.id, type: e.type, precision: e.iv.precision, share, inside: share === 1 ? 'yes' : share === 0 ? 'no' : 'partly', uncertainBirthTime: uncertain });
    }
  }
  const byType = {};
  for (const t of EVENT_TYPES) {
    const es = events.filter((e) => e.type === t);
    byType[t] = {
      n: es.length,
      byPrecision: Object.fromEntries(['day', 'month', 'year'].map((p) => [p, es.filter((e) => e.precision === p).length])),
      inside: es.filter((e) => e.inside === 'yes').length,
      partly: es.filter((e) => e.inside === 'partly').length,
      outside: es.filter((e) => e.inside === 'no').length,
      meanShare: es.length ? es.reduce((s, e) => s + e.share, 0) / es.length : null,
    };
  }
  return {
    kind: 'retrospective-descriptive',
    predictivePerformance: NOT_EVALUATED,
    synthetic: !!ds.synthetic,
    modelVersion: MODEL_VERSION,
    settings: { orbDeg: o.orbDeg, yearDays: o.yearDays, aspects: o.aspects, split, windowYears },
    pairs,
    natal: { pairsWithAny: pairsWithNatal, frequency: natalFreq },
    coverage: observedMs ? coveredMs / observedMs : null, // share of observed time inside any changing window
    events: byType,
    excluded,
    eventsWithUncertainBirthTime: events.filter((e) => e.uncertainBirthTime).length,
    note: 'Coverage is the share of observed time inside any Sun–Venus window. If events fell inside windows about as often as coverage, the windows add nothing; even more alignment would not show predictive accuracy without a predefined rule, eligible periods, known follow-up and a baseline.',
  };
}

// ---------------------------------------------------------------- generated-partner comparison
// Westran-INSPIRED version of the control described in the supplied notes:
// for each subject, artificial partners are generated with birth dates within
// the real partner's birth year ± 2 years, and the real relationship's event
// date is kept fixed; observed hits are compared with the hit rate among the
// artificial partners scaled to the real count.
//
// Unresolved in the notes, so these are OUR settings (not attributed to the
// author): uniform sampling over calendar days in that 5-year span; the
// artificial partner's time of day = the real partner's time of day (noon UTC
// if unknown); seeded generator (mulberry32); which partner is the "subject"
// (default: each partner in turn); event date = relationship beginning, else
// marriage as a substitute, flagged; a month- or year-only date is taken at
// its midpoint and counted separately by precision.
//
// This is a retrospective comparison anchored to events that already
// happened. It does not test whether a given couple will start a relationship
// in a future window, and gives no significance test: repeated people and the
// many configurations make simple tests invalid.
import { snapshot } from './engine.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Artificial partner birth instants: uniform calendar day in [year − 2, year + 2], real time of day. */
export function generatePartners(realBirth, n, rnd, timeKnown = true) {
  const y = realBirth.getUTCFullYear();
  const start = Date.UTC(y - 2, 0, 1);
  const days = Math.round((Date.UTC(y + 3, 0, 1) - start) / 86400000);
  const tod = timeKnown ? realBirth.getTime() - Date.UTC(y, realBirth.getUTCMonth(), realBirth.getUTCDate()) : 12 * 3600000;
  return Array.from({ length: n }, () => new Date(start + Math.floor(rnd() * days) * 86400000 + tod));
}

/** Event instant used for comparison: beginning, else marriage (substitute). */
function anchorEvent(r) {
  const occ = (r.events || []).filter((e) => e.status === 'occurred');
  const e = occ.find((x) => x.type === 'beginning') || occ.find((x) => x.type === 'marriage');
  if (!e) return null;
  const iv = parseDatePrecision(e.date);
  return { type: e.type, substitute: e.type === 'marriage', precision: iv.precision, at: new Date((iv.start.getTime() + iv.end.getTime()) / 2) };
}

/**
 * @param {object} ds dataset
 * @param {{split?: string, perSubject?: number, seed?: number, subjects?: 'both'|'a', opts?: object}} o
 */
export function generatedPartnerComparison(ds, { split = 'dev', perSubject = 100, seed = 1, subjects = 'both', opts = {} } = {}) {
  const problems = validate(ds);
  if (problems.length) throw new Error(`invalid dataset: ${problems[0]}`);
  const o = { ...DEFAULTS, ...opts };
  const rnd = mulberry32(seed);
  const people = new Map(ds.people.map((p) => [p.id, p]));
  const rels = ds.relationships.filter((r) => r.split === split);
  const keyOf = (c) => `${c.layer}:${c.dir}:${c.aspect}`;
  const obs = {};
  const ctl = {};
  let subjectsN = 0;
  const anchors = { beginning: 0, marriageSubstitute: 0, byPrecision: { day: 0, month: 0, year: 0 }, none: 0 };
  const usedPeople = new Set();
  for (const r of rels) {
    const ev = anchorEvent(r);
    if (!ev) {
      anchors.none++;
      continue;
    }
    if (ev.substitute) anchors.marriageSubstitute++;
    else anchors.beginning++;
    anchors.byPrecision[ev.precision]++;
    const P = { a: people.get(r.a), b: people.get(r.b) };
    usedPeople.add(r.a).add(r.b);
    const roles = subjects === 'both' ? [['a', 'b'], ['b', 'a']] : [['a', 'b']];
    for (const [subj, partner] of roles) {
      subjectsN++;
      const S = { birth: new Date(P[subj].birth) };
      const real = { birth: new Date(P[partner].birth) };
      // keep the direction labels relative to the subject: A = subject, B = partner
      for (const c of snapshot(S, real, ev.at, o)) if (c.active) obs[keyOf(c)] = (obs[keyOf(c)] || 0) + 1;
      for (const fake of generatePartners(real.birth, perSubject, rnd, P[partner].timeKnown !== false)) {
        for (const c of snapshot(S, { birth: fake }, ev.at, o)) if (c.active) ctl[keyOf(c)] = (ctl[keyOf(c)] || 0) + 1 / perSubject;
      }
    }
  }
  const keys = [...new Set([...Object.keys(obs), ...Object.keys(ctl)])].sort();
  const rows = keys.map((k) => {
    const [layer, dir, aspect] = k.split(':');
    const observed = obs[k] || 0;
    const expected = ctl[k] || 0; // mean hits per subject among artificial partners × subjects
    return { layer, dir, aspect, permanent: layer === 'NN', observed, expected, ratio: expected > 0 ? observed / expected : null };
  });
  const sum = (f) => rows.reduce((a, x) => a + f(x), 0);
  const changing = rows.filter((x) => !x.permanent);
  return {
    kind: 'retrospective-generated-partner-comparison',
    predictivePerformance: NOT_EVALUATED,
    synthetic: !!ds.synthetic,
    modelVersion: MODEL_VERSION,
    mirrored: subjects === 'both', // each couple counted from both sides: (NP, A.sun-B.venus) for one subject is (PN, A.venus-B.sun) for the other
    settings: { split, perSubject, seed, subjects, orbDeg: o.orbDeg, yearDays: o.yearDays, sampling: 'uniform calendar day within partner birth year ± 2; real time of day (noon UTC if unknown)' },
    relationships: rels.length,
    subjects: subjectsN,
    distinctPeople: usedPeople.size,
    connectedGroups: components({ people: ds.people, relationships: rels }).length,
    anchors,
    rows,
    totals: {
      changing: { observed: sum((x) => (x.permanent ? 0 : x.observed)), expected: changing.reduce((a, x) => a + x.expected, 0) },
      natal: { observed: sum((x) => (x.permanent ? x.observed : 0)), expected: rows.filter((x) => x.permanent).reduce((a, x) => a + x.expected, 0) },
    },
    note: 'Observed = subjects whose real partner forms the configuration at the event date. Expected = the same count averaged over generated partners. A ratio above 1 in a small or reused sample is not evidence of prediction; repeated people make subjects dependent, and no significance test is given.',
  };
}
