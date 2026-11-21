// Doshams as commonly checked in Tamil practice. The rules vary a great deal
// between astrologers and almanacs; these are the widely printed versions.
// They are reported with the rule that triggered them and any traditional
// exception (nivarthi) that cancels them — never as a prediction.

const houseOf = (sign, from) => ((sign - from + 12) % 12) + 1;
const norm = (x) => ((x % 360) + 360) % 360;

export const SEVVAI_HOUSES = [2, 4, 7, 8, 12];
// Exception: Mars in these houses is said to give no dosham when in these signs
const SEVVAI_HOUSE_SIGN_EXCEPTION = { 2: [2, 5], 4: [0, 7], 7: [3, 9], 8: [8, 11], 12: [1, 6] };

/**
 * Sevvai (Chevvai / Mars) dosham: Mars in the 2nd, 4th, 7th, 8th or 12th
 * house counted from lagnam, from the Moon (rasi) and from Venus.
 */
export function sevvaiDosham(chart) {
  const by = Object.fromEntries(chart.planets.map((p) => [p.key, p]));
  const mars = by.mars;
  const refs = [
    { from: 'lagnam', sign: chart.lagnam.sign },
    { from: 'moon', sign: by.moon.sign },
    { from: 'venus', sign: by.venus.sign },
  ].map((r) => {
    const house = houseOf(mars.sign, r.sign);
    return { ...r, house, inHouse: SEVVAI_HOUSES.includes(house) };
  });

  // Traditional exceptions that cancel the dosham for the whole chart
  const exceptions = [];
  if (mars.sign === 0 || mars.sign === 7) exceptions.push('marsOwnSign');
  if (mars.sign === 9) exceptions.push('marsExalted');
  if (by.jupiter.sign === mars.sign) exceptions.push('withJupiter');
  if (by.moon.sign === mars.sign) exceptions.push('withMoon');
  const hl = refs[0].house;
  if (refs[0].inHouse && SEVVAI_HOUSE_SIGN_EXCEPTION[hl].includes(mars.sign)) exceptions.push('houseSign');

  const hits = refs.filter((r) => r.inHouse && r.from !== 'venus');
  const triggered = hits.length > 0;
  // Strength, as commonly judged: how many reference points show it, and
  // whether Mars is in the 7th or 8th (considered stronger than 2nd/4th/12th).
  const strongHouse = hits.some((r) => r.house === 7 || r.house === 8);
  const venusToo = refs[2].inHouse;
  let level = null;
  if (triggered) {
    const n = hits.length + (venusToo ? 1 : 0);
    level = n >= 3 || (hits.length === 2 && strongHouse) ? 'strong' : n === 2 || strongHouse ? 'moderate' : 'mild';
  }
  return {
    level,
    key: 'sevvai',
    triggered,
    cancelled: triggered && exceptions.length > 0,
    present: triggered && exceptions.length === 0,
    refs,
    exceptions,
    marsSign: mars.sign,
  };
}

/** Raagu–Kethu dosham: Raagu or Kethu in the 1st, 2nd, 7th or 8th house from lagnam or the Moon. */
export function raaguKethuDosham(chart) {
  const by = Object.fromEntries(chart.planets.map((p) => [p.key, p]));
  const hits = [];
  for (const node of ['rahu', 'ketu']) {
    for (const [from, sign] of [['lagnam', chart.lagnam.sign], ['moon', by.moon.sign]]) {
      const house = houseOf(by[node].sign, sign);
      if ([1, 2, 7, 8].includes(house)) hits.push({ node, from, house });
    }
  }
  const strongHouse = hits.some((h) => h.house === 7 || h.house === 8);
  const level = !hits.length ? null : hits.length >= 3 || (hits.length >= 2 && strongHouse) ? 'strong' : hits.length === 2 || strongHouse ? 'moderate' : 'mild';
  return { key: 'raaguKethu', triggered: hits.length > 0, cancelled: false, present: hits.length > 0, hits, level };
}

/** Kala sarpa dosham: all seven planets lie on one side of the Raagu–Kethu axis. */
export function kalaSarpaDosham(chart) {
  const by = Object.fromEntries(chart.planets.map((p) => [p.key, p]));
  const rahu = by.rahu.lon;
  const seven = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
  const side = seven.map((k) => norm(by[k].lon - rahu) < 180);
  const allA = side.every(Boolean);
  const allB = side.every((x) => !x);
  const outside = seven.filter((k, i) => side[i] !== (side.filter(Boolean).length >= 4));
  return {
    key: 'kalaSarpa',
    triggered: allA || allB,
    cancelled: false,
    present: allA || allB,
    // allA: planets run from Raagu towards Kethu (kala sarpa); allB: from Kethu to Raagu (often called kala amirtha)
    variant: allA ? 'sarpa' : allB ? 'amirtha' : null,
    level: allA || allB ? 'moderate' : null,
    outside,
  };
}

export function doshams(chart) {
  return [sevvaiDosham(chart), raaguKethuDosham(chart), kalaSarpaDosham(chart)];
}
