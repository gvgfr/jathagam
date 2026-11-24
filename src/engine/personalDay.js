// "Today for you" (இன்றைய ராசிபலன்), the traditional way: from the person's
// birth rasi and birth star only.
//  * Chandra gocharam: the house the Moon is in today, counted from the birth rasi.
//  * Chandrashtamam: the Moon in the 8th rasi from the birth rasi.
//  * Tara balam: today's star counted from the birth star, in groups of nine.
// Times are UTC Date objects. Traditional guidance only; not a tested forecast.
import { siderealLongitude } from './astro.js';
import { NAK_SPAN } from './constants.js';

const MIN = 60000;
const moonSign = (ms) => Math.floor(siderealLongitude('moon', new Date(ms)) / 30);

/** When does the Moon's current sign (at `ms`) end? ~1 minute precision. */
function signEnd(ms) {
  const s = moonSign(ms);
  let a = ms;
  let b = ms;
  for (let i = 0; i < 80; i++) {
    b = a + 2 * 3600000; // the Moon spends ~2.3 days in a sign
    if (moonSign(b) !== s) break;
    a = b;
  }
  while (b - a > MIN) {
    const mid = (a + b) / 2;
    if (moonSign(mid) === s) a = mid;
    else b = mid;
  }
  return b;
}
/** When did the Moon's current sign (at `ms`) begin? */
function signStart(ms) {
  const s = moonSign(ms);
  let a = ms;
  let b = ms;
  for (let i = 0; i < 80; i++) {
    a = b - 2 * 3600000;
    if (moonSign(a) !== s) break;
    b = a;
  }
  while (b - a > MIN) {
    const mid = (a + b) / 2;
    if (moonSign(mid) === s) b = mid;
    else a = mid;
  }
  return b;
}

/** Moon sign segments overlapping [from, to): {sign, start, end}. */
export function moonSigns(from, to) {
  const out = [];
  let t = from.getTime();
  while (t < to.getTime()) {
    const sign = moonSign(t + 1000);
    const end = signEnd(t + 1000);
    out.push({ sign, start: new Date(out.length ? t : signStart(t + 1000)), end: new Date(end) });
    t = end;
  }
  return out;
}

/** House of `sign` counted from `rasi` (1–12). */
export const houseFrom = (rasi, sign) => ((sign - rasi + 12) % 12) + 1;

// Tara balam: count from the birth star to today's star (1–27), then group in nines.
export const TARAS = ['janma', 'sampat', 'vipat', 'kshema', 'pratyak', 'sadhana', 'naidhana', 'mitra', 'paramaMitra'];
export const TARA_KIND = { janma: 'mixed', sampat: 'good', vipat: 'weak', kshema: 'good', pratyak: 'weak', sadhana: 'good', naidhana: 'weak', mitra: 'good', paramaMitra: 'good' };
export function taraOf(birthNak, todayNak) {
  const count = ((todayNak - birthNak + 27) % 27) + 1;
  const tara = TARAS[(count - 1) % 9];
  return { count, tara, kind: TARA_KIND[tara] };
}

// Moon's house from the birth rasi: common traditional reading.
export const MOON_HOUSE_KIND = { 1: 'good', 2: 'mixed', 3: 'good', 4: 'weak', 5: 'mixed', 6: 'good', 7: 'good', 8: 'avoid', 9: 'mixed', 10: 'good', 11: 'good', 12: 'weak' };

/** Next chandrashtamam periods (Moon in the 8th rasi from `rasi`) starting at or after `from`. */
export function nextChandrashtamam(rasi, from, count = 2) {
  const target = (rasi + 7) % 12;
  const out = [];
  let t = from.getTime();
  // if one is running now, report it first
  if (moonSign(t) === target) {
    const end = signEnd(t);
    out.push({ start: new Date(signStart(t)), end: new Date(end) });
    t = end + MIN;
  }
  while (out.length < count) {
    // step sign by sign until the Moon enters the target
    const end = signEnd(t);
    t = end + MIN;
    if (moonSign(t) === target) {
      const e = signEnd(t);
      out.push({ start: new Date(end), end: new Date(e) });
      t = e + MIN;
    }
  }
  return out;
}

/**
 * The personal day from one sunrise to the next.
 * @param {{rasi:number, nakshatra:number}} birth birth Moon sign (0–11) and star (0–26)
 * @param {Date} dayStart sunrise
 * @param {Date} dayEnd next sunrise
 * @param {{index:number, end:Date}[]} nakSeq the day's nakshatra sequence (from dailyPanchangam)
 */
export function personalDay(birth, dayStart, dayEnd, nakSeq) {
  const moon = moonSigns(dayStart, dayEnd).map((m) => {
    const house = houseFrom(birth.rasi, m.sign);
    return { ...m, house, kind: MOON_HOUSE_KIND[house], chandrashtamam: house === 8 };
  });
  const taras = nakSeq.map((n) => ({ ...n, ...taraOf(birth.nakshatra, n.index) }));
  // upcoming periods that start after this day (one running today is shown with today)
  const next = nextChandrashtamam(birth.rasi, dayEnd, 3).filter((c) => c.start >= dayEnd).slice(0, 2);
  return { moon, taras, chandrashtamamToday: moon.some((m) => m.chandrashtamam), nextChandrashtamam: next };
}

/** Rasis a birth star falls in (stars on a sign boundary span two). */
export function rasisOfStar(n) {
  const a = Math.floor((n * NAK_SPAN) / 30);
  const b = Math.floor(((n + 1) * NAK_SPAN - 1e-9) / 30);
  return a === b ? [a] : [a, b];
}
