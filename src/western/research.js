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
