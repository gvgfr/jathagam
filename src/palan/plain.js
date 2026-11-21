// Plain-language palan, built the way working astrologers time events:
//  - Signification: each planet "signifies" houses through where it sits, what
//    it rules, and where its star lord sits / what that rules. An event (e.g.
//    promotion = 10+11) is indicated when the running period planets signify
//    all its houses.
//  - Dasa -> bhukti -> antaram (sub-sub-periods) for timing down to weeks.
//  - Transits judged with Ashtakavarga points, plus Jupiter–Saturn double transit.
//  - Divisional charts D10 (career) and D7 (children) for strength.
//  - Age-aware: only life areas and events relevant to the person's age.
// Everything is phrased as tradition, never certainty.
import { SIGN_LORDS, nakshatraLord } from '../engine/constants.js';
import { activePeriod, antarams } from '../engine/dasa.js';
import { ashtakavarga } from '../engine/ashtakavarga.js';
import { transitWindows } from '../engine/transit.js';
import { dasamsaSign, saptamsaSign } from '../engine/vargas.js';
import { NAMES } from '../i18n.js';
import { SIGN_TRAITS, NAK_TRAITS, EXALTATION } from './texts.js';
import { HOW, CAREER_FIELDS, MARRIAGE_BY, INCOME_BY, TRANSIT_PLAIN, FOCUS_NAME, FOCUS_HOUSES, FOCUS_CHART, FOCUS_PERIOD, TONE_WORDS } from './plainTexts.js';
import { EVENTS, EVENT_TEXT, FOCUS_EXTRA } from './eventTexts.js';

const YEAR = 365.25 * 86400000;
const GOOD_HOUSES = [1, 4, 5, 7, 9, 10];
const DUSTHANA = [6, 8, 12];
const UPACHAYA = [3, 6, 10, 11];
const NATURAL_BENEFIC = ['jupiter', 'venus', 'mercury', 'moon'];
const MALEFIC = ['mars', 'saturn', 'rahu', 'ketu'];

function dignity(key, sign) {
  if (!(key in EXALTATION)) return null;
  if (EXALTATION[key] === sign) return 'exalted';
  if ((EXALTATION[key] + 6) % 12 === sign) return 'debilitated';
  if (SIGN_LORDS[sign] === key) return 'own';
  return null;
}

/** Simple strength score for a planet (higher = more supportive). */
export function strength(A, key) {
  const h = A.house(key);
  let s = NATURAL_BENEFIC.includes(key) ? 1 : -0.5;
  const d = dignity(key, A.by[key].sign);
  if (d === 'exalted') s += 1.5;
  if (d === 'own') s += 1;
  if (d === 'debilitated') s -= 1.5;
  // navamsam (D9) support: same sign (vargottama) or own/exalted there
  const nd = dignity(key, A.by[key].navamsa);
  if (A.by[key].navamsa === A.by[key].sign || nd === 'own' || nd === 'exalted') s += 0.5;
  if (nd === 'debilitated') s -= 0.5;
  const malefic = !NATURAL_BENEFIC.includes(key);
  if (GOOD_HOUSES.includes(h)) s += 1;
  if ([2, 11].includes(h)) s += 0.5;
  if (malefic && UPACHAYA.includes(h)) s += 1;
  else if (DUSTHANA.includes(h)) s -= 1;
  if (!['rahu', 'ketu'].includes(key)) {
    const owns = A.owns(key);
    if (!owns.some((x) => [1, 4, 5, 7, 9, 10].includes(x)) && owns.some((x) => DUSTHANA.includes(x))) s -= 0.5;
  }
  if (A.yogas.some((y) => y.key === 'neechaBhanga' && y.planets.includes(key))) s += 1.5;
  if (A.yogas.some((y) => y.key === 'yogakaraka' && y.planets.includes(key))) s += 1;
  return s;
}
const toneOf = (s) => (s >= 1 ? 'good' : s <= -0.5 ? 'hard' : 'mixed');

/** Houses a planet signifies: where it sits, what it rules, and where its star lord sits.
 *  Raagu/Kethu act for the lord of the sign they occupy. */
export function significations(A, key) {
  const out = new Set([A.house(key)]);
  if (key === 'rahu' || key === 'ketu') {
    const sl = SIGN_LORDS[A.by[key].sign];
    out.add(A.house(sl));
    A.owns(sl).forEach((h) => out.add(h));
  } else A.owns(key).forEach((h) => out.add(h));
  out.add(A.house(nakshatraLord(A.by[key].nakshatra)));
  return out;
}

/** Events indicated by a set of signified houses, for a given age. The
 *  shortest period's planet (mustTouch) must itself signify at least half of
 *  the event's houses, so one planet cannot trigger everything. */
export function matchEvents(sig, age, mustTouch = null) {
  const enough = (e) => !mustTouch || e.all.filter((h) => mustTouch.has(h)).length >= Math.ceil(e.all.length / 2);
  const res = EVENTS.filter((e) => e.all.every((h) => sig.has(h)) && age >= e.age[0] && age <= e.age[1] && enough(e)).map((e) => ({ ...e }));
  if (age >= 30 && age <= 80 && sig.has(8) && (sig.has(4) || sig.has(9)) && (!mustTouch || mustTouch.has(8))) res.push({ key: 'parents', area: 'parents', prio: 5, care: true });
  return res.sort((a, b) => b.prio - a.prio);
}

const T = {
  en: {
    sec: { brief: 'Your reading in brief', now: 'Right now', months: 'Month by month: the next 12 months', ahead: 'The next few years', areas: 'Your life areas', safety: 'Take extra care', past: 'Looking back: does this fit?', transits: 'Planets moving now', nature: 'Your nature' },
    until: (d) => `until ${d}`,
    youAre: (lag, moon) => `By nature you are ${lag}, with a mind that is ${moon}.`,
    nowLine: (until, what) => `Now (until ${until}): ${what}`,
    nextGood: (when, what) => `Next good window: ${when} — ${what}`,
    nextCare: (when, what) => `Next time to take care: ${when} — ${what}`,
    turning: (d, lord) => `Next big change: from ${d}, when your ${lord} period begins.`,
    why: (lords, rule) => `Why: ${lords} period. ${rule}`,
    rule: (k, owns, h) => (owns ? `${k} rules your ${owns} and sits in your ${h}.` : `${k} sits in your ${h}.`),
    ruleNode: (k, sl, h) => `${k} acts for ${sl} and sits in your ${h}.`,
    houses: (hs) => (hs.length === 1 ? `${ord(hs[0])}` : `${hs.slice(0, -1).map(ord).join(', ')} and ${ord(hs.at(-1))}`),
    houseN: (h) => `${ord(h)} house`,
    bigPicture: (lord, range, how) => `Big picture: ${lord} period (${range}). Results tend to come ${how}.`,
    effort: 'Possible, though it may take more effort and patience.',
    dtLine: (h, what) => `Guru and Sani both influence your ${ord(h)} house now (a traditional “double transit”): ${what}`,
    satBav: (h, n) => `Sani is passing your ${ord(h)} house from the Moon with ${n} of 8 support points — ${n >= 4 ? 'traditionally easier for you' : 'traditionally heavier for you'}.`,
    jupBav: (h, n) => `Guru is passing your ${ord(h)} house from the Moon with ${n} of 8 support points — ${n >= 4 ? 'traditionally helpful' : 'traditionally less helpful'}.`,
    inChart: 'In your chart',
    careerChart: (l, h, d10) => `Your career planet ${l} sits in your ${ord(h)} house${d10}.`,
    d10good: ' and is strong in the career chart (D10)',
    d10weak: ' but is weak in the career chart (D10), so effort matters more',
    kidsChart: (l, h, d7) => `Your children’s planet ${l} sits in your ${ord(h)} house${d7}.`,
    d7good: ' and is strong in the children chart (D7)',
    d7weak: ' but is weak in the children chart (D7)',
    careerFields: (f) => `Work that suits you traditionally: ${f}.`,
    incomeFrom: (f) => `Income tends to come from ${f}.`,
    marriageBy: (f) => `Tradition says: ${f}.`,
    healthNote: 'General wellbeing guidance from tradition, not medical advice.',
    windows: (list) => `Good windows: ${list}.`,
    careWin: (list) => `Times to take more care: ${list}.`,
    noWindows: 'No strong windows in the next few years; steady effort works best.',
    safetyWhy: { period: (l) => `${l} sub-period, traditionally linked with accidents and injuries in your chart.`, mars: (h) => `Sevvai (Mars) passes your ${ord(h)} house from the Moon or lagnam — traditionally a time for physical care.`, sani: 'Sani is in a testing position for you.' },
    safetyNone: 'No specific caution windows in the next two years. Usual care applies.',
    pastNote: 'Compare these past periods with what actually happened in your life. It is the best way to judge how much weight to give the forecasts.',
    sadeNext: (d) => `Saturn’s 7½-year phase (Ezharai Sani) is not running now; the next one starts around ${d}.`,
    saturn: 'Saturn (Sani)', jupiter: 'Jupiter (Guru)', raagu: 'Raagu',
  },
  ta: {
    sec: { brief: 'சுருக்கமாக உங்கள் பலன்', now: 'இப்போது', months: 'மாதவாரியாக: அடுத்த 12 மாதங்கள்', ahead: 'அடுத்த சில ஆண்டுகள்', areas: 'வாழ்க்கைப் பகுதிகள்', safety: 'கூடுதல் கவனம் தேவைப்படும் காலங்கள்', past: 'திரும்பிப் பார்த்தால்: பொருந்துகிறதா?', transits: 'இப்போது நகரும் கிரகங்கள்', nature: 'உங்கள் இயல்பு' },
    until: (d) => `${d} வரை`,
    youAre: (lag, moon) => `இயல்பில் நீங்கள்: ${lag}. மனம்: ${moon}.`,
    nowLine: (until, what) => `இப்போது (${until} வரை): ${what}`,
    nextGood: (when, what) => `அடுத்த நல்ல காலம்: ${when} — ${what}`,
    nextCare: (when, what) => `அடுத்து கவனம் தேவை: ${when} — ${what}`,
    turning: (d, lord) => `அடுத்த பெரிய மாற்றம்: ${d} முதல் ${lord} காலம் தொடங்கும்.`,
    why: (lords, rule) => `காரணம்: ${lords} காலம். ${rule}`,
    rule: (k, owns, h) => (owns ? `${k} உங்கள் ${owns}-ஆம் வீடுகளுக்கு அதிபதி; ${h.replace('வீடு', 'வீட்டில்')} உள்ளார்.` : `${k} ${h.replace('வீடு', 'வீட்டில்')} உள்ளார்.`),
    ruleNode: (k, sl, h) => `${k} ${sl} சார்பாகச் செயல்படும்; ${h.replace('வீடு', 'வீட்டில்')} உள்ளார்.`,
    houses: (hs) => hs.join(', '),
    houseN: (h) => `${h}-ஆம் வீடு`,
    bigPicture: (lord, range, how) => `பெரிய படம்: ${lord} தசை (${range}). பலன்கள் ${how} வரும்.`,
    effort: 'சாத்தியம், ஆனால் அதிக முயற்சியும் பொறுமையும் தேவைப்படலாம்.',
    dtLine: (h, what) => `குருவும் சனியும் இப்போது உங்கள் ${h}-ஆம் வீட்டைப் பார்க்கின்றனர் (பாரம்பரிய “இரட்டைக் கோசாரம்”): ${what}`,
    satBav: (h, n) => `சனி சந்திரனுக்கு ${h}-ஆம் வீட்டில், 8-ல் ${n} அஷ்டவர்க்கப் புள்ளிகளுடன் — ${n >= 4 ? 'பாரம்பரியமாக உங்களுக்கு எளிதானது' : 'பாரம்பரியமாக உங்களுக்குச் சற்று கனமானது'}.`,
    jupBav: (h, n) => `குரு சந்திரனுக்கு ${h}-ஆம் வீட்டில், 8-ல் ${n} அஷ்டவர்க்கப் புள்ளிகளுடன் — ${n >= 4 ? 'பாரம்பரியமாக உதவும்' : 'பாரம்பரியமாக குறைவாக உதவும்'}.`,
    inChart: 'உங்கள் ஜாதகத்தில்',
    careerChart: (l, h, d10) => `உங்கள் தொழில் கிரகம் ${l} ${h}-ஆம் வீட்டில் உள்ளார்${d10}.`,
    d10good: '; தொழில் சக்கரத்திலும் (D10) பலமாக',
    d10weak: '; தொழில் சக்கரத்தில் (D10) பலவீனம், எனவே முயற்சி முக்கியம்',
    kidsChart: (l, h, d7) => `உங்கள் குழந்தைகள் கிரகம் ${l} ${h}-ஆம் வீட்டில் உள்ளார்${d7}.`,
    d7good: '; சப்தாம்ச சக்கரத்திலும் (D7) பலமாக',
    d7weak: '; சப்தாம்ச சக்கரத்தில் (D7) பலவீனம்',
    careerFields: (f) => `பாரம்பரியமாக உங்களுக்குப் பொருந்தும் பணிகள்: ${f}.`,
    incomeFrom: (f) => `வருமானம் பெரும்பாலும் வரும் வழி: ${f}.`,
    marriageBy: (f) => `பாரம்பரியம் சொல்வது: ${f}.`,
    healthNote: 'இது பாரம்பரிய நல்வாழ்வு வழிகாட்டல் மட்டுமே; மருத்துவ ஆலோசனை அல்ல.',
    windows: (list) => `நல்ல காலங்கள்: ${list}.`,
    careWin: (list) => `அதிக கவனம் தேவைப்படும் காலம்: ${list}.`,
    noWindows: 'அடுத்த சில ஆண்டுகளில் வலுவான காலம் இல்லை; நிலையான முயற்சியே நல்லது.',
    safetyWhy: { period: (l) => `${l} உட்காலம்; உங்கள் ஜாதகத்தில் விபத்து, காயங்களுடன் பாரம்பரியமாகத் தொடர்புடையது.`, mars: (h) => `செவ்வாய் சந்திரன் அல்லது லக்னத்துக்கு ${h}-இல் கடக்கிறார் — பாரம்பரியமாக உடல் பாதுகாப்பில் கவனம் தேவைப்படும் காலம்.`, sani: 'சனி உங்களுக்குச் சோதனையான நிலையில்.' },
    safetyNone: 'அடுத்த இரண்டு ஆண்டுகளில் தனிக் கவனக் காலம் இல்லை. வழக்கமான கவனம் போதும்.',
    pastNote: 'இந்தக் கடந்த காலங்களை உங்கள் வாழ்வில் உண்மையில் நடந்தவற்றுடன் ஒப்பிட்டுப் பாருங்கள். கணிப்புகளுக்கு எவ்வளவு முக்கியத்துவம் தரலாம் என்று தீர்மானிக்க இதுவே சிறந்த வழி.',
    sadeNext: (d) => `ஏழரைச் சனி இப்போது இல்லை; அடுத்தது சுமார் ${d} அன்று தொடங்கும்.`,
    saturn: 'சனி', jupiter: 'குரு', raagu: 'ராகு',
  },
};
function ord(n) {
  return `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
}

/**
 * @returns {{key:string,title:string,items:(string|{h?:string,p?:string[],tips?:string[],why?:string})[]}[]}
 */
export function plainPalan(chart, A, go, lang, fmtRange, fmtDate, now, fmtMonth) {
  const t = T[lang];
  const g = (k) => NAMES.graha[lang][k];
  const s = chart.summary;
  const lag = A.lag;
  const by = A.by;
  const birth = chart.input.utc;
  const ageAt = (d) => (d - birth) / YEAR;
  const ageNow = ageAt(now);
  const mRange = (a, b) => (fmtMonth ? `${fmtMonth(a)} – ${fmtMonth(b)}` : fmtRange(a, b));
  const evText = (k) => EVENT_TEXT[k][lang];
  const fname = (f) => (f === 'parents' ? FOCUS_EXTRA.parents.name[lang] : FOCUS_NAME[f][lang]);

  // ---- precomputed tools
  const sigCache = {};
  const sig = (k) => (sigCache[k] ||= significations(A, k));
  const union = (...ks) => new Set(ks.flatMap((k) => [...sig(k)]));
  const av = ashtakavarga({ ...Object.fromEntries(['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'].map((k) => [k, by[k].sign])), lagnam: lag });
  const fromMoon = (sign) => ((sign - s.rasi + 12) % 12) + 1;
  const fromLag = (sign) => ((sign - lag + 12) % 12) + 1;
  const ruleOf = (k) => {
    if (k === 'rahu' || k === 'ketu') return t.ruleNode(g(k), g(SIGN_LORDS[by[k].sign]), t.houseN(A.house(k)));
    const owns = A.owns(k);
    return t.rule(g(k), owns.length ? t.houses(owns) : '', t.houseN(A.house(k)));
  };
  const periodTone = (lords) => toneOf(lords.reduce((a, k, i) => a + strength(A, k) * [0.3, 0.4, 0.3][i] / (lords.length === 2 ? 0.7 : 1), 0));
  const isSafety = (k) => MALEFIC.includes(k) && (sig(k).has(8) || (sig(k).has(1) && sig(k).has(6)));

  // all bhuktis and antarams from 10 years ago to 12 years ahead
  const bhuktis = chart.dasa.periods.flatMap((p) => p.bhuktis.map((b) => ({ ...b, dasaLord: p.lord })));
  const from10 = now.getTime() - 10 * YEAR;
  const to12 = now.getTime() + 12 * YEAR;
  const curB = bhuktis.findIndex((b) => b.start <= now && now < b.end);
  const ants = [];
  for (const b of bhuktis) {
    if (b.end < now || b.start > now.getTime() + 6 * YEAR) continue;
    for (const a of antarams(b)) ants.push({ ...a, bhukti: b });
  }

  /** Describe a period (lords = [dasa, bhukti, antaram?]) as events + tips. */
  const safetyAnt = (bl, al) => isSafety(al) && (isSafety(bl) || ['mars', 'rahu'].includes(al));
  const describe = (lords, when, touch) => {
    const set = union(...lords.slice(-2));
    const evs = matchEvents(set, ageAt(when), touch ? sig(touch) : null);
    const good = evs.filter((e) => !e.care);
    const care = evs.filter((e) => e.care);
    const tone = periodTone(lords);
    const picked = [...good.slice(0, 2), ...care.slice(0, 1)];
    if (lords.length === 3 && safetyAnt(lords[1], lords[2])) picked.push({ key: 'safety', care: true });
    if (!picked.length) picked.push({ key: 'quiet' });
    const p = picked.map((e) => evText(e.key)[0]);
    if (tone === 'hard' && good.length) p.push(t.effort);
    const tips = [...new Set(picked.map((e) => evText(e.key)[1]))].slice(0, 3);
    return { p, tips, tone, events: picked };
  };
  const whyOf = (lords) => t.why(lords.map(g).join('–'), ruleOf(lords.at(-1)));

  // Jupiter–Saturn double transit on key houses (from lagnam)
  const influences = (planetSign, offsets, h) => {
    const ph = fromLag(planetSign);
    return ph === h || offsets.some((o) => ((ph - 1 + o - 1) % 12) + 1 === h);
  };
  const DT_HOUSES = [7, 10, 5, 4, 11];
  const dtEvent = (h, age) =>
    ({ 7: age < 42 ? 'marriage' : 'partnerGood', 10: 'promotion', 5: age < 42 ? 'childbirth' : 'kidsNews', 4: 'property', 11: 'incomeRise' })[h];
  const doubleTransit = (jupSign, satSign, age) =>
    DT_HOUSES.filter((h) => influences(jupSign, [5, 7, 9], h) && influences(satSign, [3, 7, 10], h)).map((h) => ({ h, ev: dtEvent(h, age) }));

  const sections = [];

  // =========================== RIGHT NOW
  const nowItems = [];
  const act = activePeriod(chart.dasa, now);
  const curAnt = ants.find((a) => a.start <= now && now < a.end);
  if (act) nowItems.push({ p: [t.bigPicture(g(act.dasa.lord), fmtRange(act.dasa.start, act.dasa.end), HOW[act.dasa.lord][lang])] });
  let nowSummary = null;
  if (curAnt) {
    const lords = [act.dasa.lord, curAnt.bhukti.lord, curAnt.lord];
    const d = describe(lords, now, curAnt.lord);
    nowSummary = { until: fmtDate(curAnt.end), what: d.p[0] };
    const satH = fromMoon(go.saturn.sign);
    const jupH = fromMoon(go.jupiter.sign);
    const extra = [t.satBav(satH, av.bav.saturn[go.saturn.sign]), t.jupBav(jupH, av.bav.jupiter[go.jupiter.sign])];
    for (const x of doubleTransit(go.jupiter.sign, go.saturn.sign, ageNow)) if (x.ev) extra.push(t.dtLine(x.h, evText(x.ev)[0]));
    nowItems.push({ h: fmtRange(curAnt.start, curAnt.end), p: [TONE_WORDS[d.tone][lang], ...d.p, ...extra], tips: d.tips, why: whyOf(lords) });
  }
  sections.push({ key: 'now', title: t.sec.now, items: nowItems });

  // =========================== MONTH BY MONTH (antarams in the next 12 months)
  const months = [];
  const horizon = now.getTime() + YEAR;
  const upcomingGood = [];
  const upcomingCare = [];
  for (const a of ants) {
    if (a.end <= now || a.start.getTime() > horizon) continue;
    const lords = [a.bhukti.dasaLord, a.bhukti.lord, a.lord];
    const mid = new Date(Math.max(now.getTime(), (a.start.getTime() + a.end.getTime()) / 2));
    const d = describe(lords, mid, a.lord);
    months.push({ h: mRange(a.start < now ? now : a.start, a.end), p: [TONE_WORDS[d.tone][lang], ...d.p], tips: d.tips, why: whyOf(lords) });
  }
  // (computed for brief/areas below, over 6 years at antaram level)
  const sixYears = ants.filter((a) => a.end > now);
  for (const a of sixYears) {
    const lords = [a.bhukti.dasaLord, a.bhukti.lord, a.lord];
    const mid = new Date((a.start.getTime() + a.end.getTime()) / 2);
    const tone = periodTone(lords);
    for (const e of matchEvents(union(a.bhukti.lord, a.lord), ageAt(mid), sig(a.lord))) {
      if (e.care) upcomingCare.push({ ...e, a });
      else if (tone !== 'hard') upcomingGood.push({ ...e, a });
    }
  }
  sections.push({ key: 'months', title: t.sec.months, items: months });

  // =========================== NEXT FEW YEARS (bhuktis)
  const ahead = [];
  for (const b of bhuktis.slice(curB + 1, curB + 6)) {
    const lords = [b.dasaLord, b.lord];
    const d = describe(lords, new Date((b.start.getTime() + b.end.getTime()) / 2), b.lord);
    ahead.push({ h: mRange(b.start, b.end), p: [TONE_WORDS[d.tone][lang], ...d.p], tips: d.tips, why: whyOf(lords) });
  }
  sections.push({ key: 'ahead', title: t.sec.ahead, items: ahead });

  // =========================== LIFE AREAS (age-aware)
  const areaList =
    ageNow < 18 ? ['education', 'health', 'family']
      : ageNow < 30 ? ['career', 'education', 'family', 'finances', 'health']
        : ageNow < 45 ? ['family', 'kids', 'career', 'finances', 'health']
          : ageNow < 60 ? ['career', 'finances', 'kids', 'family', 'parents', 'health']
            : ['health', 'family', 'kids', 'finances'];
  const areaScore = (h) => {
    let sc = strength(A, A.lordOf(h));
    if (A.aspectsOn(h).includes('jupiter') || A.occupants(h).includes('jupiter')) sc += 0.75;
    for (const m of ['saturn', 'mars', 'rahu', 'ketu']) if (A.occupants(h).includes(m) && !UPACHAYA.includes(h)) sc -= 0.5;
    return sc;
  };
  const focusScore = (f) => {
    if (f === 'health') return 0.6 * strength(A, A.lordOf(1)) + 0.2 * strength(A, 'sun') + 0.2 * strength(A, 'moon');
    if (f === 'parents') return (areaScore(4) + areaScore(9)) / 2;
    const hs = FOCUS_HOUSES[f];
    return hs.reduce((a, h) => a + areaScore(h), 0) / hs.length;
  };
  const winList = (arr, f) => {
    const seen = new Set();
    return arr
      .filter((e) => e.area === f)
      .filter((e) => (seen.has(e.a.start.getTime()) ? false : seen.add(e.a.start.getTime())))
      .slice(0, 3)
      .map((e) => `${mRange(e.a.start, e.a.end)} (${evText(e.key)[0].replace(/\.$/, '').toLowerCase()})`);
  };
  const l10 = A.lordOf(10);
  const l7 = A.lordOf(7);
  const l11 = A.lordOf(11);
  const l5 = A.lordOf(5);
  const d10s = dasamsaSign(by[l10].lon);
  const d10dig = dignity(l10, d10s);
  const d7dig = dignity(l5, saptamsaSign(by[l5].lon));
  const specifics = {
    career: [t.careerChart(g(l10), A.house(l10), d10dig === 'own' || d10dig === 'exalted' ? t.d10good : d10dig === 'debilitated' ? t.d10weak : ''), t.careerFields(CAREER_FIELDS[A.house(l10)][lang])],
    finances: [t.incomeFrom(INCOME_BY[A.house(l11)][lang])],
    family: ageNow < 45 ? [t.marriageBy(MARRIAGE_BY[A.house(l7)][lang])] : [],
    kids: [t.kidsChart(g(l5), A.house(l5), d7dig === 'own' || d7dig === 'exalted' ? t.d7good : d7dig === 'debilitated' ? t.d7weak : '')],
    health: [t.healthNote],
    education: [],
    parents: [],
  };
  const areas = areaList.map((f) => {
    const tone = toneOf(focusScore(f));
    const chartLine = f === 'parents' ? FOCUS_EXTRA.parents[tone][lang] : FOCUS_CHART[f][tone][lang];
    const p = [chartLine, ...specifics[f]];
    const gw = winList(upcomingGood, f);
    const cw = winList(upcomingCare, f).slice(0, 2);
    if (gw.length) p.push(t.windows(gw.join('; ')));
    if (cw.length) p.push(t.careWin(cw.join('; ')));
    if (!gw.length && !cw.length) p.push(t.noWindows);
    const firstGood = upcomingGood.find((e) => e.area === f);
    const tip = f === 'parents' ? FOCUS_EXTRA.parents.tip[lang] : firstGood ? evText(firstGood.key)[1] : FOCUS_PERIOD[f][tone][lang][1];
    return { h: fname(f), p, tips: [tip] };
  });
  sections.push({ key: 'areas', title: t.sec.areas, items: areas });

  // =========================== SAFETY WINDOWS (next 24 months)
  const safety = [];
  const to24 = new Date(now.getTime() + 2 * YEAR);
  for (const a of ants) {
    if (a.end <= now || a.start > to24) continue;
    if (safetyAnt(a.bhukti.lord, a.lord)) {
      safety.push({ start: a.start < now ? now : a.start, end: a.end, why: t.safetyWhy.period(`${g(a.bhukti.lord)}–${g(a.lord)}`) });
    }
  }
  const marsSigns = [...new Set([s.rasi, (s.rasi + 7) % 12, lag, (lag + 7) % 12])];
  for (const w of transitWindows('mars', marsSigns, now, to24, 2)) {
    const inBad = ants.some((a) => a.start < w.end && a.end > w.start && safetyAnt(a.bhukti.lord, a.lord));
    if (inBad || av.bav.mars[w.sign] <= 2) {
      const h = marsSigns.indexOf(w.sign) % 2 === 0 ? 1 : 8;
      safety.push({ start: w.start, end: w.end, why: t.safetyWhy.mars(h) });
    }
  }
  safety.sort((a, b) => a.start - b.start);
  // merge overlapping windows, keeping every reason
  const merged = [];
  for (const w of safety) {
    const last = merged.at(-1);
    if (last && w.start <= last.end) {
      if (w.end > last.end) last.end = w.end;
      if (!last.why.includes(w.why)) last.why += ` ${w.why}`;
    } else merged.push({ ...w });
  }
  safety.length = 0;
  safety.push(...merged);
  const safetyItems = safety.slice(0, 5).map((w) => ({ h: mRange(w.start, w.end), p: [evText('safety')[0]], tips: [evText('safety')[1]], why: w.why }));
  if (!safetyItems.length) safetyItems.push(t.safetyNone);
  sections.push({ key: 'safety', title: t.sec.safety, items: safetyItems });

  // =========================== BRIEF (placed first)
  const brief = [t.youAre(SIGN_TRAITS[lag][lang], SIGN_TRAITS[s.rasi][lang])];
  if (nowSummary) brief.push(t.nowLine(nowSummary.until, nowSummary.what));
  const ng = upcomingGood.find((e) => e.a.start > now);
  if (ng) brief.push(t.nextGood(mRange(ng.a.start, ng.a.end), evText(ng.key)[0]));
  const nc = safety[0] || upcomingCare.find((e) => e.a.start > now);
  if (nc) brief.push(t.nextCare(mRange(nc.start || nc.a.start, nc.end || nc.a.end), nc.why && nc.start ? evText('safety')[0] : evText(nc.key)[0]));
  const nextB = bhuktis[curB + 1];
  if (nextB) brief.push(t.turning(fmtDate(nextB.start), `${g(nextB.dasaLord)}–${g(nextB.lord)}`));
  sections.unshift({ key: 'brief', title: t.sec.brief, items: brief });

  // =========================== LOOKING BACK (last 10 years)
  const past = [t.pastNote];
  for (const b of bhuktis) {
    if (b.end.getTime() < from10 || b.start > now) continue;
    if (b.start <= now && now < b.end) continue;
    const lords = [b.dasaLord, b.lord];
    const d = describe(lords, new Date((b.start.getTime() + b.end.getTime()) / 2), b.lord);
    past.push({ h: mRange(b.start, b.end), p: d.p, why: whyOf(lords) });
  }
  sections.push({ key: 'past', title: t.sec.past, items: past });

  // =========================== PLANETS NOW
  const tr = [];
  const sat = go.saturn;
  let satKey;
  if (go.sadeSati.active) satKey = `sade${go.sadeSati.phase}`;
  else if (sat.house === 4) satKey = 'sat4';
  else if (sat.house === 8) satKey = 'sat8';
  else satKey = [3, 6, 11].includes(sat.house) ? 'satGood' : 'satMixed';
  const satUntil = go.sadeSati.active ? go.sadeSati.end : sat.until;
  tr.push({ h: `${t.saturn} · ${t.until(fmtDate(satUntil))}`, p: [TRANSIT_PLAIN[satKey][lang][0], t.satBav(sat.house, av.bav.saturn[sat.sign])], tips: [TRANSIT_PLAIN[satKey][lang][1]] });
  if (!go.sadeSati.active && go.sadeSati.nextStart) tr.push(t.sadeNext(fmtDate(go.sadeSati.nextStart)));
  const jg = [2, 5, 7, 9, 11].includes(go.jupiter.house);
  tr.push({ h: `${t.jupiter} · ${t.until(fmtDate(go.jupiter.until))}`, p: [TRANSIT_PLAIN[jg ? 'jupGood' : 'jupWeak'][lang][0], t.jupBav(go.jupiter.house, av.bav.jupiter[go.jupiter.sign])], tips: [TRANSIT_PLAIN[jg ? 'jupGood' : 'jupWeak'][lang][1]] });
  const rg = [3, 6, 11].includes(go.rahu.house);
  tr.push({ h: `${t.raagu} · ${t.until(fmtDate(go.rahu.until))}`, p: [TRANSIT_PLAIN[rg ? 'rahuGood' : 'rahuWeak'][lang][0]], tips: [TRANSIT_PLAIN[rg ? 'rahuGood' : 'rahuWeak'][lang][1]] });
  sections.push({ key: 'transits', title: t.sec.transits, items: tr });

  // =========================== NATURE
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
