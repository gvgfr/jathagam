// Krishnamurti Paddhati (KP): Placidus cusps, KP ayanamsa, star lord and
// sub lord of any longitude, four-level significators, cusp sub-lords.
import { placidusCusps, KP_OFFSET } from './astro.js';
import { DASA_ORDER, DASA_YEARS, NAK_SPAN, SIGN_LORDS } from './constants.js';

const norm = (x) => ((x % 360) + 360) % 360;
export const KP_PLANETS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];

/** Sign lord, star lord and sub lord of a sidereal longitude. */
export function lords(lon) {
  const l = norm(lon);
  const n = Math.floor(l / NAK_SPAN);
  const star = DASA_ORDER[n % 9];
  let pos = l - n * NAK_SPAN;
  let i = DASA_ORDER.indexOf(star);
  let sub = star;
  for (let j = 0; j < 9; j++) {
    const k = DASA_ORDER[(i + j) % 9];
    const span = (NAK_SPAN * DASA_YEARS[k]) / 120;
    if (pos < span || j === 8) {
      sub = k;
      break;
    }
    pos -= span;
  }
  return { sign: SIGN_LORDS[Math.floor(l / 30)], star, sub };
}

/** House (1-12) a longitude falls in, given 12 cusp longitudes. */
export function houseIn(cusps, lon) {
  const l = norm(lon);
  for (let h = 0; h < 12; h++) {
    const a = cusps[h];
    const b = cusps[(h + 1) % 12];
    const span = norm(b - a);
    if (norm(l - a) < span) return h + 1;
  }
  return 1;
}

/**
 * KP view of a chart computed by computeChart() (Lahiri positions are shifted
 * to the KP ayanamsa).
 */
export function kpChart(chart) {
  const { utc, lat, lon } = chart.input;
  const cusps = placidusCusps(utc, lat, lon);
  const pl = {};
  // positions are shifted to the KP ayanamsa unless the chart already uses it
  const shift = chart.input.options?.ayanamsa === 'kp' ? 0 : KP_OFFSET;
  for (const p of chart.planets) {
    const l = norm(p.lon + shift);
    pl[p.key] = { lon: l, house: houseIn(cusps, l), ...lords(l) };
  }
  const owner = (h) => SIGN_LORDS[Math.floor(cusps[h - 1] / 30)];
  const occupants = (h) => KP_PLANETS.filter((k) => pl[k].house === h);
  const inStarOf = (planets) => KP_PLANETS.filter((k) => planets.includes(pl[k].star));

  // Four-level significators of each house (KP standard):
  // 1 planets in the star of occupants, 2 occupants,
  // 3 planets in the star of the owner, 4 the owner.
  const sigOfHouse = {};
  for (let h = 1; h <= 12; h++) {
    const occ = occupants(h);
    const own = owner(h);
    sigOfHouse[h] = new Set([...inStarOf(occ), ...occ, ...inStarOf([own]), own]);
  }
  // Rahu/Ketu also signify what their sign lord and star lord signify (agents)
  const housesOf = (k) => {
    const s = new Set();
    for (let h = 1; h <= 12; h++) if (sigOfHouse[h].has(k)) s.add(h);
    return s;
  };
  const planetSig = {};
  for (const k of KP_PLANETS) planetSig[k] = housesOf(k);
  for (const k of ['rahu', 'ketu']) {
    for (const via of [pl[k].sign, pl[k].star]) for (const h of housesOf(via)) planetSig[k].add(h);
  }
  const csl = cusps.map((c) => lords(c).sub); // cusp sub-lords, index 0 = 1st house
  return { cusps, planets: pl, owner, occupants, sigOfHouse, planetSig, csl };
}

// KP event houses, and the house whose cusp sub-lord must "promise" the event.
export const KP_EVENTS = {
  marriage: { houses: [2, 7, 11], csl: 7 },
  childbirth: { houses: [2, 5, 11], csl: 5 },
  promotion: { houses: [2, 6, 10, 11], csl: 10 },
  jobChange: { houses: [3, 5, 9, 10], csl: 10 },
  business: { houses: [7, 10, 11], csl: 10 },
  property: { houses: [4, 11, 12], csl: 4 },
  homeMove: { houses: [3, 4, 12], csl: 4 },
  travel: { houses: [3, 9, 12], csl: 12 },
  studies: { houses: [4, 9, 11], csl: 4 },
  healthCare: { houses: [1, 6, 8, 12], csl: 6 },
  safety: { houses: [6, 8, 12], csl: 8, malefic: true },
  setback: { houses: [6, 8, 12], csl: 11 },
  incomeRise: { houses: [2, 6, 11], csl: 11 },
};

/** Does the chart promise this kind of event at all? (cusp sub-lord signifies any of its houses) */
export function kpPromise(K, key) {
  const e = KP_EVENTS[key];
  if (!e) return false;
  const lord = K.csl[e.csl - 1];
  return e.houses.some((h) => K.planetSig[lord].has(h));
}

/**
 * KP timing: the event is promised, the bhukti lord signifies at least one of
 * its houses, and the antaram lord at least half of them. Accidents also need
 * a malefic (Mars, Saturn, Raagu, Kethu) as bhukti or antaram lord.
 */
// Parents' serious illness: houses 6th/8th/12th from the 9th (father) or 4th (mother)
const PARENT_VARIANTS = [{ houses: [2, 4, 8], csl: 9 }, { houses: [3, 9, 11], csl: 4 }];

export function kpFires(K, key, bl, al) {
  if (key === 'parents') return PARENT_VARIANTS.some((e) => firesFor(K, e, bl, al));
  const e = KP_EVENTS[key];
  return !!e && firesFor(K, e, bl, al);
}

function firesFor(K, e, bl, al) {
  const lord = K.csl[e.csl - 1];
  if (!e.houses.some((h) => K.planetSig[lord].has(h))) return false;
  const sb = K.planetSig[bl];
  const sa = K.planetSig[al];
  if (!e.houses.some((h) => sb.has(h))) return false;
  if (e.houses.filter((h) => sa.has(h)).length < Math.ceil(e.houses.length / 2)) return false;
  if (e.malefic && ![bl, al].some((k) => ['mars', 'saturn', 'rahu', 'ketu'].includes(k))) return false;
  return true;
}
