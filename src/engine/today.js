// Daily panchangam for a place and civil date: sunrise/sunset, Tamil month and
// date, the five angams with their end times, and Raagu kaalam, Yamagandam and
// Kuligai. Times are UTC Date objects; the UI shows them in the place's zone.
import * as A from 'astronomy-engine';
import { DateTime } from 'luxon';
import { siderealLongitude, norm360 } from './astro.js';
import { NAK_SPAN } from './constants.js';

const MIN = 60000;

const ANGAM = {
  thithi: (s, m) => Math.floor(norm360(m - s) / 12), // 0-29
  nakshatra: (s, m) => Math.floor(m / NAK_SPAN), // 0-26
  yogam: (s, m) => Math.floor(norm360(s + m) / NAK_SPAN), // 0-26
  karanaHalf: (s, m) => Math.floor(norm360(m - s) / 6), // 0-59
};

function angamAt(key, t) {
  const d = new Date(t);
  return ANGAM[key](siderealLongitude('sun', d), siderealLongitude('moon', d));
}

/** When does the angam running at `t` end? (search forward, ~1 minute precision) */
function angamEnd(key, t) {
  const v = angamAt(key, t);
  let a = t;
  let b = t;
  const step = 20 * MIN;
  for (let i = 0; i < 300; i++) {
    b = a + step;
    if (angamAt(key, b) !== v) break;
    a = b;
  }
  while (b - a > MIN) {
    const mid = (a + b) / 2;
    if (angamAt(key, mid) === v) a = mid;
    else b = mid;
  }
  return new Date(b);
}

/** Karanam number (0-10 in the i18n table) from the half-thithi index. */
export function karanamOf(half) {
  if (half === 0) return 10;
  if (half >= 57) return 7 + (half - 57);
  return (half - 1) % 7;
}

// Which 1/8th of daytime (1-based) each period occupies, by weekday (0 = Sunday)
export const RAAGU_PART = [8, 2, 7, 5, 6, 4, 3];
export const YAMA_PART = [5, 4, 3, 2, 1, 7, 6];
export const KULIGAI_PART = [7, 6, 5, 4, 3, 2, 1];

/**
 * @param {string} isoDate local civil date "YYYY-MM-DD"
 * @param {number} lat
 * @param {number} lon
 * @param {string} zone IANA zone of the place
 */
export function dailyPanchangam(isoDate, lat, lon, zone) {
  const day = DateTime.fromISO(isoDate, { zone }).startOf('day');
  const obs = new A.Observer(lat, lon, 0);
  const rise = A.SearchRiseSet(A.Body.Sun, obs, +1, day.toJSDate(), 1);
  const set = rise ? A.SearchRiseSet(A.Body.Sun, obs, -1, rise.date, 1) : null;
  if (!rise || !set) return { polar: true };
  const sunrise = rise.date;
  const sunset = set.date;
  const weekday = day.weekday % 7; // luxon: Mon=1..Sun=7 -> Sun=0

  // Angams running at sunrise, with end times, plus the one that follows if it
  // also starts before the next sunrise.
  const nextRise = A.SearchRiseSet(A.Body.Sun, obs, +1, new Date(sunrise.getTime() + 60 * MIN), 1.2)?.date;
  const seq = (key, map = (x) => x) => {
    const out = [];
    let t = sunrise.getTime();
    for (let i = 0; i < 3; i++) {
      const idx = angamAt(key, t + 1000);
      const end = angamEnd(key, t + 1000);
      out.push({ index: map(idx), end });
      if (!nextRise || end >= nextRise) break;
      t = end.getTime();
    }
    return out;
  };

  // Day periods: daytime split into 8 equal parts
  const dayLen = sunset - sunrise;
  const part = (n) => ({ start: new Date(sunrise.getTime() + ((n - 1) * dayLen) / 8), end: new Date(sunrise.getTime() + (n * dayLen) / 8) });

  // Tamil solar month: the Sun's sidereal sign at sunrise; day 1 is the day of
  // the sankranti if it falls before sunset, otherwise the next day.
  const sunSign = Math.floor(siderealLongitude('sun', sunrise) / 30);
  let a = sunrise.getTime() - 32 * 86400000;
  let b = sunrise.getTime();
  while (b - a > MIN) {
    const mid = (a + b) / 2;
    if (Math.floor(siderealLongitude('sun', new Date(mid)) / 30) === sunSign) b = mid;
    else a = mid;
  }
  const sankranti = DateTime.fromMillis(b, { zone });
  const sankDay = sankranti.startOf('day');
  const sankSet = A.SearchRiseSet(A.Body.Sun, obs, -1, sankDay.toJSDate(), 1)?.date;
  const day1 = sankSet && sankranti.toMillis() < sankSet.getTime() ? sankDay : sankDay.plus({ days: 1 });
  const tamilDay = Math.round(day.diff(day1, 'days').days) + 1;

  return {
    date: isoDate,
    weekday,
    sunrise,
    sunset,
    nextSunrise: nextRise || new Date(sunrise.getTime() + 86400000),
    tamilMonth: sunSign, // 0 = Chithirai (Sun in Mesham)
    tamilDay,
    thithi: seq('thithi'),
    nakshatra: seq('nakshatra'),
    yogam: seq('yogam'),
    karanam: seq('karanaHalf', karanamOf),
    raaguKaalam: part(RAAGU_PART[weekday]),
    yamagandam: part(YAMA_PART[weekday]),
    kuligai: part(KULIGAI_PART[weekday]),
  };
}
