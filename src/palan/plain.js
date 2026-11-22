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
import { PLANET_FIELDS, HOUSE_TOPIC, CAREER_FIELDS, MARRIAGE_BY, INCOME_BY, TRANSIT_PLAIN, FOCUS_NAME, FOCUS_HOUSES, FOCUS_CHART, FOCUS_PERIOD, TONE_WORDS, HOUSE_TO_FOCUS } from './plainTexts.js';
import { EVENTS, EVENT_TEXT, FOCUS_EXTRA, EVENT_SHORT } from './eventTexts.js';
import { kpChart, kpFires, KP_EVENTS } from '../engine/kp.js';

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

const MALEFICS = ['mars', 'saturn', 'rahu', 'ketu'];
/** Does the rule for event `key` fire in the period (bhukti lord bl, antaram lord al)?
 *  Same rules as the palan, without the age filter (used by the Bayesian tab). */
export function ruleFires(A, key, bl, al) {
  const sa = significations(A, al);
  const set = new Set([...significations(A, bl), ...sa]);
  const isSaf = (k) => MALEFICS.includes(k) && (significations(A, k).has(8) || (significations(A, k).has(1) && significations(A, k).has(6)));
  if (key === 'safety') return isSaf(al) && (isSaf(bl) || ['mars', 'rahu'].includes(al));
  if (key === 'parents') return set.has(8) && (set.has(4) || set.has(9)) && sa.has(8);
  const e = EVENTS.find((x) => x.key === key);
  if (!e) return false;
  return e.all.every((h) => set.has(h)) && e.all.filter((h) => sa.has(h)).length >= Math.ceil(e.all.length / 2);
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
    sec: { brief: 'Your reading in brief', now: 'Right now', months: 'Month by month: the next 12 months', ahead: 'The next few years', areas: 'Your life areas', safety: 'Take extra care', direction: 'Career and studies: traditional pointers', transits: 'Planets moving now', nature: 'Your nature' },
    until: (d) => `until ${d}`,
    youAre: (lag, moon) => `By nature you are ${lag}, with a mind that is ${moon}.`,
    and: ' and ',
    who: (lagS, lagT, moonS, moonT) => `With ${lagS} rising and the Moon in ${moonS}, you are ${lagT}; inside, your mind is ${moonT}.`,
    bigStory: (L, yrs, y0, y1, hs, areas, via) => `You are in ${L}’s ${yrs}-year period (${y0}–${y1}). In your chart ${L} works through your ${hs} house${hs.includes(',') || hs.includes(' and ') ? 's' : ''}, so these years centre on ${areas || 'steady personal growth'}. ${via}`,
    via: (L, h, topic, S, m, topic2) =>
      S === L || m === h
        ? `${L} sits in your ${ord(h)} house, so tradition links this period with ${topic}.`
        : `${L} sits in your ${ord(h)} house (${topic}) and in the star of ${S}, who sits in your ${ord(m)} house (${topic2}); tradition links this period with both.`,
    nowStory: (until, lords, what, tone) => `Right now, until ${until} (${lords} sub-period): ${what} ${tone}`,
    nowGood: (x) => `tradition points to ${x}.`,
    nowCare: (x) => `Take care with ${x}.`,
    goodFor: (x) => `good for ${x}.`,
    careFor: (x) => `Take care with ${x}.`,
    quietNow: 'a quieter stretch without strong indications either way.',
    yearAheadH: 'The next 12 months at a glance',
    takeCareSafety: 'take extra care with physical safety (driving, heights, tools, sports)',
    strengths: (best, weak) => `Your strongest areas at this stage of life: ${best}.${weak ? ` The area that needs most care: ${weak}.` : ''}`,
    nextStory: (d, L, ev) => `Next change: from ${d}, your ${L} sub-period begins${ev ? `, which tradition links with ${ev}` : ''}.`,
    nowLine: (until, what) => `Now (until ${until}): ${what}`,
    nextGood: (when, what) => `Next good window: ${when} — ${what}`,
    nextCare: (when, what) => `Next time to take care: ${when} — ${what}`,
    turning: (d, lord) => `Next big change: from ${d}, when your ${lord} period begins.`,
    why: (lords, rule) => `Why: ${lords} period. ${rule}`,
    whyKp: (lords, k, hs) => `Why (KP): ${lords} period. ${k} signifies your ${hs} houses.`,
    rule: (k, owns, h) => (owns ? `${k} rules your ${owns} and sits in your ${h}.` : `${k} sits in your ${h}.`),
    ruleNode: (k, sl, h) => `${k} acts for ${sl} and sits in your ${h}.`,
    houses: (hs) => (hs.length === 1 ? `${ord(hs[0])}` : `${hs.slice(0, -1).map(ord).join(', ')} and ${ord(hs.at(-1))}`),
    houseN: (h) => `${ord(h)} house`,
    bigPicture: (lord, range, via) => `Big picture: ${lord} period (${range}). ${via}`,
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
    workH: 'Work',
    studyH: 'Studies',
    workLine: (a, b) => `Your strongest career planets are ${a} and ${b}. Tradition links them with:`,
    studyLine: (a, b) => `Your strongest study planets are ${a} and ${b}. Tradition links them with:`,
    directionNote: 'These are traditional associations, not a prediction of what anyone will become. Interests, abilities and opportunities matter far more, especially for a young person.',
    incomeFrom: (f) => `Income tends to come from ${f}.`,
    marriageBy: (f) => `Tradition says: ${f}.`,
    healthNote: 'General wellbeing guidance from tradition, not medical advice.',
    windows: (list) => `Good windows: ${list}.`,
    careWin: (list) => `Times to take more care: ${list}.`,
    noWindows: 'No strong windows in the next few years; steady effort works best.',
    safetyWhy: { period: (l) => `${l} sub-period, traditionally linked with accidents and injuries in your chart.`, mars: (h) => `Sevvai (Mars) passes your ${ord(h)} house from the Moon or lagnam — traditionally a time for physical care.`, sani: 'Sani is in a testing position for you.' },
    safetyNone: 'No specific caution windows in the next two years. Usual care applies.',
    sadeNext: (d) => `Saturn’s 7½-year phase (Ezharai Sani) is not running now; the next one starts around ${d}.`,
    saturn: 'Saturn (Sani)', jupiter: 'Jupiter (Guru)', raagu: 'Raagu',
  },
  ta: {
    sec: { brief: 'சுருக்கமாக உங்கள் பலன்', now: 'இப்போது', months: 'மாதவாரியாக: அடுத்த 12 மாதங்கள்', ahead: 'அடுத்த சில ஆண்டுகள்', areas: 'வாழ்க்கைப் பகுதிகள்', safety: 'கூடுதல் கவனம் தேவைப்படும் காலங்கள்', direction: 'தொழில், கல்வி: பாரம்பரியக் குறிப்புகள்', transits: 'இப்போது நகரும் கிரகங்கள்', nature: 'உங்கள் இயல்பு' },
    until: (d) => `${d} வரை`,
    youAre: (lag, moon) => `இயல்பில் நீங்கள்: ${lag}. மனம்: ${moon}.`,
    and: ', ',
    who: (lagS, lagT, moonS, moonT) => `${lagS} லக்னம், ${moonS} ராசி: இயல்பில் நீங்கள் ${lagT}; மனதில் ${moonT}.`,
    bigStory: (L, yrs, y0, y1, hs, areas, via) => `நீங்கள் ${L} தசையில் இருக்கிறீர்கள் (${yrs} ஆண்டுகள், ${y0}–${y1}). உங்கள் ஜாதகத்தில் ${L} உங்கள் ${hs}-ஆம் வீடுகள் வழியாகச் செயல்படுவதால், இந்த ஆண்டுகள் ${areas || 'நிலையான வளர்ச்சி'} மையமாக அமையும். ${via}`,
    via: (L, h, topic, S, m, topic2) =>
      S === L || m === h
        ? `${L} உங்கள் ${h}-ஆம் வீட்டில் இருப்பதால், இந்தக் காலம் ${topic} ஆகியவற்றுடன் பாரம்பரியமாகத் தொடர்புடையது.`
        : `${L} உங்கள் ${h}-ஆம் வீட்டில் (${topic}), ${S} நட்சத்திரத்தில் உள்ளார்; ${S} உங்கள் ${m}-ஆம் வீட்டில் (${topic2}) உள்ளார். இவ்விரண்டுடனும் இந்தக் காலம் பாரம்பரியமாகத் தொடர்புடையது.`,
    nowStory: (until, lords, what, tone) => `இப்போது, ${until} வரை (${lords} உட்காலம்): ${what} ${tone}`,
    nowGood: (x) => `பாரம்பரியம் ${x} என்று சுட்டுகிறது.`,
    nowCare: (x) => `கவனம்: ${x}.`,
    goodFor: (x) => `${x} — சாதகம்.`,
    careFor: (x) => `கவனம்: ${x}.`,
    quietNow: 'இரு பக்கமும் வலுவான குறிப்புகள் இல்லாத அமைதியான காலம்.',
    yearAheadH: 'அடுத்த 12 மாதங்கள் ஒரே பார்வையில்',
    takeCareSafety: 'உடல் பாதுகாப்பில் கூடுதல் கவனம் (வாகனம், உயரம், கருவிகள், விளையாட்டு)',
    strengths: (best, weak) => `வாழ்வின் இந்தக் கட்டத்தில் உங்கள் பலமான பகுதிகள்: ${best}.${weak ? ` அதிக கவனம் தேவைப்படும் பகுதி: ${weak}.` : ''}`,
    nextStory: (d, L, ev) => `அடுத்த மாற்றம்: ${d} முதல் ${L} உட்காலம் தொடங்கும்${ev ? `; பாரம்பரியமாக இது ${ev} உடன் தொடர்புடையது` : ''}.`,
    nowLine: (until, what) => `இப்போது (${until} வரை): ${what}`,
    nextGood: (when, what) => `அடுத்த நல்ல காலம்: ${when} — ${what}`,
    nextCare: (when, what) => `அடுத்து கவனம் தேவை: ${when} — ${what}`,
    turning: (d, lord) => `அடுத்த பெரிய மாற்றம்: ${d} முதல் ${lord} காலம் தொடங்கும்.`,
    why: (lords, rule) => `காரணம்: ${lords} காலம். ${rule}`,
    whyKp: (lords, k, hs) => `காரணம் (கே.பி.): ${lords} காலம். ${k} உங்கள் ${hs}-ஆம் வீடுகளுக்குக் காரகர்.`,
    rule: (k, owns, h) => (owns ? `${k} உங்கள் ${owns}-ஆம் வீடுகளுக்கு அதிபதி; ${h.replace('வீடு', 'வீட்டில்')} உள்ளார்.` : `${k} ${h.replace('வீடு', 'வீட்டில்')} உள்ளார்.`),
    ruleNode: (k, sl, h) => `${k} ${sl} சார்பாகச் செயல்படும்; ${h.replace('வீடு', 'வீட்டில்')} உள்ளார்.`,
    houses: (hs) => hs.join(', '),
    houseN: (h) => `${h}-ஆம் வீடு`,
    bigPicture: (lord, range, via) => `பெரிய படம்: ${lord} தசை (${range}). ${via}`,
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
    workH: 'தொழில்',
    studyH: 'கல்வி',
    workLine: (a, b) => `உங்கள் வலுவான தொழில் கிரகங்கள் ${a}, ${b}. பாரம்பரியமாக இவை தொடர்புடையவை:`,
    studyLine: (a, b) => `உங்கள் வலுவான கல்விக் கிரகங்கள் ${a}, ${b}. பாரம்பரியமாக இவை தொடர்புடையவை:`,
    directionNote: 'இவை பாரம்பரியத் தொடர்புகள் மட்டுமே; ஒருவர் என்ன ஆவார் என்ற கணிப்பு அல்ல. ஆர்வம், திறமை, வாய்ப்புகளே மிக முக்கியம், குறிப்பாக இளையோருக்கு.',
    incomeFrom: (f) => `வருமானம் பெரும்பாலும் வரும் வழி: ${f}.`,
    marriageBy: (f) => `பாரம்பரியம் சொல்வது: ${f}.`,
    healthNote: 'இது பாரம்பரிய நல்வாழ்வு வழிகாட்டல் மட்டுமே; மருத்துவ ஆலோசனை அல்ல.',
    windows: (list) => `நல்ல காலங்கள்: ${list}.`,
    careWin: (list) => `அதிக கவனம் தேவைப்படும் காலம்: ${list}.`,
    noWindows: 'அடுத்த சில ஆண்டுகளில் வலுவான காலம் இல்லை; நிலையான முயற்சியே நல்லது.',
    safetyWhy: { period: (l) => `${l} உட்காலம்; உங்கள் ஜாதகத்தில் விபத்து, காயங்களுடன் பாரம்பரியமாகத் தொடர்புடையது.`, mars: (h) => `செவ்வாய் சந்திரன் அல்லது லக்னத்துக்கு ${h}-இல் கடக்கிறார் — பாரம்பரியமாக உடல் பாதுகாப்பில் கவனம் தேவைப்படும் காலம்.`, sani: 'சனி உங்களுக்குச் சோதனையான நிலையில்.' },
    safetyNone: 'அடுத்த இரண்டு ஆண்டுகளில் தனிக் கவனக் காலம் இல்லை. வழக்கமான கவனம் போதும்.',
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
export function plainPalan(chart, A, go, lang, fmtRange, fmtDate, now, fmtMonth, system = 'parasari') {
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
  const to12 = now.getTime() + 12 * YEAR;
  const curB = bhuktis.findIndex((b) => b.start <= now && now < b.end);
  const ants = [];
  for (const b of bhuktis) {
    if (b.end < now || b.start > now.getTime() + 6 * YEAR) continue;
    for (const a of antarams(b)) ants.push({ ...a, bhukti: b });
  }

  // ---- rule system: simplified (whole-sign) or KP (Placidus cusps, sub-lords)
  const K = system === 'kp' ? kpChart(chart) : null;
  const safetyAnt = K ? (bl, al) => kpFires(K, 'safety', bl, al) : (bl, al) => isSafety(al) && (isSafety(bl) || ['mars', 'rahu'].includes(al));
  /** Events indicated when bl (longer period) and al (shorter period) run, at a given age. */
  const eventsAt = (bl, al, age) => {
    // the generic "long trip" event fits almost everyone, so the palan does not forecast it
    if (!K) return matchEvents(union(bl, al), age, sig(al)).filter((e) => e.key !== 'travel');
    const res = EVENTS.filter((e) => e.key !== 'travel' && KP_EVENTS[e.key] && age >= e.age[0] && age <= e.age[1] && kpFires(K, e.key, bl, al)).map((e) => ({ ...e }));
    if (age >= 30 && age <= 80 && kpFires(K, 'parents', bl, al)) res.push({ key: 'parents', area: 'parents', prio: 5, care: true });
    return res.sort((a, b) => b.prio - a.prio);
  };

  /** Describe a period (lords = [dasa, bhukti, antaram?]) as events + tips. */
  const describe = (lords, when) => {
    const evs = eventsAt(lords.at(-2), lords.at(-1), ageAt(when));
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
  const whyOf = (lords) =>
    K
      ? t.whyKp(lords.map(g).join('–'), g(lords.at(-1)), t.houses([...K.planetSig[lords.at(-1)]].sort((x, y) => x - y)))
      : t.why(lords.map(g).join('–'), ruleOf(lords.at(-1)));

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
  // where the dasa lord and its star lord sit in THIS chart (not a fixed per-planet line)
  const houseOf = (k) => (K ? K.planets[k].house : A.house(k));
  const viaOf = (L) => {
    const S = nakshatraLord(A.by[L].nakshatra);
    const h = houseOf(L);
    const m = houseOf(S);
    return t.via(g(L), h, HOUSE_TOPIC[h][lang], g(S), m, HOUSE_TOPIC[m][lang]);
  };
  if (act) nowItems.push({ p: [t.bigPicture(g(act.dasa.lord), fmtRange(act.dasa.start, act.dasa.end), viaOf(act.dasa.lord))] });
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
    for (const e of eventsAt(a.bhukti.lord, a.lord, ageAt(mid))) {
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

  // =========================== CAREER AND STUDIES: traditional pointers
  // Planets ranked by their influence on the 10th house (career) and on the
  // 4th, 5th and 9th (schooling, intellect, higher studies), plus the D10 chart.
  const influence = (houses, weights) => {
    const score = {};
    for (const k of ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu']) {
      let sc = 0;
      houses.forEach((h, i) => {
        const w = weights[i];
        if (A.lordOf(h) === k) sc += 3 * w;
        if (A.occupants(h).includes(k)) sc += 2 * w;
        if (A.aspectsOn(h).includes(k)) sc += 1 * w;
      });
      sc += 0.4 * strength(A, k);
      score[k] = sc;
    }
    return score;
  };
  const work = influence([10], [1]);
  const d10Lag = dasamsaSign(chart.lagnam.lon);
  work[SIGN_LORDS[(d10Lag + 9) % 12]] += 1.5; // lord of the 10th in the career chart
  const study = influence([4, 5, 9], [1, 1.2, 0.8]);
  study.mercury += 1;
  study.jupiter += 1;
  const top = (sc) => Object.entries(sc).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
  const [w1, w2] = top(work);
  const [s1, s2] = top(study);
  const direction = [];
  if (ageNow < 25) direction.push({ h: t.studyH, p: [t.studyLine(g(s1), g(s2)), `${PLANET_FIELDS[s1].study[lang]}; ${PLANET_FIELDS[s2].study[lang]}.`], noLabel: true });
  direction.push({ h: t.workH, p: [t.workLine(g(w1), g(w2)), `${PLANET_FIELDS[w1].work[lang]}; ${PLANET_FIELDS[w2].work[lang]}.`, t.careerFields(CAREER_FIELDS[A.house(l10)][lang])], noLabel: true });
  direction.push(t.directionNote);
  sections.push({ key: 'direction', title: t.sec.direction, items: direction });

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

  // =========================== BRIEF (placed first): a short written reading
  const lc = (x) => x.replace(/\.$/, '').replace(/^./, (c) => c.toLowerCase());
  const primaryHouses = (k) => {
    if (K) return [K.planets[k].house, ...[...Array(12).keys()].map((i) => i + 1).filter((h) => K.owner(h) === k)];
    if (k === 'rahu' || k === 'ketu') return [A.house(k), ...A.owns(SIGN_LORDS[by[k].sign])];
    return [A.house(k), ...A.owns(k)];
  };
  const focusOf = (k) => {
    const out = [];
    for (const h of primaryHouses(k)) for (const f of HOUSE_TO_FOCUS[h]) if (!out.includes(f) && areaList.includes(f)) out.push(f);
    return out.slice(0, 2);
  };
  const AREA_SHORT = {
    en: { family: 'family', kids: 'children', health: 'health', career: 'career', finances: 'money and home', education: 'studies', parents: 'parents' },
    ta: { family: 'குடும்பம்', kids: 'குழந்தைகள்', health: 'உடல்நலம்', career: 'தொழில்', finances: 'பணம், வீடு', education: 'கல்வி', parents: 'பெற்றோர்' },
  };
  const aShort = (f) => AREA_SHORT[lang][f];
  const joinAnd = (arr) => (arr.length < 2 ? arr.join('') : `${arr.slice(0, -1).join(', ')}${t.and}${arr.at(-1)}`);
  const brief = [];
  brief.push(t.who(NAMES.rasi[lang][lag], SIGN_TRAITS[lag][lang], NAMES.rasi[lang][s.rasi], SIGN_TRAITS[s.rasi][lang]));
  if (act) {
    const L = act.dasa.lord;
    const ph = primaryHouses(L);
    brief.push(t.bigStory(g(L), act.dasa.years, act.dasa.start.getUTCFullYear(), act.dasa.end.getUTCFullYear(), t.houses([...new Set(ph)]), joinAnd(focusOf(L).map(aShort)), viaOf(L)));
  }
  const short = (k) => EVENT_SHORT[k][lang];
  const pickDistinct = (evs, n) => {
    const uniq = [...new Map(evs.map((e) => [e.key, e])).values()];
    const nonTravel = uniq.filter((e) => e.key !== 'travel');
    return (nonTravel.length ? nonTravel : uniq).sort((x, y) => y.prio - x.prio).slice(0, n);
  };
  if (curAnt) {
    const lords = [act.dasa.lord, curAnt.bhukti.lord, curAnt.lord];
    const evs = eventsAt(curAnt.bhukti.lord, curAnt.lord, ageNow);
    if (safetyAnt(curAnt.bhukti.lord, curAnt.lord)) evs.push({ key: 'safety', prio: 6, care: true });
    const good = pickDistinct(evs.filter((e) => !e.care), 2);
    const care = pickDistinct(evs.filter((e) => e.care), 1);
    const what = [good.length ? t.nowGood(joinAnd(good.map((e) => short(e.key)))) : t.quietNow, care.length ? t.nowCare(short(care[0].key)) : ''].filter(Boolean).join(' ');
    brief.push(t.nowStory(fmtDate(curAnt.end), lords.slice(1).map(g).join('–'), what, TONE_WORDS[periodTone(lords)][lang]));
  }
  // the next 12 months: windows grouped by dates, opportunities and cautions together
  const yearAhead = now.getTime() + YEAR;
  const rows = new Map();
  const addRow = (start, end, phrase, care) => {
    const s0 = start < now ? now : start;
    const key = mRange(s0, end);
    if (!rows.has(key)) rows.set(key, { start: s0, good: [], care: [] });
    const r = rows.get(key)[care ? 'care' : 'good'];
    if (!r.includes(phrase)) r.push(phrase);
  };
  const goodSoon = upcomingGood.filter((e) => e.a.start.getTime() < yearAhead && e.a.end > now);
  const nonTravelSoon = goodSoon.filter((e) => e.key !== 'travel');
  for (const e of nonTravelSoon.length >= 2 ? nonTravelSoon : goodSoon) addRow(e.a.start, e.a.end, short(e.key), false);
  for (const w of safety.filter((w) => w.start.getTime() < yearAhead)) addRow(w.start, w.end, short('safety'), true);
  for (const e of upcomingCare.filter((e) => e.a.start.getTime() < yearAhead && e.a.end > now && e.key !== 'parents')) addRow(e.a.start, e.a.end, short(e.key), true);
  const lines = [...rows.entries()]
    .sort((x, y) => x[1].start - y[1].start)
    .slice(0, 5)
    .map(([when, r]) => `${when}: ${[r.good.length ? t.goodFor(joinAnd(r.good.slice(0, 3))) : '', r.care.length ? t.careFor(joinAnd(r.care.slice(0, 2))) : ''].filter(Boolean).join(' ')}`);
  if (lines.length) brief.push({ h: t.yearAheadH, p: lines, noLabel: true });
  // strongest areas and the one needing most care, for this age
  const ranked = areaList.map((f) => [f, focusScore(f)]).sort((x, y) => y[1] - x[1]);
  const weakest = ranked.at(-1);
  brief.push(t.strengths(joinAnd(ranked.slice(0, 2).map(([f]) => aShort(f))), weakest[1] < 0.5 ? aShort(weakest[0]) : null));
  const nextB = bhuktis[curB + 1];
  if (nextB) {
    const ev = pickDistinct(eventsAt(nextB.dasaLord, nextB.lord, ageAt(nextB.start)).filter((e) => !e.care), 2);
    brief.push(t.nextStory(fmtDate(nextB.start), g(nextB.lord), ev.length ? joinAnd(ev.map((e) => short(e.key))) : null));
  }
  sections.unshift({ key: 'brief', title: t.sec.brief, items: brief });

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
