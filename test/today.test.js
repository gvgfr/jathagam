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
