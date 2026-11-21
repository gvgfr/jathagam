// Gocharam (transits): where the slow planets are today, counted from the
// natal Moon sign, and when they change sign. Used by the palan readings.
import { siderealLongitude } from './astro.js';

const DAY = 86400000;
const signAt = (key, t) => Math.floor(siderealLongitude(key, new Date(t)) / 30);
const houseFrom = (sign, moonSign) => ((sign - moonSign + 12) % 12) + 1;

/** First time after/before `t0` (searching in `dir` = +1/-1) when `pred(sign)` becomes false. */
function findChange(key, t0, dir, pred, stepDays, maxDays) {
  let t = t0;
  for (let d = 0; d < maxDays; d += stepDays) {
    const tn = t + dir * stepDays * DAY;
    if (!pred(signAt(key, tn))) {
      // bisect to ~1 day
      let a = t;
      let b = tn;
      while (Math.abs(b - a) > DAY) {
        const m = (a + b) / 2;
        if (pred(signAt(key, m))) a = m;
        else b = m;
      }
      return new Date(dir > 0 ? b : a);
    }
    t = tn;
  }
  return null;
}

/**
 * @param {number} moonSign natal rasi (0-11)
 * @param {Date} now
 */
export function gocharam(moonSign, now = new Date()) {
  const t0 = now.getTime();
  const out = {};
  for (const [key, step, max] of [['saturn', 10, 3650], ['jupiter', 5, 800], ['rahu', 10, 1000]]) {
    const sign = signAt(key, t0);
    const same = (s) => s === sign;
    out[key] = {
      sign,
      house: houseFrom(sign, moonSign),
      since: findChange(key, t0, -1, same, step, max),
      until: findChange(key, t0, +1, same, step, max),
    };
  }

  // Ezharai (7½-year) Sani: Saturn in the 12th, 1st or 2nd from the Moon sign
  const sadeSet = [11, 0, 1].map((o) => (moonSign + o) % 12);
  const inSade = (s) => sadeSet.includes(s);
  const sat = out.saturn;
  let sade = null;
  if (inSade(sat.sign)) {
    const phase = { 12: 1, 1: 2, 2: 3 }[sat.house];
    sade = {
      active: true,
      phase,
      start: findChange('saturn', t0, -1, inSade, 10, 4000),
      end: findChange('saturn', t0, +1, inSade, 10, 4000),
    };
  } else {
    // next start: first time Saturn enters the 12th from the Moon
    const start = findChange('saturn', t0, +1, (s) => !inSade(s), 15, 11000);
    sade = { active: false, nextStart: start };
  }
  return { ...out, sadeSati: sade };
}

/**
 * Signs of the slow and medium planets at the middle of each month, for
 * `months` months from `from`. Used for the month-by-month outlook.
 */
export function monthlyPositions(from, months = 12) {
  const out = [];
  const d0 = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 15));
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + i, 15));
    const row = { date: d };
    for (const k of ['saturn', 'jupiter', 'mars', 'rahu']) row[k] = signAt(k, d.getTime());
    out.push(row);
  }
  return out;
}

/** Periods (start/end) within [from, to] when `key` is in one of `signs` (sampled every `stepDays`). */
export function transitWindows(key, signs, from, to, stepDays = 3) {
  const res = [];
  let cur = null;
  for (let t = from.getTime(); t <= to.getTime(); t += stepDays * DAY) {
    const inside = signs.includes(signAt(key, t));
    if (inside && !cur) cur = { start: new Date(t), sign: signAt(key, t) };
    if (!inside && cur) {
      cur.end = new Date(t);
      res.push(cur);
      cur = null;
    }
  }
  if (cur) {
    cur.end = new Date(to);
    res.push(cur);
  }
  return res;
}
