// Plain-language palan: what to expect, when, and what to do.
// Built from the same traditional rules as the technical readings: each
// planet gets a simple strength score (natural nature + dignity + house), and
// each period/area is described by the life areas it touches and that tone.
import { SIGN_LORDS } from '../engine/constants.js';
import { activePeriod } from '../engine/dasa.js';
import { NAMES } from '../i18n.js';
import { SIGN_TRAITS, NAK_TRAITS, EXALTATION } from './texts.js';
import { AREA, HOW, CAREER_FIELDS, MARRIAGE_BY, INCOME_BY, TRANSIT_PLAIN, FOCUS, FOCUS_NAME, FOCUS_HOUSES, HOUSE_TO_FOCUS, FOCUS_CHART, FOCUS_PERIOD, TONE_WORDS, HOUSE_FLAVOR } from './plainTexts.js';

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
    nowBrief2: (tone, until, areas) => `Right now (${until}): ${tone.toLowerCase()} The focus is on ${areas}.`,
    nextTurn2: (d, tone, areas) => `Next change from ${d}: ${tone.toLowerCase()} Focus: ${areas}.`,
    bigPictureH: (r) => `Big picture · ${r}`,
    bigPicture2: (lord, areas, how) => `This long ${lord} period mainly shapes ${areas}. Results tend to come ${how}.`,
    thisPeriod: (r) => `This period · ${r}`,
    otherAreas: 'Your other areas right now',
    careTimes: (list) => `Times to take more care: ${list}.`,
    healthNote: 'This is general wellbeing guidance from tradition, not medical advice.',
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
    nowBrief2: (tone, until, areas) => `இப்போது (${until}): ${tone} கவனம்: ${areas}.`,
    nextTurn2: (d, tone, areas) => `அடுத்த மாற்றம் ${d} முதல்: ${tone} கவனம்: ${areas}.`,
    bigPictureH: (r) => `பெரிய படம் · ${r}`,
    bigPicture2: (lord, areas, how) => `இந்த நீண்ட ${lord} தசை முக்கியமாக ${areas} ஆகியவற்றை வடிவமைக்கும். பலன்கள் ${how} வரும்.`,
    thisPeriod: (r) => `இந்தக் காலகட்டம் · ${r}`,
    otherAreas: 'இப்போது உங்கள் மற்ற பகுதிகள்',
    careTimes: (list) => `அதிக கவனம் தேவைப்படும் காலம்: ${list}.`,
    healthNote: 'இது பாரம்பரிய நல்வாழ்வு வழிகாட்டல் மட்டுமே; மருத்துவ ஆலோசனை அல்ல.',
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
  const sections = [];
  const fname = (f) => FOCUS_NAME[f][lang];
  const KARAKA_OF = { family: ['venus', 'moon'], kids: ['jupiter'], health: ['sun', 'moon'], career: ['sun', 'saturn'], finances: ['jupiter'], education: ['mercury', 'jupiter'] };
  const focusScore = (f) => {
    const hs = FOCUS_HOUSES[f];
    let sc = hs.reduce((a, h) => a + areaScore(h), 0) / hs.length;
    for (const k of KARAKA_OF[f]) sc += 0.25 * strength(A, k);
    if (f === 'health') sc = 0.6 * strength(A, A.lordOf(1)) + 0.2 * strength(A, 'sun') + 0.2 * strength(A, 'moon');
    return sc;
  };
  /** Focus areas a period touches: via the houses its bhukti lord sits in and rules. */
  const focusOfPeriod = (b) => {
    const out = [];
    for (const h of housesOf(A, b.lord)) for (const f of HOUSE_TO_FOCUS[h]) if (!out.includes(f)) out.push(f);
    return out.slice(0, 3);
  };
  const flavorOf = (b) => {
    const h = A.house(b.lord);
    return HOUSE_FLAVOR[h] ? HOUSE_FLAVOR[h][lang] : null;
  };
  /** One period described area by area. */
  const describePeriod = (b, head) => {
    const tone = periodTone(b);
    const fs = focusOfPeriod(b);
    const p = [TONE_WORDS[tone][lang], ...fs.map((f) => `${fname(f)}: ${FOCUS_PERIOD[f][tone][lang][0]}`)];
    const fl = flavorOf(b);
    if (fl) p.push(fl);
    const tips = fs.slice(0, 2).map((f) => FOCUS_PERIOD[f][tone][lang][1]);
    return { h: head, p, tips };
  };

  // ---- brief
  const brief = [];
  brief.push(t.youAre(SIGN_TRAITS[lag][lang], SIGN_TRAITS[s.rasi][lang]));
  brief.push(t.focus(area(A.house(A.lordOf(1)))));
  if (bi >= 0) {
    const cur = all[bi];
    brief.push(t.nowBrief2(TONE_WORDS[periodTone(cur)][lang], t.until(fmtDate(cur.end)), focusOfPeriod(cur).map(fname).join('; ')));
  }
  const ranked = FOCUS.map((f) => [f, focusScore(f)]).sort((a, b) => b[1] - a[1]);
  brief.push(t.bestAreas(ranked.slice(0, 2).map(([f]) => fname(f)).join('; ')));
  const weak = ranked.filter(([, sc]) => sc < 0).slice(-2);
  if (weak.length) brief.push(t.patience(weak.map(([f]) => fname(f)).join('; ')));
  if (bi >= 0 && all[bi + 1]) {
    const nx = all[bi + 1];
    brief.push(t.nextTurn2(fmtDate(nx.start), TONE_WORDS[periodTone(nx)][lang], focusOfPeriod(nx).map(fname).join('; ')));
  }
  sections.push({ key: 'brief', title: t.sec.brief, items: brief });

  // ---- right now: the big picture, this period area by area, and this year's planets
  const nowItems = [];
  if (act) {
    const L = act.dasa.lord;
    const dasaFocus = [];
    for (const h of housesOf(A, L)) for (const f of HOUSE_TO_FOCUS[h]) if (!dasaFocus.includes(f)) dasaFocus.push(f);
    nowItems.push({ h: t.bigPictureH(fmtRange(act.dasa.start, act.dasa.end)), p: [t.bigPicture2(g(L), dasaFocus.slice(0, 3).map(fname).join('; '), HOW[L][lang])] });
  }
  if (bi >= 0) {
    const cur = all[bi];
    nowItems.push(describePeriod(cur, t.thisPeriod(fmtRange(cur.start, cur.end))));
    // what this period means for every focus area not covered above, in one line each
    const touched = focusOfPeriod(cur);
    const rest = FOCUS.filter((f) => !touched.includes(f)).map((f) => `${fname(f)}: ${FOCUS_CHART[f][toneOf(focusScore(f))][lang]}`);
    nowItems.push({ h: t.otherAreas, p: rest });
  }
  sections.push({ key: 'now', title: t.sec.now, items: nowItems });

  // ---- next few years
  if (bi >= 0) {
    const ahead = all.slice(bi + 1, bi + 6).map((b) => describePeriod(b, `${fmtRange(b.start, b.end)}`));
    sections.push({ key: 'ahead', title: t.sec.ahead, items: ahead });
  }

  // ---- life areas: the six focus areas
  const ageNow = (now - chart.input.utc) / (365.25 * 86400000);
  const AGE = { family: [18, 120], kids: [21, 60], health: [0, 120], career: [16, 70], finances: [16, 120], education: [4, 40] };
  const periodsFor = (f, tones, limit) =>
    all
      .slice(Math.max(bi, 0))
      .filter((b) => b.end > now && focusOfPeriod(b).includes(f) && tones.includes(periodTone(b)))
      .filter((b) => {
        const a = (b.start - chart.input.utc) / (365.25 * 86400000);
        return a <= AGE[f][1] && a + 3 >= AGE[f][0];
      })
      .slice(0, limit)
      .map((b) => fmtRange(b.start, b.end));
  const l10 = A.lordOf(10);
  const l7 = A.lordOf(7);
  const l11 = A.lordOf(11);
  const EXTRA = {
    family: [t.marriageBy(MARRIAGE_BY[A.house(l7)][lang])],
    kids: [],
    health: [t.healthNote],
    career: [t.careerFields(CAREER_FIELDS[A.house(l10)][lang])],
    finances: [t.incomeFrom(INCOME_BY[A.house(l11)][lang])],
    education: [],
  };
  const areas = FOCUS.map((f) => {
    const tone = toneOf(focusScore(f));
    const p = [FOCUS_CHART[f][tone][lang], ...EXTRA[f].filter((x) => !(f === 'family' && ageNow > 45))];
    const good = periodsFor(f, ['good'], 2);
    const care = periodsFor(f, ['hard'], 1);
    if (good.length) p.push(t.goodTimes(good.join('; ')));
    if (care.length) p.push(t.careTimes(care.join('; ')));
    if (!good.length && !care.length && ageNow <= AGE[f][1]) p.push(t.noGoodTimes);
    return { h: fname(f), p, tips: [FOCUS_PERIOD[f][tone === 'good' ? 'good' : tone][lang][1]] };
  });
  sections.push({ key: 'areas', title: t.sec.areas, items: areas });

  // ---- transits
  const tr = [];
  const sat = go.saturn;
  let satKey;
  if (go.sadeSati.active) satKey = `sade${go.sadeSati.phase}`;
  else if (sat.house === 4) satKey = 'sat4';
  else if (sat.house === 8) satKey = 'sat8';
  else satKey = [3, 6, 11].includes(sat.house) ? 'satGood' : 'satMixed';
  const satUntil = go.sadeSati.active ? go.sadeSati.end : sat.until;
  tr.push({ h: `${t.saturn} · ${t.until(fmtDate(satUntil))}`, p: [TRANSIT_PLAIN[satKey][lang][0]], tips: [TRANSIT_PLAIN[satKey][lang][1]] });
  if (!go.sadeSati.active && go.sadeSati.nextStart) tr.push(t.sadeNext(fmtDate(go.sadeSati.nextStart)));
  const jg = [2, 5, 7, 9, 11].includes(go.jupiter.house);
  tr.push({ h: `${t.jupiter} · ${t.until(fmtDate(go.jupiter.until))}`, p: [TRANSIT_PLAIN[jg ? 'jupGood' : 'jupWeak'][lang][0]], tips: [TRANSIT_PLAIN[jg ? 'jupGood' : 'jupWeak'][lang][1]] });
  const rg = [3, 6, 11].includes(go.rahu.house);
  tr.push({ h: `${t.raagu} · ${t.until(fmtDate(go.rahu.until))}`, p: [TRANSIT_PLAIN[rg ? 'rahuGood' : 'rahuWeak'][lang][0]], tips: [TRANSIT_PLAIN[rg ? 'rahuGood' : 'rahuWeak'][lang][1]] });
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
