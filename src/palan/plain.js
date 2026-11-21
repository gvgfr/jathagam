// Plain-language palan: what to expect, when, and what to do.
// Built from the same traditional rules as the technical readings: each
// planet gets a simple strength score (natural nature + dignity + house), and
// each period/area is described by the life areas it touches and that tone.
import { SIGN_LORDS } from '../engine/constants.js';
import { activePeriod } from '../engine/dasa.js';
import { NAMES } from '../i18n.js';
import { SIGN_TRAITS, NAK_TRAITS, EXALTATION } from './texts.js';
import { AREA, HOUSE_PLAIN, HOW, CAREER_FIELDS, MARRIAGE_BY, INCOME_BY, TRANSIT_PLAIN, TONE, STUDIES } from './plainTexts.js';

const GOOD_HOUSES = [1, 4, 5, 7, 9, 10];
const DUSTHANA = [6, 8, 12];
const UPACHAYA = [3, 6, 10, 11];
const NATURAL_BENEFIC = ['jupiter', 'venus', 'mercury', 'moon'];

function dignity(key, sign) {
  if (!(key in EXALTATION)) return null;
  if (EXALTATION[key] === sign) return 'exalted';
  if ((EXALTATION[key] + 6) % 12 === sign) return 'debilitated';
  if (SIGN_LORDS[sign] === key) return 'own';
  return null;
}

/** Simple strength score for a planet in this chart (higher = more supportive). */
export function strength(A, key) {
  const h = A.house(key);
  let s = NATURAL_BENEFIC.includes(key) ? 1 : -0.5;
  const d = dignity(key, A.by[key].sign);
  if (d === 'exalted') s += 1.5;
  if (d === 'own') s += 1;
  if (d === 'debilitated') s -= 1.5;
  const malefic = !NATURAL_BENEFIC.includes(key);
  if (GOOD_HOUSES.includes(h)) s += 1;
  if ([2, 11].includes(h)) s += 0.5;
  if (malefic && UPACHAYA.includes(h)) s += 1;
  else if (DUSTHANA.includes(h)) s -= 1;
  if (!['rahu', 'ketu'].includes(key)) {
    const owns = A.owns(key);
    const goodOwn = owns.some((x) => [1, 4, 5, 7, 9, 10].includes(x));
    if (!goodOwn && owns.some((x) => DUSTHANA.includes(x))) s -= 0.5;
  }
  if (A.yogas.some((y) => y.key === 'neechaBhanga' && y.planets.includes(key))) s += 1.5;
  if (A.yogas.some((y) => y.key === 'yogakaraka' && y.planets.includes(key))) s += 1;
  return s;
}
const toneOf = (s) => (s >= 1 ? 'good' : s <= -0.5 ? 'hard' : 'mixed');
const planTone = (t) => (t === 'mixed' ? 'good' : t); // mixed periods still get the hopeful text, plus a caution

/** Houses a period lord "acts through": where it sits first, then what it owns. */
function housesOf(A, key) {
  if (key === 'rahu' || key === 'ketu') return [A.house(key)];
  return [...new Set([A.house(key), ...A.owns(key)])];
}

const T = {
  en: {
    sec: { brief: 'Your reading in brief', now: 'Right now', ahead: 'The next few years', areas: 'Your life areas', transits: 'Planets moving now', nature: 'Your nature' },
    expect: 'What to expect',
    todo: 'What you can do',
    until: (d) => `until ${d}`,
    youAre: (lag, moon) => `By nature you are ${lag}, with a mind that is ${moon}.`,
    focus: (a) => `Your life tends to revolve around ${a}.`,
    nowBrief: (tone, until, areas) => `Right now (${until}) is a ${tone.toLowerCase().replace(/^\S+ /, '')} period, mainly about ${areas}.`,
    bestAreas: (a) => `Your strongest areas: ${a}.`,
    patience: (a) => `Areas that need more patience: ${a}.`,
    nextTurn: (d, tone, areas) => `Next change: from ${d}, a ${tone.toLowerCase().replace(/^\S+ /, '')} period for ${areas}.`,
    bigPicture: (lord, until, areas, how) => `Big picture (${until}): your ${lord} period puts the spotlight on ${areas}. Results tend to come ${how}.`,
    mixedNote: 'Results are mixed: good moves work, but expect some effort and delays.',
    period: (dates, lord) => `${dates} · ${lord} period`,
    areasFor: (a) => `Focus: ${a}.`,
    goodTimes: (list) => `Good times: ${list}.`,
    noGoodTimes: 'No especially strong periods in the next few years; steady effort works best.',
    career: 'Career',
    careerFields: (f) => `Work that suits you traditionally: ${f}.`,
    money: 'Money',
    incomeFrom: (f) => `Income tends to come from ${f}.`,
    marriage: 'Marriage and relationships',
    marriageBy: (f) => `Tradition says: ${f}.`,
    home: 'Home and family',
    children: 'Children',
    studies: 'Studies and learning',
    areaTone: { good: 'Looks supportive in your chart.', mixed: 'Mixed: good results with steady effort.', hard: 'Needs more patience and care in your chart.' },
    saturn: 'Saturn (Sani)',
    jupiter: 'Jupiter (Guru)',
    raagu: 'Raagu',
    sadeNext: (d) => `Saturn’s 7½-year phase (Ezharai Sani) is not running now; the next one starts around ${d}.`,
  },
  ta: {
    sec: { brief: 'சுருக்கமாக உங்கள் பலன்', now: 'இப்போது', ahead: 'அடுத்த சில ஆண்டுகள்', areas: 'வாழ்க்கைப் பகுதிகள்', transits: 'இப்போது நகரும் கிரகங்கள்', nature: 'உங்கள் இயல்பு' },
    expect: 'என்ன எதிர்பார்க்கலாம்',
    todo: 'நீங்கள் செய்யக்கூடியவை',
    until: (d) => `${d} வரை`,
    youAre: (lag, moon) => `இயல்பில் நீங்கள்: ${lag}. மனம்: ${moon}.`,
    focus: (a) => `உங்கள் வாழ்க்கை பெரும்பாலும் ${a} சுற்றியே அமையும்.`,
    nowBrief: (tone, until, areas) => `இப்போது (${until}) ${tone.replace(/^\S+ /, '')} காலம்; முக்கியமாக ${areas}.`,
    bestAreas: (a) => `உங்கள் பலமான பகுதிகள்: ${a}.`,
    patience: (a) => `அதிக பொறுமை தேவைப்படும் பகுதிகள்: ${a}.`,
    nextTurn: (d, tone, areas) => `அடுத்த மாற்றம்: ${d} முதல், ${areas} — ${tone.replace(/^\S+ /, '')} காலம்.`,
    bigPicture: (lord, until, areas, how) => `பெரிய படம் (${until}): ${lord} தசை ${areas} மீது கவனம் செலுத்துகிறது. பலன்கள் ${how} வரும்.`,
    mixedNote: 'கலவையான பலன்: நல்ல முயற்சிகள் வெற்றி தரும்; சிறிது உழைப்பும் தாமதமும் இருக்கும்.',
    period: (dates, lord) => `${dates} · ${lord} காலகட்டம்`,
    areasFor: (a) => `கவனம்: ${a}.`,
    goodTimes: (list) => `நல்ல காலங்கள்: ${list}.`,
    noGoodTimes: 'அடுத்த சில ஆண்டுகளில் சிறப்பான காலம் இல்லை; நிலையான முயற்சியே நல்லது.',
    career: 'தொழில்',
    careerFields: (f) => `பாரம்பரியமாக உங்களுக்குப் பொருந்தும் பணிகள்: ${f}.`,
    money: 'பணம்',
    incomeFrom: (f) => `வருமானம் பெரும்பாலும் வரும் வழி: ${f}.`,
    marriage: 'திருமணம், உறவுகள்',
    marriageBy: (f) => `பாரம்பரியம் சொல்வது: ${f}.`,
    home: 'வீடு, குடும்பம்',
    children: 'குழந்தைகள்',
    studies: 'கல்வி',
    areaTone: { good: 'உங்கள் ஜாதகத்தில் சாதகமாக உள்ளது.', mixed: 'கலவை: நிலையான முயற்சியால் நல்ல பலன்.', hard: 'உங்கள் ஜாதகத்தில் அதிக பொறுமையும் கவனமும் தேவை.' },
    saturn: 'சனி',
    jupiter: 'குரு',
    raagu: 'ராகு',
    sadeNext: (d) => `ஏழரைச் சனி இப்போது இல்லை; அடுத்தது சுமார் ${d} அன்று தொடங்கும்.`,
  },
};

/**
 * @returns {{key:string,title:string,items:(string|{h?:string,tone?:string,p?:string[],tips?:string[]})[]}[]}
 */
export function plainPalan(chart, A, go, lang, fmtRange, fmtDate, now) {
  const t = T[lang];
  const g = (k) => NAMES.graha[lang][k];
  const area = (h) => AREA[h][lang];
  const listAreas = (hs) => hs.slice(0, 3).map(area).join('; ');
  const s = chart.summary;
  const lag = A.lag;

  // ---- periods (all bhuktis from now on)
  const all = chart.dasa.periods.flatMap((p) => p.bhuktis.map((b) => ({ ...b, dasaLord: p.lord })));
  const bi = all.findIndex((b) => b.start <= now && now < b.end);
  const periodTone = (b) => toneOf(0.4 * strength(A, b.dasaLord) + 0.6 * strength(A, b.lord));
  const act = activePeriod(chart.dasa, now);

  // ---- areas scores (for brief + area cards)
  const areaScore = (h) => {
    let sc = strength(A, A.lordOf(h));
    if (A.aspectsOn(h).includes('jupiter') || A.occupants(h).includes('jupiter')) sc += 0.75;
    if (A.occupants(h).includes('venus') && h !== 6) sc += 0.25;
    for (const m of ['saturn', 'mars', 'rahu', 'ketu']) if (A.occupants(h).includes(m) && !UPACHAYA.includes(h)) sc -= 0.5;
    return sc;
  };
  const timesFor = (lords, minAge, maxAge, limit = 2) => {
    const birth = chart.input.utc;
    const age = (d) => (d - birth) / (365.25 * 86400000);
    return all
      .slice(Math.max(bi, 0))
      .filter((b) => lords.includes(b.lord) && periodTone(b) !== 'hard' && age(b.start) <= maxAge && age(b.end) >= minAge)
      .slice(0, limit)
      .map((b) => fmtRange(b.start, b.end));
  };

  const sections = [];

  // ---- brief
  const brief = [];
  brief.push(t.youAre(SIGN_TRAITS[lag][lang], SIGN_TRAITS[s.rasi][lang]));
  brief.push(t.focus(area(A.house(A.lordOf(1)))));
  if (bi >= 0) {
    const cur = all[bi];
    brief.push(t.nowBrief(TONE[periodTone(cur)][lang], t.until(fmtDate(cur.end)), listAreas(housesOf(A, cur.lord))));
  }
  const ranked = [1, 2, 4, 5, 7, 9, 10, 11].map((h) => [h, areaScore(h)]).sort((a, b) => b[1] - a[1]);
  brief.push(t.bestAreas(ranked.slice(0, 2).map(([h]) => area(h)).join('; ')));
  const weak = ranked.filter(([, sc]) => sc < 0).slice(-2);
  if (weak.length) brief.push(t.patience(weak.map(([h]) => area(h)).join('; ')));
  if (bi >= 0 && all[bi + 1]) {
    const nx = all[bi + 1];
    brief.push(t.nextTurn(fmtDate(nx.start), TONE[periodTone(nx)][lang], listAreas(housesOf(A, nx.lord))));
  }
  sections.push({ key: 'brief', title: t.sec.brief, items: brief });

  // ---- right now
  const nowItems = [];
  if (act) {
    const L = act.dasa.lord;
    nowItems.push({ p: [t.bigPicture(g(L), fmtRange(act.dasa.start, act.dasa.end), listAreas(housesOf(A, L)), HOW[L][lang])] });
  }
  if (bi >= 0) {
    const cur = all[bi];
    const tone = periodTone(cur);
    const hs = housesOf(A, cur.lord).slice(0, 2);
    const pt = planTone(tone);
    const expect = hs.map((h) => HOUSE_PLAIN[h][pt][lang][0]);
    if (tone === 'mixed') expect.push(t.mixedNote);
    const tips = hs.map((h) => HOUSE_PLAIN[h][pt][lang][1]);
    nowItems.push({ h: `${t.period(fmtRange(cur.start, cur.end), `${g(cur.dasaLord)}–${g(cur.lord)}`)}`, tone, p: expect, tips });
  }
  sections.push({ key: 'now', title: t.sec.now, items: nowItems });

  // ---- next few years
  if (bi >= 0) {
    const ahead = all.slice(bi + 1, bi + 6).map((b) => {
      const tone = periodTone(b);
      const hs = housesOf(A, b.lord).slice(0, 2);
      const pt = planTone(tone);
      return {
        h: t.period(fmtRange(b.start, b.end), `${g(b.dasaLord)}–${g(b.lord)}`),
        tone,
        p: [t.areasFor(listAreas(hs)), HOUSE_PLAIN[hs[0]][pt][lang][0]],
        tips: [HOUSE_PLAIN[hs[0]][pt][lang][1]],
      };
    });
    sections.push({ key: 'ahead', title: t.sec.ahead, items: ahead });
  }

  // ---- life areas
  const ageNow = (now - chart.input.utc) / (365.25 * 86400000);
  const areaCard = (title, h, extra, lords, texts = HOUSE_PLAIN[h], [minAge, maxAge] = [0, 120]) => {
    const tone = toneOf(areaScore(h));
    const pt = planTone(tone);
    const p = [t.areaTone[tone], ...extra, texts[pt][lang][0]];
    const times = timesFor(lords, minAge, maxAge);
    // dates only where they are relevant to the person's age
    if (times.length) p.push(t.goodTimes(times.join('; ')));
    else if (ageNow <= maxAge) p.push(t.noGoodTimes);
    return { h: title, tone, p, tips: [texts[pt][lang][1]] };
  };
  const l10 = A.lordOf(10);
  const l7 = A.lordOf(7);
  const l11 = A.lordOf(11);
  const areas = [
    areaCard(t.career, 10, [t.careerFields(CAREER_FIELDS[A.house(l10)][lang])], [l10, ...A.occupants(10), 'sun', 'saturn'], HOUSE_PLAIN[10], [16, 70]),
    areaCard(t.money, 11, [t.incomeFrom(INCOME_BY[A.house(l11)][lang])], [l11, A.lordOf(2), 'jupiter']),
    areaCard(t.marriage, 7, [t.marriageBy(MARRIAGE_BY[A.house(l7)][lang])], [l7, 'venus', ...A.occupants(7)], HOUSE_PLAIN[7], [20, 45]),
    areaCard(t.home, 4, [], [A.lordOf(4), 'moon']),
    areaCard(t.children, 5, [], [A.lordOf(5), 'jupiter'], HOUSE_PLAIN[5], [21, 45]),
    areaCard(t.studies, 5, [], [A.lordOf(5), 'mercury', A.lordOf(4)], STUDIES, [4, 35]),
  ];
  sections.push({ key: 'areas', title: t.sec.areas, items: areas });

  // ---- transits
  const tr = [];
  const sat = go.saturn;
  let satKey;
  if (go.sadeSati.active) satKey = `sade${go.sadeSati.phase}`;
  else if (sat.house === 4) satKey = 'sat4';
  else if (sat.house === 8) satKey = 'sat8';
  else satKey = [3, 6, 11].includes(sat.house) ? 'satGood' : 'satMixed';
  const satTone = satKey === 'satGood' ? 'good' : satKey === 'satMixed' || satKey === 'sade3' ? 'mixed' : 'hard';
  const satUntil = go.sadeSati.active ? go.sadeSati.end : sat.until;
  tr.push({ h: `${t.saturn} · ${t.until(fmtDate(satUntil))}`, tone: satTone, p: [TRANSIT_PLAIN[satKey][lang][0]], tips: [TRANSIT_PLAIN[satKey][lang][1]] });
  if (!go.sadeSati.active && go.sadeSati.nextStart) tr.push(t.sadeNext(fmtDate(go.sadeSati.nextStart)));
  const jg = [2, 5, 7, 9, 11].includes(go.jupiter.house);
  tr.push({ h: `${t.jupiter} · ${t.until(fmtDate(go.jupiter.until))}`, tone: jg ? 'good' : 'mixed', p: [TRANSIT_PLAIN[jg ? 'jupGood' : 'jupWeak'][lang][0]], tips: [TRANSIT_PLAIN[jg ? 'jupGood' : 'jupWeak'][lang][1]] });
  const rg = [3, 6, 11].includes(go.rahu.house);
  tr.push({ h: `${t.raagu} · ${t.until(fmtDate(go.rahu.until))}`, tone: rg ? 'good' : 'mixed', p: [TRANSIT_PLAIN[rg ? 'rahuGood' : 'rahuWeak'][lang][0]], tips: [TRANSIT_PLAIN[rg ? 'rahuGood' : 'rahuWeak'][lang][1]] });
  sections.push({ key: 'transits', title: t.sec.transits, items: tr });

  // ---- nature
  sections.push({
    key: 'nature',
    title: t.sec.nature,
    items: [
      `${NAMES.rasi[lang][lag]} ${lang === 'en' ? 'lagnam' : 'லக்னம்'}: ${SIGN_TRAITS[lag][lang]}.`,
      `${NAMES.rasi[lang][s.rasi]} ${lang === 'en' ? 'rasi (mind)' : 'ராசி (மனம்)'}: ${SIGN_TRAITS[s.rasi][lang]}.`,
      `${NAMES.nakshatra[lang][s.nakshatra]} ${lang === 'en' ? 'nakshatram' : 'நட்சத்திரம்'}: ${NAK_TRAITS[s.nakshatra][lang]}.`,
    ],
  });
  return sections;
}
