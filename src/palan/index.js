// Palan: rule-based traditional readings for one chart, in Tamil or English.
// Readings combine house lordship, placement, dignity, yogas, aspects, the
// running dasa/bhukti and today's transits, so they are specific to the chart.
// Every statement is phrased as what tradition says, never as a certainty.
import { SIGN_LORDS } from '../engine/constants.js';
import { activePeriod } from '../engine/dasa.js';
import { gocharam } from '../engine/transit.js';
import { plainPalan } from './plain.js';
import { NAMES } from '../i18n.js';
import {
  KARAKA, HOUSE, HOUSE_SHORT, LORD_IN, DASA_THEME,
  EXALTATION, BENEFICS, UPACHAYA, YOGA, GOCHARA,
} from './texts.js';

/** House (1-12, whole-sign) of a sign counted from another sign. */
export const houseOf = (sign, fromSign) => ((sign - fromSign + 12) % 12) + 1;
const KENDRA = [1, 4, 7, 10];
const TRIKONA = [1, 5, 9];
const ord = (n) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

export function dignity(key, sign) {
  if (!(key in EXALTATION)) return null;
  if (EXALTATION[key] === sign) return 'exalted';
  if ((EXALTATION[key] + 6) % 12 === sign) return 'debilitated';
  if (SIGN_LORDS[sign] === key) return 'own';
  return null;
}

// Special aspects (drishti): every planet aspects the 7th; Mars also 4th & 8th,
// Jupiter 5th & 9th, Saturn 3rd & 10th (counted from its own house).
const ASPECTS = { mars: [4, 7, 8], jupiter: [5, 7, 9], saturn: [3, 7, 10] };
const aspectOffsets = (key) => ASPECTS[key] || [7];

/** Analysis independent of language: lordships, placements, yogas. */
export function analyse(chart) {
  const lag = chart.lagnam.sign;
  const by = Object.fromEntries(chart.planets.map((p) => [p.key, p]));
  const house = (key) => houseOf(by[key].sign, lag);
  const lordOf = (h) => SIGN_LORDS[(lag + h - 1) % 12];
  const owns = (key) => [...Array(12).keys()].map((i) => i + 1).filter((h) => lordOf(h) === key);
  const occupants = (h) => chart.planets.filter((p) => house(p.key) === h).map((p) => p.key);
  const aspectsOn = (h) =>
    chart.planets
      .filter((p) => !['rahu', 'ketu'].includes(p.key))
      .filter((p) => aspectOffsets(p.key).some((o) => ((house(p.key) - 1 + o - 1) % 12) + 1 === h))
      .map((p) => p.key);

  const yogas = [];
  const moonSign = by.moon.sign;
  if (KENDRA.includes(houseOf(by.jupiter.sign, moonSign))) yogas.push({ key: 'gajakesari' });
  if (by.sun.sign === by.mercury.sign) yogas.push({ key: 'budhaAditya' });
  if (by.moon.sign === by.mars.sign) yogas.push({ key: 'chandraMangala' });
  const MAHA = { mars: 'ruchaka', mercury: 'bhadra', jupiter: 'hamsa', venus: 'malavya', saturn: 'sasa' };
  for (const [k, y] of Object.entries(MAHA)) {
    const d = dignity(k, by[k].sign);
    if ((d === 'own' || d === 'exalted') && KENDRA.includes(house(k))) yogas.push({ key: y });
  }
  // Yogakarakan: one planet ruling a kendra and a trikona (other than the 1st)
  for (const k of ['mars', 'venus', 'saturn', 'jupiter', 'mercury', 'moon', 'sun']) {
    const o = owns(k);
    if (o.some((h) => [4, 7, 10].includes(h)) && o.some((h) => [5, 9].includes(h))) yogas.push({ key: 'yogakaraka', planets: [k] });
  }
  // Raja yogam: a kendra lord and a trikona lord (different planets) in the same sign
  const seven = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
  const pairs = (a, b) => {
    const out = [];
    for (const x of seven)
      for (const y of seven)
        if (x < y && by[x].sign === by[y].sign && ((a(x) && b(y)) || (a(y) && b(x)))) out.push([x, y]);
    return out;
  };
  const isKendraL = (k) => owns(k).some((h) => [4, 7, 10].includes(h));
  const isTrikonaL = (k) => owns(k).some((h) => [1, 5, 9].includes(h));
  for (const pr of pairs(isKendraL, isTrikonaL)) yogas.push({ key: 'raja', planets: pr });
  const isDhanaL = (k) => owns(k).some((h) => [2, 11].includes(h));
  const isBhagyaL = (k) => owns(k).some((h) => [5, 9].includes(h));
  for (const pr of pairs(isDhanaL, isBhagyaL)) yogas.push({ key: 'dhana', planets: pr });
  // Parivarthana: exchange of signs
  for (const x of seven)
    for (const y of seven)
      if (x < y && SIGN_LORDS[by[x].sign] === y && SIGN_LORDS[by[y].sign] === x)
        yogas.push({ key: 'parivarthana', planets: [x, y], houses: [house(x), house(y)] });
  // Neecha bhanga: debilitated planet whose sign lord is in a kendra from lagnam or Moon
  for (const k of seven) {
    if (dignity(k, by[k].sign) !== 'debilitated') continue;
    const l = SIGN_LORDS[by[k].sign];
    if (KENDRA.includes(house(l)) || KENDRA.includes(houseOf(by[l].sign, moonSign))) yogas.push({ key: 'neechaBhanga', planets: [k] });
  }
  return { lag, by, house, lordOf, owns, occupants, aspectsOn, yogas };
}

const T = {
  en: {
    note: 'Traditional interpretation, not a tested forecast. These are Tamil astrology rules applied to your chart; the timings below have not been shown to predict events better than chance (see the Bayesian tab and the FAQ). Please don’t base health, money, marriage or career decisions on them.',
    techTitle: 'For astrologers: technical details',
    excluded: 'Health readings are general wellbeing guidance only, never a diagnosis. Lifespan and dosham verdicts are not covered here (see the Dosham tab).',
    sec: { highlights: 'Key points', nature: 'Nature and temperament', dasa: 'Your current period (dasa / bhukti)', gochara: 'Transits today (gocharam)', yogas: 'Yogams in your chart', areas: 'Areas of life', houses: 'House by house', planets: 'Planet by planet' },
    lagnam: (s, tr) => `Lagnam in ${s}: tradition describes the personality as ${tr}.`,
    lagnaLord: (l, h, ph) => `Your lagna lord ${l} sits in the ${ord(h)} house, so your life’s focus traditionally turns towards ${ph}.`,
    rasi: (s, tr) => `Moon in ${s} (your rasi): the mind and emotions are traditionally ${tr}.`,
    nak: (n, p, tr, lord) => `Born in ${n} nakshatram, padam ${p}: traditionally ${tr}. Its lord ${lord} sets your dasa sequence.`,
    join: ' ',
    rules: (l, hs) => `${l} rules your ${hs}`,
    actsAs: (l, sl) => `${l} acts for its sign lord ${sl}`,
    placed: (h, th) => `and sits in the ${ord(h)} house (${th})`,
    dasaNow: (l, r) => `You are in ${l} mahadasa (${r}).`,
    dasaExpect: (rule, th) => `${rule}. Tradition expects this period to bring forward ${th}.`,
    dasaGeneral: (l, th) => `In general, ${l} dasa is associated with ${th}.`,
    dasaStrength: { exalted: 'Its lord is exalted — traditionally a strong, productive period.', own: 'Its lord is in its own sign — traditionally a well-supported period.', debilitated: 'Its lord is debilitated — traditionally results come with effort and some delay.' },
    bhuktiNow: 'Current bhukti',
    bhuktiNext: 'Coming bhuktis',
    bhukti: (b, r, rule, th) => `${r}: ${b} bhukti — ${rule}. Focus: ${th}.`,
    next: (l, r, th) => `Next mahadasa: ${l} (${r}) — traditionally ${th}.`,
    noDasa: 'The current date is outside the computed dasa sequence.',
    houses: (hs) => (hs.length === 1 ? `${ord(hs[0])} house` : `${hs.slice(0, -1).map(ord).join(', ')} and ${ord(hs.at(-1))} houses`),
    since: (a, b) => `(${a} → about ${b})`,
    sadeNext: (d) => `Ezharai Sani (7½-year Saturn) is not running now; the next one traditionally begins around ${d}.`,
    sadeSpan: (a, b) => `Runs from about ${a} to ${b}.`,
    yogaNone: 'None of the commonly listed yogams are formed. Tradition says the dasa periods of well-placed planets still bring their own results.',
    area: (h, sign, lord, lh, lth) => `Your ${ord(h)} house is ${sign}; its lord ${lord} sits in the ${ord(lh)} house, so these matters ${lth}.`,
    occupants: (list) => `Planets in this house: ${list}.`,
    aspected: (list) => `Aspected by ${list}.`,
    guruAspect: 'Guru’s aspect is traditionally protective here.',
    saniAspect: 'Sani’s aspect traditionally brings delay but durable results.',
    timing: (list) => `Periods traditionally linked with this: ${list}.`,
    areas: { career: 'Career (10th house)', marriage: 'Marriage (7th house)', children: 'Children (5th house)', education: 'Education (4th & 5th)', wealth: 'Wealth (2nd & 11th)', home: 'Home and property (4th house)' },
    houseLine: (h, hs, lord, lh, phrase, dig) => `${ord(h)} house (${hs}): lord ${lord} in the ${ord(lh)} — ${hs} ${phrase}.${dig}`,
    place: (p, k, h, th) => `${p} (${k}) is in your ${ord(h)} house — ${th}.`,
    benefic: 'Traditionally supportive here.',
    malefic: 'Traditionally an area of effort and testing, where results come through persistence.',
    upachaya: (h) => `Malefics in the ${ord(h)} house are traditionally favourable — they give the drive to overcome and grow.`,
    exalted: (p, s) => ` ${p} is exalted (uchcham) in ${s} — traditionally its strongest state.`,
    own: (p, s) => ` ${p} is in its own sign (aatchi), ${s} — traditionally strong.`,
    debilitated: (p, s) => ` ${p} is debilitated (neecham) in ${s} — traditionally results come with delay or after effort.`,
    retro: (p) => ` ${p} is vakram — traditionally its matters are revisited or come later.`,
    hlStrong: (list) => `Strong planets: ${list}.`,
    hlYogas: (list) => `Yogams: ${list}.`,
    hlDasa: (d, b, until) => `Running ${d} dasa – ${b} bhukti until ${until}.`,
    hlCareer: (l, h) => `Career lord ${l} in the ${ord(h)} house.`,
    hlMarriage: (l, h) => `Marriage lord ${l} in the ${ord(h)} house.`,
  },
  ta: {
    note: 'பாரம்பரிய விளக்கம்; சோதிக்கப்பட்ட கணிப்பு அல்ல. இவை உங்கள் ஜாதகத்துக்குப் பொருத்திய தமிழ் ஜோதிட விதிகள்; கீழுள்ள காலங்கள் தற்செயலை விடச் சிறப்பாக நிகழ்வுகளைக் கணிக்கும் என்று காட்டப்படவில்லை (பேய்சியன் பகுதி, கேள்வி-பதில் பார்க்கவும்). உடல்நலம், பணம், திருமணம், தொழில் முடிவுகளை இவற்றின் அடிப்படையில் எடுக்க வேண்டாம்.',
    techTitle: 'ஜோதிடர்களுக்கு: தொழில்நுட்ப விவரங்கள்',
    excluded: 'உடல்நலப் பலன்கள் பொதுவான நல்வாழ்வு வழிகாட்டல் மட்டுமே; நோய் கண்டறிதல் அல்ல. ஆயுள், தோஷ தீர்ப்புகள் இங்கு இல்லை (தோஷம் பகுதியைப் பார்க்கவும்).',
    sec: { highlights: 'முக்கிய அம்சங்கள்', nature: 'குணமும் இயல்பும்', dasa: 'நடப்பு காலம் (தசை / புக்தி)', gochara: 'இன்றைய கோசாரம்', yogas: 'உங்கள் ஜாதகத்தில் யோகங்கள்', areas: 'வாழ்க்கைப் பகுதிகள்', houses: 'வீடு வாரியாக', planets: 'கிரக வாரியாக' },
    lagnam: (s, tr) => `லக்னம் ${s}: பாரம்பரியமாக குணம் — ${tr}.`,
    lagnaLord: (l, h, ph) => `லக்னாதிபதி ${l} ${h}-ஆம் வீட்டில் உள்ளதால், வாழ்க்கையின் கவனம் பாரம்பரியமாக ${ph} நோக்கித் திரும்பும்.`,
    rasi: (s, tr) => `சந்திரன் ${s} ராசியில் (உங்கள் ராசி): மனமும் உணர்வுகளும் பாரம்பரியமாக — ${tr}.`,
    nak: (n, p, tr, lord) => `${n} நட்சத்திரம், ${p}-ஆம் பாதம்: பாரம்பரியமாக ${tr}. நட்சத்திர அதிபதி ${lord} உங்கள் தசா வரிசையைத் தொடங்குகிறார்.`,
    join: '; ',
    rules: (l, hs) => `${l} உங்கள் ${hs} அதிபதி`,
    actsAs: (l, sl) => `${l} தான் இருக்கும் ராசியின் அதிபதி ${sl} போல் செயல்படும்`,
    placed: (h, th) => `${h}-ஆம் வீட்டில் (${th}) உள்ளார்`,
    dasaNow: (l, r) => `நீங்கள் ${l} மகா தசையில் இருக்கிறீர்கள் (${r}).`,
    dasaExpect: (rule, th) => `${rule}. இந்தக் காலம் பாரம்பரியமாக ${th} ஆகியவற்றை முன்னுக்குக் கொண்டுவரும்.`,
    dasaGeneral: (l, th) => `பொதுவாக ${l} தசை ${th} ஆகியவற்றுடன் தொடர்புடையது.`,
    dasaStrength: { exalted: 'தசா நாதன் உச்சம் — பாரம்பரியமாக வலுவான, பலன் தரும் காலம்.', own: 'தசா நாதன் ஆட்சி — பாரம்பரியமாக நல்ல ஆதரவுள்ள காலம்.', debilitated: 'தசா நாதன் நீசம் — பாரம்பரியமாக முயற்சிக்குப் பின், சிறு தாமதத்துடன் பலன்.' },
    bhuktiNow: 'நடப்பு புக்தி',
    bhuktiNext: 'அடுத்து வரும் புக்திகள்',
    bhukti: (b, r, rule, th) => `${r}: ${b} புக்தி — ${rule}. கவனம்: ${th}.`,
    next: (l, r, th) => `அடுத்த மகா தசை: ${l} (${r}) — பாரம்பரியமாக ${th}.`,
    noDasa: 'இன்றைய தேதி கணிக்கப்பட்ட தசா வரிசைக்கு வெளியே உள்ளது.',
    houses: (hs) => `${hs.join(', ')}-ஆம் வீடுகளுக்கு`.replace(/வீடுகளுக்கு$/, hs.length === 1 ? 'வீட்டுக்கு' : 'வீடுகளுக்கு'),
    since: (a, b) => `(${a} → சுமார் ${b})`,
    sadeNext: (d) => `ஏழரைச் சனி இப்போது நடக்கவில்லை; அடுத்தது பாரம்பரியமாக சுமார் ${d} அன்று தொடங்கும்.`,
    sadeSpan: (a, b) => `சுமார் ${a} முதல் ${b} வரை.`,
    yogaNone: 'பொதுவாகக் குறிப்பிடப்படும் யோகங்கள் எதுவும் அமையவில்லை. நல்ல நிலையில் உள்ள கிரகங்களின் தசா காலங்கள் தங்கள் பலனைத் தரும் என்பது பாரம்பரியம்.',
    area: (h, sign, lord, lh, lth) => `${h}-ஆம் வீடு ${sign}; அதிபதி ${lord} ${lh}-ஆம் வீட்டில் — இந்த விஷயங்கள் ${lth}.`,
    occupants: (list) => `இந்த வீட்டில் உள்ள கிரகங்கள்: ${list}.`,
    aspected: (list) => `பார்வை: ${list}.`,
    guruAspect: 'குருவின் பார்வை பாரம்பரியமாக இங்கு பாதுகாப்பு தரும்.',
    saniAspect: 'சனியின் பார்வை பாரம்பரியமாக தாமதம் தரும், ஆனால் நீடித்த பலன்.',
    timing: (list) => `பாரம்பரியமாக இதற்குத் தொடர்புடைய காலங்கள்: ${list}.`,
    areas: { career: 'தொழில் (10-ஆம் வீடு)', marriage: 'திருமணம் (7-ஆம் வீடு)', children: 'குழந்தைகள் (5-ஆம் வீடு)', education: 'கல்வி (4, 5-ஆம் வீடுகள்)', wealth: 'செல்வம் (2, 11-ஆம் வீடுகள்)', home: 'வீடு, சொத்து (4-ஆம் வீடு)' },
    houseLine: (h, hs, lord, lh, phrase, dig) => `${h}-ஆம் வீடு (${hs}): அதிபதி ${lord} ${lh}-இல் — ${hs} விஷயங்கள் ${phrase}.${dig}`,
    place: (p, k, h, th) => `${p} (${k}) உங்கள் ${h}-ஆம் வீட்டில் — ${th}.`,
    benefic: 'பாரம்பரியமாக இங்கு சாதகம்.',
    malefic: 'பாரம்பரியமாக முயற்சியும் சோதனையும் உள்ள பகுதி — விடாமுயற்சியால் பலன்.',
    upachaya: (h) => `${h}-ஆம் வீட்டில் பாவ கிரகங்கள் பாரம்பரியமாக நல்லது — தடைகளை வென்று வளர உந்துதல் தரும்.`,
    exalted: (p, s) => ` ${p} ${s} ராசியில் உச்சம் — பாரம்பரியமாக மிக வலுவான நிலை.`,
    own: (p, s) => ` ${p} சொந்த ராசியான ${s} ராசியில் ஆட்சி — பாரம்பரியமாக வலுவான நிலை.`,
    debilitated: (p, s) => ` ${p} ${s} ராசியில் நீசம் — பாரம்பரியமாக பலன்கள் தாமதமாகவோ முயற்சிக்குப் பின்னரோ கிடைக்கும்.`,
    retro: (p) => ` ${p} வக்ரம் — பாரம்பரியமாக இதன் விஷயங்கள் மீண்டும் கவனத்துக்கு வரும் அல்லது தாமதமாகக் கிடைக்கும்.`,
    hlStrong: (list) => `பலமான கிரகங்கள்: ${list}.`,
    hlYogas: (list) => `யோகங்கள்: ${list}.`,
    hlDasa: (d, b, until) => `${d} தசை – ${b} புக்தி, ${until} வரை.`,
    hlCareer: (l, h) => `தொழில் அதிபதி ${l} ${h}-ஆம் வீட்டில்.`,
    hlMarriage: (l, h) => `திருமண அதிபதி ${l} ${h}-ஆம் வீட்டில்.`,
  },
};

/**
 * @param {object} chart result of computeChart()
 * @param {'ta'|'en'} lang
 * @param {(start: Date, end: Date) => string} fmtRange date range formatter
 * @param {Date} [now]
 * @param {(d: Date) => string} [fmtDate] single date formatter
 * @returns {{note: string, excluded: string, sections: {key: string, title: string, items: string[]}[]}}
 */
export function generatePalan(chart, lang, fmtRange, now = new Date(), fmtDate = (d) => d.toISOString().slice(0, 10), fmtMonth = null, system = 'parasari') {
  const t = T[lang];
  const g = (k) => NAMES.graha[lang][k];
  const sign = (i) => NAMES.rasi[lang][i];
  const A = analyse(chart);
  const { lag, by, house, lordOf, owns, occupants, aspectsOn } = A;
  const s = chart.summary;
  const hs = (h) => HOUSE_SHORT[h][lang];
  const digText = (k) => {
    const d = dignity(k, by[k].sign);
    return d ? t[d](g(k), sign(by[k].sign)) : '';
  };

  // Rule description for a dasa/bhukti lord (lordship + placement)
  const ruleOf = (k) => {
    if (k === 'rahu' || k === 'ketu') {
      const sl = SIGN_LORDS[by[k].sign];
      return `${t.actsAs(g(k), g(sl))}${t.join}${t.placed(house(k), hs(house(k)))}`;
    }
    return `${t.rules(g(k), t.houses(owns(k)))}${t.join}${t.placed(house(k), hs(house(k)))}`;
  };
  const themesOf = (k) => {
    const hsList = k === 'rahu' || k === 'ketu' ? [house(k)] : [...owns(k), house(k)];
    return [...new Set(hsList)].map(hs).join('; ');
  };

  // ---------------- dasa
  const dasa = [];
  const act = activePeriod(chart.dasa, now);
  if (act) {
    const L = act.dasa.lord;
    dasa.push(t.dasaNow(g(L), fmtRange(act.dasa.start, act.dasa.end)));
    dasa.push(t.dasaExpect(ruleOf(L), themesOf(L)));
    dasa.push(t.dasaGeneral(g(L), DASA_THEME[L][lang]));
    const dg = dignity(L, by[L].sign);
    if (dg) dasa.push(t.dasaStrength[dg]);
    const all = chart.dasa.periods.flatMap((p) => p.bhuktis.map((b) => ({ ...b, dasaLord: p.lord })));
    const bi = all.findIndex((b) => b.start <= now && now < b.end);
    all.slice(bi, bi + 4).forEach((b, i) => {
      const label = i === 0 ? `${t.bhuktiNow} · ` : '';
      dasa.push(label + t.bhukti(`${g(b.dasaLord)}–${g(b.lord)}`, fmtRange(b.start, b.end), ruleOf(b.lord), themesOf(b.lord)));
    });
    const i = chart.dasa.periods.indexOf(act.dasa);
    const nx = chart.dasa.periods[i + 1];
    if (nx) dasa.push(t.next(g(nx.lord), fmtRange(nx.start, nx.end), DASA_THEME[nx.lord][lang]));
  } else dasa.push(t.noDasa);

  // ---------------- gocharam (transits now, from the Moon sign)
  const go = gocharam(s.rasi, now);
  const gochara = [];
  const span = (x) => (x.since && x.until ? ` ${t.since(fmtDate(x.since), fmtDate(x.until))}` : '');
  const st = go.saturn;
  const sh = st.house;
  const hTxt = (h) => (lang === 'en' ? ord(h) : String(h));
  let satLine;
  if (go.sadeSati.active) satLine = `${GOCHARA.saturn.sade[go.sadeSati.phase][lang]} ${t.sadeSpan(fmtDate(go.sadeSati.start), fmtDate(go.sadeSati.end))}`;
  else if (sh === 4 || sh === 8) satLine = GOCHARA.saturn[sh][lang];
  else satLine = fill(GOCHARA.saturn[[3, 6, 11].includes(sh) ? 'good' : 'mixed'][lang], { h: hTxt(sh) });
  gochara.push(`${g('saturn')} → ${sign(st.sign)}${span(st)}: ${satLine}`);
  if (!go.sadeSati.active && go.sadeSati.nextStart) gochara.push(t.sadeNext(fmtDate(go.sadeSati.nextStart)));
  const jt = go.jupiter;
  gochara.push(`${g('jupiter')} → ${sign(jt.sign)}${span(jt)}: ${fill(GOCHARA.jupiter[[2, 5, 7, 9, 11].includes(jt.house) ? 'good' : 'weak'][lang], { h: hTxt(jt.house) })}`);
  const rt = go.rahu;
  gochara.push(`${g('rahu')} → ${sign(rt.sign)}${span(rt)}: ${fill(GOCHARA.rahu[[3, 6, 11].includes(rt.house) ? 'good' : 'weak'][lang], { h: hTxt(rt.house) })}`);

  // ---------------- yogas
  const yogaName = (y) => YOGA[y.key].name[lang];
  const yogas = A.yogas.length
    ? A.yogas.map((y) => {
        const p = (y.planets || []).map(g).join(lang === 'en' ? ' + ' : ' + ');
        const h = y.houses ? (lang === 'en' ? `${hs(y.houses[0])} and ${hs(y.houses[1])}` : `${hs(y.houses[0])}, ${hs(y.houses[1])}`) : '';
        return `${yogaName(y)} — ${fill(YOGA[y.key][lang], { p, h })}`;
      })
    : [t.yogaNone];

  // ---------------- life areas, with timing from future dasa/bhuktis
  const birth = chart.input.utc;
  const age = (d) => (d - birth) / (365.25 * 86400000);
  const future = chart.dasa.periods.flatMap((p) => p.bhuktis.map((b) => ({ ...b, dasaLord: p.lord }))).filter((b) => b.end > now);
  const timingFor = (lords, minAge, maxAge) => {
    const list = future
      .filter((b) => lords.includes(b.lord) && age(b.start) <= maxAge && age(b.end) >= minAge)
      .slice(0, 3)
      .map((b) => `${g(b.dasaLord)}–${g(b.lord)} (${fmtRange(b.start, b.end)})`);
    return list.length ? t.timing(list.join('; ')) : '';
  };
  const area = (name, houses, karakas, timing) => {
    const parts = [];
    for (const h of houses) {
      const sg = (lag + h - 1) % 12;
      const lord = SIGN_LORDS[sg];
      const lh = house(lord);
      parts.push(t.area(h, sign(sg), g(lord), lh, LORD_IN[lh][lang]) + digText(lord));
      const occ = occupants(h);
      if (occ.length) parts.push(t.occupants(occ.map((k) => `${g(k)} (${KARAKA[k][lang]})`).join('; ')));
      const asp = aspectsOn(h).filter((k) => !occ.includes(k));
      if (asp.length) {
        parts.push(t.aspected(asp.map(g).join(', ')));
        if (asp.includes('jupiter')) parts.push(t.guruAspect);
        if (asp.includes('saturn')) parts.push(t.saniAspect);
      }
    }
    for (const k of karakas) parts.push(t.place(g(k), KARAKA[k][lang], house(k), hs(house(k))));
    if (timing) parts.push(timing);
    return `${name} — ${parts.join(' ')}`;
  };
  const l7 = lordOf(7);
  const l10 = lordOf(10);
  const l5 = lordOf(5);
  const areas = [
    area(t.areas.career, [10], ['sun', 'saturn'], timingFor([l10, ...occupants(10)], 18, 65)),
    area(t.areas.marriage, [7], ['venus'], timingFor([l7, 'venus', ...occupants(7)], 20, 40)),
    area(t.areas.children, [5], ['jupiter'], timingFor([l5, 'jupiter'], 22, 45)),
    area(t.areas.education, [4, 5], ['mercury'], ''),
    area(t.areas.wealth, [2, 11], [], timingFor([lordOf(2), lordOf(11)], 18, 80)),
    area(t.areas.home, [4], ['mars'], ''),
  ];

  // ---------------- house by house (bhava lords)
  const housesSec = [...Array(12).keys()].map((i) => {
    const h = i + 1;
    const lord = lordOf(h);
    return t.houseLine(h, hs(h), g(lord), lang === 'en' ? house(lord) : house(lord), LORD_IN[house(lord)][lang], digText(lord));
  });

  // ---------------- planet by planet
  const planets = chart.planets.map((p) => {
    const h = house(p.key);
    let line = t.place(g(p.key), KARAKA[p.key][lang], h, HOUSE[h][lang]) + ' ';
    if (BENEFICS.has(p.key)) line += t.benefic;
    else if (UPACHAYA.has(h)) line += t.upachaya(h);
    else line += t.malefic;
    line += digText(p.key);
    if (p.retro && p.key !== 'rahu' && p.key !== 'ketu') line += t.retro(g(p.key));
    return line;
  });

  const plain = plainPalan(chart, A, go, lang, fmtRange, fmtDate, now, fmtMonth, system);
  return {
    note: t.note,
    excluded: t.excluded,
    techTitle: t.techTitle,
    sections: [
      ...plain,
      { key: 'dasa', title: t.sec.dasa, items: dasa, technical: true },
      { key: 'gochara', title: t.sec.gochara, items: gochara, technical: true },
      { key: 'yogas', title: t.sec.yogas, items: yogas, technical: true },
      { key: 'areasTech', title: t.sec.areas, items: areas, technical: true },
      { key: 'houses', title: t.sec.houses, items: housesSec, technical: true },
      { key: 'planets', title: t.sec.planets, items: planets, technical: true },
    ],
  };
}
