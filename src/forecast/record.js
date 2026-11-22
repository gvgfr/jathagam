// Versioned, exportable record of probability forecasts, so they can be
// scored when the horizon ends without losing what was originally forecast.
//
// Limits (stated in the UI too): records live in this browser only. The
// SHA-256 hash detects later edits to a record, but anyone can recompute it,
// so it is NOT independent proof of when a forecast was made. For that, export
// the file and send it to someone (or a timestamping service) at the time.

export const RECORD_VERSION = 2;
/* global __APP_VERSION__ */
export const CODE_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

const MONTH = 365.25 * 86400000 / 12;

/** JSON with sorted keys, so the hash does not depend on key order. */
export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}

async function sha256(text) {
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

// The fields a hash covers: everything fixed when the forecast was made.
const SEALED = ['v', 'id', 'kind', 'defVersion', 'createdAt', 'from', 'to', 'horizonMonths', 'p', 'base', 'pEffect', 'model', 'codeVersion', 'inputHash'];
const sealedPart = (r) => Object.fromEntries(SEALED.map((k) => [k, r[k]]));

/** Hash of the birth details and events used, so the inputs can be matched later without storing them in the record. */
export const inputHash = (inputs) => sha256(canonical(inputs));

/**
 * Create a sealed forecast record.
 * @param {{kind:string, p:number, base:number, pEffect?:number, model:object, inputs:object, now?:number, horizonMonths?:number, defVersion:number}} f
 */
export async function makeRecord(f) {
  const createdAt = f.now ?? Date.now();
  const horizonMonths = f.horizonMonths ?? 12;
  const r = {
    v: RECORD_VERSION,
    id: `${f.kind}|${new Date(createdAt).toISOString()}`,
    kind: f.kind,
    defVersion: f.defVersion,
    createdAt,
    from: createdAt,
    to: createdAt + horizonMonths * MONTH,
    horizonMonths,
    p: f.p,
    base: f.base,
    pEffect: f.pEffect,
    model: f.model,
    codeVersion: CODE_VERSION,
    inputHash: await inputHash(f.inputs),
  };
  r.hash = await sha256(canonical(sealedPart(r)));
  return r;
}

/** True if the sealed part of the record still matches its hash. */
export async function verifyRecord(r) {
  if (!r.hash) return false;
  return (await sha256(canonical(sealedPart(r)))) === r.hash;
}

/** Record the outcome: 'yes' | 'no' | 'unknown'. */
export function resolve(r, outcome, at = Date.now()) {
  return { ...r, outcome, resolvedAt: at };
}

/** Old (v1) records had no definition, model or hash: keep them, flagged. */
export function migrate(r) {
  if (r.v === RECORD_VERSION) return r;
  const outcome = r.outcome === 1 ? 'yes' : r.outcome === 0 ? 'no' : undefined;
  return { v: 1, legacy: true, id: r.id, kind: r.kind, p: r.p, base: r.base, from: r.from, to: r.to, createdAt: r.from, outcome };
}

const clip = (p) => Math.min(1 - 1e-6, Math.max(1e-6, p));

/**
 * Score resolved records against the stated baseline.
 * brier/logLoss: lower is better. skill = 1 − brier/brierBase (0 = no better
 * than baseline, negative = worse). Calibration bins need many records.
 */
export function score(records, { bins = 5 } = {}) {
  const done = records.filter((r) => r.outcome === 'yes' || r.outcome === 'no');
  if (!done.length) return null;
  const y = (r) => (r.outcome === 'yes' ? 1 : 0);
  const n = done.length;
  const brier = done.reduce((s, r) => s + (r.p - y(r)) ** 2, 0) / n;
  const brierBase = done.reduce((s, r) => s + (r.base - y(r)) ** 2, 0) / n;
  const ll = (key) => done.reduce((s, r) => s - (y(r) ? Math.log(clip(r[key])) : Math.log(1 - clip(r[key]))), 0) / n;
  const calibration = Array.from({ length: bins }, (_, i) => ({ lo: i / bins, hi: (i + 1) / bins, n: 0, meanP: 0, rate: 0 }));
  for (const r of done) {
    const b = calibration[Math.min(bins - 1, Math.floor(r.p * bins))];
    b.n++;
    b.meanP += r.p;
    b.rate += y(r);
  }
  for (const b of calibration) if (b.n) {
    b.meanP /= b.n;
    b.rate /= b.n;
  }
  return {
    n,
    events: done.filter((r) => y(r)).length,
    brier,
    brierBase,
    skill: brierBase > 0 ? 1 - brier / brierBase : 0,
    logLoss: ll('p'),
    logLossBase: ll('base'),
    calibration: calibration.filter((b) => b.n),
    legacy: done.filter((r) => r.legacy).length,
  };
}

/** Export file body (JSON). */
export function exportRecords(records) {
  return JSON.stringify({ app: 'gv-jathagam', kind: 'forecast-records', v: RECORD_VERSION, exportedAt: new Date().toISOString(), records }, null, 1);
}

/**
 * Merge an exported file into existing records. Records are matched by id;
 * a resolved outcome is kept over an unresolved one, and records whose sealed
 * part differs from an existing one with the same id are kept as conflicts.
 */
export async function importRecords(text, existing) {
  const data = JSON.parse(text);
  if (data?.kind !== 'forecast-records' || !Array.isArray(data.records)) throw new Error('not a forecast file');
  const out = existing.map((r) => ({ ...r }));
  let added = 0;
  let conflicts = 0;
  for (const raw of data.records) {
    const r = migrate(raw);
    const i = out.findIndex((x) => x.id === r.id);
    if (i < 0) {
      out.push(r);
      added++;
      continue;
    }
    if (r.hash && out[i].hash && r.hash !== out[i].hash) {
      out.push({ ...r, id: `${r.id}#conflict`, conflict: true });
      conflicts++;
    } else if (!out[i].outcome && r.outcome) out[i] = { ...out[i], outcome: r.outcome, resolvedAt: r.resolvedAt };
  }
  const invalid = (await Promise.all(out.map((r) => (r.hash ? verifyRecord(r) : true)))).filter((ok) => !ok).length;
  return { records: out, added, conflicts, invalid };
}
