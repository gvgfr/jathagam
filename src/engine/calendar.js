// Tamil calendar for a place: per-day sunrise/sunset, Tamil solar month and
// date, thithi and nakshatram at sunrise/sunset/afternoon, and the festival
// and vratham rules built on them. Rules follow common Tamil (Thirukanitha)
// practice; printed Vakya calendars can differ by a day.
import * as A from 'astronomy-engine';
import { DateTime } from 'luxon';
import { siderealLongitude, norm360 } from './astro.js';
import { NAK_SPAN } from './constants.js';

const tithiAt = (d) => Math.floor(norm360(siderealLongitude('moon', d) - siderealLongitude('sun', d)) / 12);
const nakAt = (d) => Math.floor(siderealLongitude('moon', d) / NAK_SPAN);
const sunSign = (d) => Math.floor(siderealLongitude('sun', d) / 30);

/** One civil day at a place (isoDate in the place's zone). */
export function dayInfo(isoDate, lat, lon, zone) {
  const start = DateTime.fromISO(isoDate, { zone }).startOf('day');
  const obs = new A.Observer(lat, lon, 0);
  const rise = A.SearchRiseSet(A.Body.Sun, obs, +1, start.toJSDate(), 1)?.date;
  const set = rise ? A.SearchRiseSet(A.Body.Sun, obs, -1, rise, 1)?.date : null;
  if (!rise || !set) return { date: isoDate, polar: true };
  const aparahna = new Date(rise.getTime() + 0.7 * (set - rise)); // afternoon, used for shraddham
  return {
    date: isoDate,
    weekday: start.weekday % 7, // 0 = Sunday
    sunrise: rise,
    sunset: set,
    tithiRise: tithiAt(rise),
    tithiSet: tithiAt(set),
    tithiAparahna: tithiAt(aparahna),
    nakRise: nakAt(rise),
    nakSet: nakAt(set),
    month: sunSign(set), // Tamil month: a sankranti before sunset starts the month that day
  };
}

/** Scan [fromISO, toISO] day by day, adding the Tamil date (day of month). */
export function scanDays(fromISO, toISO, lat, lon, zone) {
  const out = [];
  let d = DateTime.fromISO(fromISO, { zone });
  const end = DateTime.fromISO(toISO, { zone });
  let prev = null;
  let dayNo = null;
  while (d <= end) {
    const info = dayInfo(d.toISODate(), lat, lon, zone);
    if (!info.polar) {
      if (prev && info.month !== prev.month) dayNo = 1;
      else if (dayNo != null) dayNo += 1;
      info.tamilDay = dayNo;
      prev = info;
    }
    out.push(info);
    d = d.plus({ days: 1 });
  }
  return out;
}

// ---------------------------------------------------------------- festivals
// Month index: 0 Chithirai, 1 Vaikasi, 2 Aani, 3 Aadi, 4 Aavani, 5 Purattasi,
// 6 Aippasi, 7 Karthigai, 8 Margazhi, 9 Thai, 10 Maasi, 11 Panguni.
// Thithi index: 0-14 valarpirai (14 = Pournami), 15-29 theipirai (29 = Amavasai).
export const FESTIVALS = [
  { key: 'puthandu', rule: { month: 0, day: 1 } },
  { key: 'chithraPournami', rule: { month: 0, tithi: 14 } },
  { key: 'vaikasiVisakam', rule: { month: 1, nak: 15 } },
  { key: 'aadiPerukku', rule: { month: 3, day: 18 } },
  { key: 'aadiAmavasai', rule: { month: 3, tithi: 29 } },
  { key: 'krishnaJayanthi', rule: { month: 4, tithi: 22 } },
  { key: 'vinayagarChathurthi', rule: { month: 4, tithi: 3 } },
  { key: 'mahalayaAmavasai', rule: { month: 5, tithi: 29 } },
  { key: 'navaratri', rule: { after: 'mahalayaAmavasai', tithi: 0 } },
  { key: 'saraswathiPuja', rule: { after: 'mahalayaAmavasai', tithi: 8 } },
  { key: 'vijayadasami', rule: { after: 'mahalayaAmavasai', tithi: 9 } },
  { key: 'deepavali', rule: { month: 6, tithi: 28 } },
  { key: 'skandaSashti', rule: { after: 'deepavali', tithi: 5 } },
  { key: 'karthigaiDeepam', rule: { month: 7, nakSet: 2 } },
  { key: 'vaikuntaEkadasi', rule: { month: 8, tithi: 10 } },
  { key: 'arudraDarshanam', rule: { month: 8, nak: 5 } },
  { key: 'bhogi', rule: { before: 'pongal' } },
  { key: 'pongal', rule: { month: 9, day: 1 } },
  { key: 'mattuPongal', rule: { month: 9, day: 2 } },
  { key: 'thaiPoosam', rule: { month: 9, nak: 7 } },
  { key: 'thaiAmavasai', rule: { month: 9, tithi: 29 } },
  { key: 'mahaShivaratri', rule: { month: 10, tithiSet: 28 } },
  { key: 'maasiMagam', rule: { month: 10, nak: 9 } },
  { key: 'panguniUthiram', rule: { month: 11, nak: 11 } },
];

// Monthly observances (every lunar fortnight / month)
export const MONTHLY = [
  { key: 'amavasai', test: (d) => d.tithiRise === 29 },
  { key: 'pournami', test: (d) => d.tithiRise === 14 },
  { key: 'ekadasi', test: (d) => d.tithiRise === 10 || d.tithiRise === 25 },
  { key: 'pradosham', test: (d) => d.tithiSet === 12 || d.tithiSet === 27 }, // thrayodasi at sunset
  { key: 'sashti', test: (d) => d.tithiRise === 5 },
  { key: 'sankatahara', test: (d) => d.tithiSet === 18 }, // theipirai chathurthi in the evening
  { key: 'karthigaiStar', test: (d) => d.nakRise === 2 },
];

function matches(d, r) {
  if (r.month != null && d.month !== r.month) return false;
  if (r.day != null && d.tamilDay !== r.day) return false;
  if (r.tithi != null && d.tithiRise !== r.tithi) return false;
  if (r.tithiSet != null && d.tithiSet !== r.tithiSet) return false;
  if (r.nak != null && d.nakRise !== r.nak) return false;
  if (r.nakSet != null && d.nakSet !== r.nakSet) return false;
  return true;
}

/**
 * Festivals and monthly observances for a calendar year at a place.
 * @returns {{date: string, key: string, kind: 'festival'|'monthly'}[]}
 */
export function tamilCalendar(year, lat, lon, zone) {
  // scan a margin either side so month/day counts and "after" rules work
  const days = scanDays(`${year - 1}-11-15`, `${year}-12-31`, lat, lon, zone).filter((d) => !d.polar);
  const inYear = (d) => d.date.startsWith(`${year}-`);
  const found = {};
  const out = [];
  for (const f of FESTIVALS) {
    const r = f.rule;
    let hit = null;
    if (r.before) {
      const ref = found[r.before];
      if (ref) hit = days[days.indexOf(ref) - 1];
    } else if (r.after) {
      const ref = found[r.after];
      if (ref) hit = days.slice(days.indexOf(ref) + 1, days.indexOf(ref) + 40).find((d) => matches(d, r));
    } else {
      // first matching day in the year; if a thithi is skipped at sunrise, fall back to sunset
      const cands = days.filter((d) => matches(d, r));
      hit = cands.find(inYear) || null;
      if (!hit && r.tithi != null) hit = days.filter((d) => d.month === r.month && d.tithiSet === r.tithi).find(inYear) || null;
    }
    if (hit) {
      found[f.key] = hit;
      if (inYear(hit)) out.push({ date: hit.date, key: f.key, kind: 'festival' });
    }
  }
  for (const m of MONTHLY) {
    let prevHit = false;
    for (const d of days) {
      const ok = m.test(d);
      if (ok && !prevHit && inYear(d)) out.push({ date: d.date, key: m.key, kind: 'monthly' });
      prevHit = ok;
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// ---------------------------------------------------------------- star birthday
/** Days (in a calendar year at a place) when the Moon is in the birth nakshatram at
 *  sunrise during the birth Tamil month: the traditional "natchathira birthday". */
export function starBirthdays(year, birthMonth, birthNak, lat, lon, zone) {
  const days = scanDays(`${year}-01-01`, `${year}-12-31`, lat, lon, zone).filter((d) => !d.polar);
  let hits = days.filter((d) => d.month === birthMonth && d.nakRise === birthNak);
  if (!hits.length) hits = days.filter((d) => d.month === birthMonth && d.nakSet === birthNak); // skipped at sunrise
  // keep the first of consecutive days
  return hits.filter((d, i) => i === 0 || hits[i - 1].date !== DateTime.fromISO(d.date).minus({ days: 1 }).toISODate()).map((d) => d.date);
}

// ---------------------------------------------------------------- thithi (shraddham)
/** The thithi and Tamil month of a past date (at the given time, or the afternoon). */
export function thithiOf(date, lat, lon, zone, hasTime) {
  const iso = DateTime.fromJSDate(date, { zone }).toISODate();
  const d = dayInfo(iso, lat, lon, zone);
  const t = hasTime ? tithiAt(date) : d.tithiAparahna;
  return { tithi: t, month: hasTime ? sunSign(date) : d.month, date: iso };
}

/** Annual dates of a thithi in a Tamil month (judged in the afternoon, as for shraddham). */
export function thithiDates(target, fromYear, years, lat, lon, zone) {
  const res = [];
  for (let y = fromYear; y < fromYear + years; y++) {
    const days = scanDays(`${y}-01-01`, `${y}-12-31`, lat, lon, zone).filter((d) => !d.polar);
    let hit = days.find((d) => d.month === target.month && d.tithiAparahna === target.tithi);
    if (!hit) hit = days.find((d) => d.month === target.month && d.tithiRise === target.tithi);
    if (hit) res.push(hit.date);
  }
  return res;
}

// ---------------------------------------------------------------- iCalendar export
/** All-day events as an .ics file body. */
export function toICS(events, prodName = 'GV Jathagam') {
  const esc = (s) => String(s).replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${prodName}//EN`, 'CALSCALE:GREGORIAN'];
  for (const e of events) {
    const d = e.date.replace(/-/g, '');
    const next = DateTime.fromISO(e.date).plus({ days: 1 }).toISODate().replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:${d}-${e.uid || e.title.replace(/\W+/g, '')}@gv-jathagam`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${next}`, `SUMMARY:${esc(e.title)}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
