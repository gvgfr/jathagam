import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { dailyPanchangam, karanamOf, RAAGU_PART, YAMA_PART, KULIGAI_PART } from '../src/engine/today.js';

const Z = 'Asia/Kolkata';
const hm = (d) => DateTime.fromJSDate(d, { zone: Z }).toFormat('HH:mm');

describe('daily panchangam (Chennai, Saturday 21 Nov 2026)', () => {
  const p = dailyPanchangam('2026-11-21', 13.0827, 80.2707, Z);
  it('weekday and sunrise/sunset', () => {
    expect(p.weekday).toBe(6);
    expect(hm(p.sunrise) >= '06:05' && hm(p.sunrise) <= '06:15').toBe(true);
    expect(hm(p.sunset) >= '17:35' && hm(p.sunset) <= '17:45').toBe(true);
  });
  it('Saturday raagu kaalam is the 3rd eighth of daytime (about 9:00–10:30)', () => {
    expect(hm(p.raaguKaalam.start) >= '08:55' && hm(p.raaguKaalam.start) <= '09:10').toBe(true);
    expect(hm(p.yamagandam.start) >= '13:15' && hm(p.yamagandam.start) <= '13:35').toBe(true);
    expect(hm(p.kuligai.start)).toBe(hm(p.sunrise));
  });
  it('Tamil month Karthigai', () => {
    expect(p.tamilMonth).toBe(7);
    expect(p.tamilDay).toBeGreaterThanOrEqual(4);
    expect(p.tamilDay).toBeLessThanOrEqual(6);
  });
  it('angams have end times in order', () => {
    for (const k of ['thithi', 'nakshatra', 'yogam', 'karanam']) {
      expect(p[k].length).toBeGreaterThan(0);
      p[k].forEach((x, i) => i && expect(x.end > p[k][i - 1].end).toBe(true));
    }
  });
});

describe('period tables', () => {
  it('each weekday uses a different eighth for the three periods', () => {
    for (let d = 0; d < 7; d++) expect(new Set([RAAGU_PART[d], YAMA_PART[d], KULIGAI_PART[d]]).size).toBe(3);
  });
  it('karanam mapping', () => {
    expect(karanamOf(0)).toBe(10);
    expect(karanamOf(1)).toBe(0);
    expect(karanamOf(8)).toBe(0);
    expect(karanamOf(57)).toBe(7);
    expect(karanamOf(59)).toBe(9);
  });
});

describe('today for you (chandrashtamam, tara balam, Moon from rasi)', async () => {
  const { personalDay, nextChandrashtamam, taraOf, houseFrom, rasisOfStar } = await import('../src/engine/personalDay.js');
  const { siderealLongitude } = await import('../src/engine/astro.js');
  const { dailyPanchangam } = await import('../src/engine/today.js');
  it('tara: counting from the birth star, in nines', () => {
    expect(taraOf(5, 5)).toMatchObject({ count: 1, tara: 'janma' });
    expect(taraOf(5, 6)).toMatchObject({ count: 2, tara: 'sampat', kind: 'good' });
    expect(taraOf(5, 7)).toMatchObject({ count: 3, tara: 'vipat', kind: 'weak' });
    expect(taraOf(5, 14)).toMatchObject({ count: 10, tara: 'janma' });
    expect(taraOf(20, 3)).toMatchObject({ count: 11, tara: 'sampat' }); // wraps past Revathi
    expect(taraOf(0, 26)).toMatchObject({ count: 27, tara: 'paramaMitra' });
  });
  it('houses from the rasi, and the rasis a star spans', () => {
    expect(houseFrom(8, 3)).toBe(8); // Dhanusu -> Kadagam is the 8th
    expect(houseFrom(0, 0)).toBe(1);
    expect(houseFrom(11, 0)).toBe(2);
    expect(rasisOfStar(0)).toEqual([0]);
    expect(rasisOfStar(2)).toEqual([0, 1]); // Karthigai spans Mesham and Rishabam
    expect(rasisOfStar(26)).toEqual([11]);
  });
  it('chandrashtamam periods: the Moon really is in the 8th rasi, ~2–2.7 days, about a month apart', () => {
    const rasi = 8;
    const cs = nextChandrashtamam(rasi, new Date('2026-11-24T00:00:00Z'), 3);
    for (const c of cs) {
      const mid = new Date((c.start.getTime() + c.end.getTime()) / 2);
      expect(Math.floor(siderealLongitude('moon', mid) / 30)).toBe((rasi + 7) % 12);
      expect(Math.floor(siderealLongitude('moon', new Date(c.start.getTime() - 5 * 60000)) / 30)).not.toBe((rasi + 7) % 12);
      const days = (c.end - c.start) / 86400000;
      expect(days).toBeGreaterThan(1.9);
      expect(days).toBeLessThan(2.8);
    }
    const gap = (cs[1].start - cs[0].start) / 86400000;
    expect(gap).toBeGreaterThan(26);
    expect(gap).toBeLessThan(29);
  });
  it('a personal day lists Moon segments and taras covering sunrise to sunrise', () => {
    const p = dailyPanchangam('2026-11-24', 13.08, 80.27, 'Asia/Kolkata');
    const d = personalDay({ rasi: 8, nakshatra: 20 }, p.sunrise, p.nextSunrise, p.nakshatra);
    expect(d.moon[0].start <= p.sunrise).toBe(true);
    expect(d.moon.at(-1).end >= p.nextSunrise).toBe(true);
    expect(d.taras.length).toBe(p.nakshatra.length);
    for (const c of d.nextChandrashtamam) expect(c.start >= p.nextSunrise).toBe(true);
  });
});

describe('daily reading', async () => {
  const { dailyReading, DAY_LINES } = await import('../src/engine/personalDay.js');
  const { dailyPanchangam } = await import('../src/engine/today.js');
  const { gocharam } = await import('../src/engine/transit.js');
  const { TODAY_TEXT } = await import('../src/i18n.js');
  it('every line key has English and Tamil text', () => {
    for (const ls of Object.values(DAY_LINES)) for (const l of ls) for (const L of ['en', 'ta']) expect(TODAY_TEXT[L].line[l.key], `${L} ${l.key}`).toBeTruthy();
  });
  it('gives chandrashtamam as the verdict when the Moon is in the 8th from the rasi', () => {
    const p = dailyPanchangam('2026-11-28', 13.08, 80.27, 'Asia/Kolkata');
    const r = dailyReading({ rasi: 8, nakshatra: 18 }, p, gocharam(8, p.sunrise));
    expect(r.verdict).toBe('chandrashtamam');
    expect(r.chand).toBeTruthy();
  });
  it('different rasis on the same day get different readings', () => {
    const p = dailyPanchangam('2026-11-24', 13.08, 80.27, 'Asia/Kolkata');
    const keys = new Set([...Array(12).keys()].map((rasi) => dailyReading({ rasi, nakshatra: rasi * 2 }, p, gocharam(rasi, p.sunrise)).moonMain.house));
    expect(keys.size).toBe(12);
  });
});

describe('daily reading changes day to day', async () => {
  const { dailyReading } = await import('../src/engine/personalDay.js');
  const { dailyPanchangam } = await import('../src/engine/today.js');
  const { gocharam } = await import('../src/engine/transit.js');
  const { TODAY_TEXT } = await import('../src/i18n.js');
  it('the day-specific lines differ on every one of 10 consecutive days, with text in both languages', () => {
    const birth = { rasi: 8, nakshatra: 18 };
    const sigs = [];
    for (let d = 20; d < 30; d++) {
      const p = dailyPanchangam(`2026-11-${d}`, 33.95, -84.55, 'America/New_York');
      const r = dailyReading(birth, p, gocharam(8, p.sunrise));
      for (const L of ['en', 'ta']) expect(TODAY_TEXT[L].tara[r.taraLine.key]).toBeTruthy();
      sigs.push(`${r.verdict}|${r.taraLine.key}|${r.look.map((x) => x.key)}|${r.care.map((x) => x.key)}`);
    }
    for (let i = 1; i < sigs.length; i++) expect(sigs[i], `day ${20 + i}`).not.toBe(sigs[i - 1]);
  });
});
