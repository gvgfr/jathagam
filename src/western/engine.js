// Westran-INSPIRED Sun–Venus progressed-synastry timing engine (experimental).
//
// This is NOT a verified replication of Paul Westran's method. The primary
// source pages could not be read from this environment; conventions that
// could not be verified are configurable assumptions (see
// docs/research/westran-spec.md). Output is a TIMING SIGNAL (when a stated
// geometric configuration holds), never an event prediction or probability.
//
// Conventions used here:
//  * Tropical zodiac, geocentric apparent ecliptic longitude, true equinox of
//    date (as Swiss Ephemeris calc_ut with default flags). Verified against
//    pyswisseph in test/western.test.js.
//  * Secondary progressions, "a day for a year": the progressed chart for a
//    target instant T is the sky at birth + (T − birth) / yearDays days. The
//    year length is a setting (default: tropical year, 365.24219 days).
//  * Aspects: conjunction (0°), trine (120°), opposition (180°), within an
//    orb (default 2°00′, inclusive: separation ≤ orb counts).
import * as A from 'astronomy-engine';

export const MODEL_VERSION = 'westran-inspired-0.1';
export const DAY = 86400000;
export const YEAR_DAYS = { tropical: 365.24219, julian: 365.25 };
export const ASPECTS = { conjunction: 0, trine: 120, opposition: 180 };
export const DEFAULTS = Object.freeze({
  orbDeg: 2, // 2°00′; "2°01′" (2 + 1/60) is a selectable alternative
  yearDays: YEAR_DAYS.tropical,
  aspects: ['conjunction', 'trine', 'opposition'],
  stepDays: 5, // timeline scan step (target-date days)
});

export const norm360 = (x) => ((x % 360) + 360) % 360;
/** Signed difference folded into (−180, 180]. */
export const norm180 = (x) => {
  const y = norm360(x);
  return y > 180 ? y - 360 : y;
};
/** Smallest angle between two longitudes, in [0, 180]. */
export const angularSeparation = (a, b) => Math.abs(norm180(a - b));

/** Tropical apparent geocentric ecliptic longitude (true equinox of date), degrees. */
export function tropicalLongitude(body, date) {
  const t = A.MakeTime(date);
  if (body === 'sun') return norm360(A.SunPosition(t).elon);
  if (body === 'venus') return norm360(A.Ecliptic(A.GeoVector(A.Body.Venus, t, true)).elon);
  throw new Error(`unsupported body ${body}`);
}

/** Secondary progression: the instant whose sky is the progressed chart for `target`. */
export function progressedInstant(birth, target, yearDays = DEFAULTS.yearDays) {
  const elapsedDays = (target.getTime() - birth.getTime()) / DAY;
  return new Date(birth.getTime() + (elapsedDays / yearDays) * DAY);
}

/** Sun and Venus for one person: natal, or progressed to `target`. */
export function positions(birth, target = null, yearDays = DEFAULTS.yearDays) {
  const t = target ? progressedInstant(birth, target, yearDays) : birth;
  return { sun: tropicalLongitude('sun', t), venus: tropicalLongitude('venus', t), at: t };
}

/** Deviation from the nearest exact angle of an aspect (degrees, signed), and which side. */
export function aspectDeviation(lonA, lonB, aspect) {
  const angle = ASPECTS[aspect];
  const d = norm180(lonA - lonB);
  const targets = angle === 0 || angle === 180 ? [angle] : [angle, -angle];
  let best = null;
  for (const T of targets) {
    const g = norm180(d - T);
    if (!best || Math.abs(g) < Math.abs(best.dev)) best = { dev: g, target: T };
  }
  return best;
}

/** Which aspect (if any) two longitudes form within the orb. Inclusive boundary. */
export function aspectBetween(lonA, lonB, aspects = DEFAULTS.aspects, orbDeg = DEFAULTS.orbDeg) {
  for (const a of aspects) {
    const { dev } = aspectDeviation(lonA, lonB, a);
    if (Math.abs(dev) <= orbDeg + 1e-12) return { aspect: a, orb: Math.abs(dev) };
  }
  return null;
}

/**
 * The configurations compared. Chart layer for each partner: N natal, P
 * progressed. Direction: A's Sun with B's Venus ("A.sun-B.venus"), and A's
 * Venus with B's Sun ("A.venus-B.sun"). 4 layers × 2 directions = 8.
 */
export const LAYERS = ['NN', 'NP', 'PN', 'PP'];
export const DIRECTIONS = ['A.sun-B.venus', 'A.venus-B.sun'];
export function configurations() {
  const out = [];
  for (const layer of LAYERS) for (const dir of DIRECTIONS) out.push({ layer, dir, id: `${layer}:${dir}` });
  return out;
}

function lonsFor(cfg, a, b) {
  const pa = cfg.layer[0] === 'N' ? a.natal : a.prog;
  const pb = cfg.layer[1] === 'N' ? b.natal : b.prog;
  return cfg.dir === 'A.sun-B.venus' ? [pa.sun, pb.venus] : [pa.venus, pb.sun];
}

/** Same person entered twice (same birth instant and place): the pair is not a relationship. */
export const samePerson = (A1, B1) => A1.birth.getTime() === B1.birth.getTime() && A1.lat === B1.lat && A1.lon === B1.lon;

/**
 * Natal/natal aspects: permanent features of the pair, NOT timing signals.
 * @param {{birth: Date}} pa @param {{birth: Date}} pb
 */
export function natalAspects(pa, pb, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const a = { natal: positions(pa.birth) };
  const b = { natal: positions(pb.birth) };
  const out = [];
  for (const cfg of configurations().filter((c) => c.layer === 'NN')) {
    const [la, lb] = lonsFor(cfg, a, b);
    const hit = aspectBetween(la, lb, o.aspects, o.orbDeg);
    if (hit) out.push({ ...cfg, ...hit, lonA: la, lonB: lb });
  }
  return out;
}

/** All configurations at one target instant (natal/natal included, flagged permanent). */
export function snapshot(pa, pb, target, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const a = { natal: positions(pa.birth), prog: positions(pa.birth, target, o.yearDays) };
  const b = { natal: positions(pb.birth), prog: positions(pb.birth, target, o.yearDays) };
  return configurations().map((cfg) => {
    const [la, lb] = lonsFor(cfg, a, b);
    const hit = aspectBetween(la, lb, o.aspects, o.orbDeg);
    return { ...cfg, permanent: cfg.layer === 'NN', lonA: la, lonB: lb, active: !!hit, aspect: hit?.aspect ?? null, orb: hit?.orb ?? null };
  });
}

function devAt(pa, pb, cfg, aspect, t, yearDays) {
  const a = { natal: cfg.layer[0] === 'N' ? positions(pa.birth) : null, prog: cfg.layer[0] === 'P' ? positions(pa.birth, t, yearDays) : null };
  const b = { natal: cfg.layer[1] === 'N' ? positions(pb.birth) : null, prog: cfg.layer[1] === 'P' ? positions(pb.birth, t, yearDays) : null };
  const [la, lb] = lonsFor(cfg, a, b);
  return aspectDeviation(la, lb, aspect).dev;
}

/** Bisection on a monotone-ish predicate between t0 (false) and t1 (true), to `resDays`. */
function bisect(f, t0, t1, resDays) {
  let lo = t0;
  let hi = t1;
  while (hi - lo > resDays * DAY) {
    const mid = (lo + hi) / 2;
    if (f(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * Timeline of windows when each CHANGING configuration (NP, PN, PP) is within
 * orb, between `from` and `to`. Natal/natal is excluded (see natalAspects).
 * Entry/exit are refined by bisection to `resolutionDays`; exact instants are
 * zero crossings of the signed deviation. A window touching the range edge is
 * marked open on that side.
 * @returns {{id, layer, dir, aspect, start: Date, end: Date, openStart, openEnd, exact: Date[], minOrb}[]}
 */
export function timeline(pa, pb, from, to, opts = {}) {
  const o = { ...DEFAULTS, resolutionDays: 1, ...opts };
  const step = o.stepDays * DAY;
  const out = [];
  if (samePerson(pa, pb)) return out;
  for (const cfg of configurations().filter((c) => c.layer !== 'NN')) {
    for (const aspect of o.aspects) {
      const dev = (ms) => devAt(pa, pb, cfg, aspect, new Date(ms), o.yearDays);
      const inOrb = (ms) => Math.abs(dev(ms)) <= o.orbDeg + 1e-12;
      let cur = null;
      let prevT = from.getTime();
      let prevIn = inOrb(prevT);
      let prevDev = dev(prevT);
      if (prevIn) cur = { start: prevT, openStart: true, exact: [], minOrb: Math.abs(prevDev) };
      for (let t = prevT + step; ; t += step) {
        const tt = Math.min(t, to.getTime());
        const d = dev(tt);
        const now = Math.abs(d) <= o.orbDeg + 1e-12;
        if (now && !prevIn) cur = { start: bisect(inOrb, prevT, tt, o.resolutionDays), openStart: false, exact: [], minOrb: Math.abs(d) };
        if (cur) {
          cur.minOrb = Math.min(cur.minOrb, Math.abs(d));
          // exact: sign change of the signed deviation while near zero
          if (Math.sign(d) !== Math.sign(prevDev) && Math.abs(d) < o.orbDeg && Math.abs(prevDev) < o.orbDeg) {
            const s0 = Math.sign(prevDev);
            const ex = bisect((ms) => Math.sign(dev(ms)) !== s0, prevT, tt, o.resolutionDays);
            cur.exact.push(new Date(ex));
            cur.minOrb = 0;
          }
        }
        if (!now && prevIn && cur) {
          cur.end = bisect((ms) => !inOrb(ms), prevT, tt, o.resolutionDays);
          cur.openEnd = false;
          out.push(finish(cur, cfg, aspect));
          cur = null;
        }
        prevT = tt;
        prevIn = now;
        prevDev = d;
        if (tt >= to.getTime()) break;
      }
      if (cur) {
        cur.end = to.getTime();
        cur.openEnd = true;
        out.push(finish(cur, cfg, aspect));
      }
    }
  }
  return out.sort((x, y) => x.start - y.start);
}
const finish = (w, cfg, aspect) => ({ ...cfg, aspect, start: new Date(w.start), end: new Date(w.end), openStart: w.openStart, openEnd: w.openEnd, exact: w.exact, minOrb: w.minOrb });

/**
 * Birth-time uncertainty: run the timeline for the earliest and latest
 * possible birth instants of each partner (and the stated/central one).
 * "Certain" spans are covered in every variant; "possible" spans in at least
 * one. Windows are matched by configuration id and aspect.
 * @param {{birth: Date, birthMin?: Date, birthMax?: Date}} pa
 */
export function timelineWithUncertainty(pa, pb, from, to, opts = {}) {
  const variants = (p) => (p.birthMin && p.birthMax ? [p.birthMin, p.birth, p.birthMax] : [p.birth]);
  const runs = [];
  for (const ba of variants(pa)) for (const bb of variants(pb)) runs.push(timeline({ ...pa, birth: ba }, { ...pb, birth: bb }, from, to, opts));
  const central = timeline(pa, pb, from, to, opts);
  if (runs.length === 1) return central.map((w) => ({ ...w, earliest: w.start, latest: w.end, certainStart: w.start, certainEnd: w.end, uncertain: false }));
  return central.map((w) => {
    const same = runs.map((r) => r.filter((x) => x.id === w.id && x.aspect === w.aspect && x.start <= w.end && x.end >= w.start));
    const starts = same.flat().map((x) => x.start.getTime());
    const ends = same.flat().map((x) => x.end.getTime());
    const inAll = same.every((s) => s.length);
    const certainStart = inAll ? Math.max(...same.map((s) => Math.min(...s.map((x) => x.start.getTime())))) : null;
    const certainEnd = inAll ? Math.min(...same.map((s) => Math.max(...s.map((x) => x.end.getTime())))) : null;
    return {
      ...w,
      earliest: new Date(Math.min(...starts)),
      latest: new Date(Math.max(...ends)),
      certainStart: certainStart != null && certainStart < certainEnd ? new Date(certainStart) : null,
      certainEnd: certainStart != null && certainStart < certainEnd ? new Date(certainEnd) : null,
      uncertain: true,
    };
  });
}
