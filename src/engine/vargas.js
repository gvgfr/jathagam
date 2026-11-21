// Divisional charts. Only the navamsam (D9) is used today; the table keeps the
// door open for others.
import { norm360 } from './astro.js';

/** Navamsam sign (0-11) of a sidereal longitude. Each 3°20' maps to one sign,
 *  counting continuously from Mesham, so fire signs start at Mesham, earth
 *  signs at Magaram, air at Thulam and water at Kadagam. */
export function navamsaSign(lon) {
  return Math.floor(norm360(lon) / (30 / 9)) % 12;
}

/** Dasamsam (D10, career): 3° parts; odd signs count from the sign, even signs from the 9th. */
export function dasamsaSign(lon) {
  const l = norm360(lon);
  const sign = Math.floor(l / 30);
  const part = Math.floor((l % 30) / 3);
  const start = sign % 2 === 0 ? sign : sign + 8; // index 0 (Mesham) is an odd sign
  return (start + part) % 12;
}

/** Saptamsam (D7, children): 30/7° parts; odd signs from the sign, even signs from the 7th. */
export function saptamsaSign(lon) {
  const l = norm360(lon);
  const sign = Math.floor(l / 30);
  const part = Math.min(6, Math.floor((l % 30) / (30 / 7)));
  const start = sign % 2 === 0 ? sign : sign + 6;
  return (start + part) % 12;
}

export const VARGAS = { D1: (lon) => Math.floor(norm360(lon) / 30), D7: saptamsaSign, D9: navamsaSign, D10: dasamsaSign };
