import '@fontsource/noto-sans-tamil/400.css';
import '@fontsource/noto-sans-tamil/600.css';
import '@fontsource/noto-sans-tamil/700.css';
import './style.css';
import { DateTime } from 'luxon';
import { computeChart, localToUtc, zoneFor, offsetZone, parseClock, activePeriod, yearsToYMD, dms } from './engine/index.js';
import { NAMES, UI, PUI, DUI, TUI, BUI, thithiName } from './i18n.js';
import { southIndianChart } from './ui/chart.js';
import { attachAutocomplete, parseCoords } from './ui/geocode.js';
import { generatePalan } from './palan/index.js';
import { initPorutham } from './ui/porutham.js';
import { initDosham } from './ui/dosham.js';
import { openTempleCard } from './ui/templeCard.js';
import { initToday } from './ui/today.js';
import { initBayes } from './ui/bayes.js';
import { initGlossary } from './ui/glossary.js';
import { INTROS, CARD_HELP, FAQ, GLOSSARY } from './help.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const state = {
  lang: navigator.language?.startsWith('ta') ? 'ta' : 'en',
  place: null, // {label, lat, lon}
  last: null, // last computed {chart, meta}
  showPalan: false,
  palanSystem: 'parasari', // 'parasari' | 'kp'
  palanSystemChosen: false, // true once the reader picks one
  bayesWinner: null, // set by the Bayesian tab when one system clearly fits better
};
const help = (k) => CARD_HELP[state.lang][k];
const t = (k) => UI[state.lang][k] ?? PUI[state.lang][k] ?? DUI[state.lang][k] ?? TUI[state.lang][k] ?? BUI[state.lang][k] ?? k;
// Matches the 640px breakpoint in style.css: palan sections start collapsed below it.
const isMobile = () => window.matchMedia('(max-width: 639px)').matches;
const nm = (table, i) => NAMES[table][state.lang][i];

// ---------------------------------------------------------------- i18n
function applyLang() {
  document.documentElement.lang = state.lang;
  document.body.dataset.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => (el.placeholder = t(el.dataset.i18nPlaceholder)));
  $('lang-toggle').textContent = t('lang');
  renderIntros();
  renderFaq();
  porutham.relabel();
  dosham.relabel();
  today.relabel();
  bayes.relabel();
  if (state.last) renderResults(state.last);
}
$('lang-toggle').addEventListener('click', () => {
  state.lang = state.lang === 'ta' ? 'en' : 'ta';
  // Expand every dasa for printing (also when printing from the browser menu).
let closedForPrint = [];
window.addEventListener('beforeprint', () => {
  closedForPrint = [...document.querySelectorAll('details.dasa:not([open]), details.palan-sec:not([open]), details.palan-tech:not([open])')];
  closedForPrint.forEach((d) => (d.open = true));
});
window.addEventListener('afterprint', () => closedForPrint.forEach((d) => (d.open = false)));

initGlossary(document.querySelector('main'), () => state.lang, () => ({ close: t('close'), more: t('allTerms') }));
applyLang();
});

// ---------------------------------------------------------------- views
const porutham = initPorutham($('porutham-view'), { lang: () => state.lang, t });
const dosham = initDosham($('dosham-view'), { lang: () => state.lang, t });
const today = initToday($('today-view'), { lang: () => state.lang, t });
// "Use this time" from the Bayesian tab: fill the main form and cast the chart
function useCorrectedTime(dt, b) {
  const f = $('birth-form');
  f.date.value = dt.toISODate();
  const h = dt.hour;
  f.hh.value = String(h % 12 === 0 ? 12 : h % 12);
  f.mm.value = String(dt.minute).padStart(2, '0');
  f.ampm.value = h < 12 ? 'am' : 'pm';
  f.lat.value = b.lat.toFixed(4);
  f.lon.value = b.lon.toFixed(4);
  if (b.name) f.name.value = b.name;
  location.hash = '#jathagam';
  setTimeout(() => f.requestSubmit(), 50);
}
const bayes = initBayes($('bayes-view'), {
  lang: () => state.lang,
  t,
  useTime: useCorrectedTime,
  // remember which rule system fits this person better, for the Palan tab
  setWinner: (sys) => {
    state.bayesWinner = sys;
    if (sys && !state.palanSystemChosen) state.palanSystem = sys;
  },
  setSummary: (sum, remember) => {
    state.bayesSummary = sum;
    try {
      if (remember) localStorage.setItem(SUMMARY_STORE, JSON.stringify(sum));
      else localStorage.removeItem(SUMMARY_STORE);
    } catch {
      /* storage unavailable */
    }
  },
});

// Bayesian result for the chart shown on the Palan tab (same birth chart only)
const SUMMARY_STORE = 'jathagam.bayes.summary.v1';
function bayesSummaryFor(chart) {
  let sum = state.bayesSummary;
  if (!sum) {
    try {
      sum = JSON.parse(localStorage.getItem(SUMMARY_STORE) || 'null');
    } catch {
      sum = null;
    }
  }
  if (!sum) return null;
  const same = Math.abs(sum.utc - chart.input.utc.getTime()) < 60 * 60000 && Math.abs(sum.lat - chart.input.lat) < 0.5 && Math.abs(sum.lon - chart.input.lon) < 0.5;
  if (!same) return null;
  if (sum.winner && !state.bayesWinner) {
    state.bayesWinner = sum.winner;
    if (!state.palanSystemChosen) state.palanSystem = sum.winner;
  }
  return sum;
}
function bayesBanner(chart) {
  const sum = bayesSummaryFor(chart);
  const fmt = (x) => (x >= 10 ? x.toFixed(1) : x.toFixed(2));
  if (!sum) return `<div class="bayes-banner"><p>${t('bbTry')}</p><a href="#bayes" class="btn-ghost dark">${t('bbTryBtn')}</a></div>`;
  const v = sum.avgBF > 20 ? 'strong' : sum.avgBF > 3 ? 'moderate' : sum.avgBF < 1 / 3 ? 'against' : 'none';
  return `<div class="bayes-banner b-${v}"><p><strong>${t('bbResult')[v](fmt(sum.avgBF), Math.round(sum.lambda * 100))}</strong></p><a href="#bayes">${t('bbSee')}</a></div>`;
}
const VIEWS = ['jathagam', 'today', 'porutham', 'dosham', 'bayes', 'faq'];

// "What is this?" boxes: one per view; the jathagam one follows the active tab
for (const v of ['today', 'porutham', 'dosham', 'bayes', 'faq']) {
  const d = document.createElement('div');
  d.className = 'intro-slot';
  d.dataset.intro = v;
  $(`${v}-view`).prepend(d);
}
function renderIntros() {
  document.querySelectorAll('.intro-slot').forEach((el) => {
    const items = INTROS[state.lang][el.dataset.intro] || [];
    el.innerHTML = `<details class="intro" open><summary>${t('whatIsThis')}</summary><ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p class="intro-tip">${t('tapWords')}</p></details>`;
  });
}
function renderFaq() {
  const L = state.lang;
  const terms = Object.values(GLOSSARY)
    .map((g) => `<dt>${esc(g.forms[0])}${g.forms.length > 1 ? ` · ${esc(g.forms.at(-1))}` : ''}</dt><dd>${esc(g[L])}</dd>`)
    .join('');
  $('faq-body').innerHTML = `
    <div class="card"><h2>${t('faqTitle')}</h2>
      ${FAQ[L].map(([q, a]) => `<details class="faq-item"><summary>${esc(q)}</summary><ul>${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`).join('')}
    </div>
    <div class="card"><h2>${t('termsTitle')}</h2><dl class="gloss-list">${terms}</dl></div>`;
}
// #palan and #temple are the jathagam page with the palan open / the temple card shown
const ON_JATHAGAM = ['palan', 'temple'];
function route() {
  const h = location.hash.slice(1);
  const tab = ON_JATHAGAM.includes(h) || VIEWS.includes(h) ? h : 'jathagam';
  const view = ON_JATHAGAM.includes(tab) ? 'jathagam' : tab;
  $('jathagam-intro').dataset.intro = tab === 'palan' || tab === 'temple' ? tab : 'jathagam';
  renderIntros();
  for (const v of VIEWS) $(`${v}-view`).hidden = v !== view;
  $('palan-hint').hidden = !(tab === 'palan' && !state.last);
  $('temple-hint').hidden = !(tab === 'temple' && !state.last);
  if (tab === 'temple' && state.last) openTempleCard(state.last.chart, state.last.meta.name, state.lang);
  if (tab === 'palan' && state.last && !state.showPalan) {
    state.showPalan = true;
    renderResults(state.last);
    requestAnimationFrame(() => $('palan')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  document.querySelectorAll('.tabs a').forEach((a) => a.setAttribute('aria-current', a.dataset.view === tab ? 'page' : 'false'));
}
window.addEventListener('hashchange', route);
route();

// ---------------------------------------------------------------- place
attachAutocomplete(
  $('f-place'),
  $('place-list'),
  (p) => {
    state.place = p;
    $('f-lat').value = p.lat.toFixed(4);
    $('f-lon').value = p.lon.toFixed(4);
    $('place-picked').textContent = `${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}`;
    $('form-error').textContent = '';
  },
  () => {
    $('form-error').textContent = t('geoError');
    document.querySelector('details.more').open = true;
  }
);
$('f-place').addEventListener('input', () => {
  if (parseCoords($('f-place').value)) return; // pasted coordinates were already applied
  state.place = null;
  $('place-picked').textContent = '';
});

// ---------------------------------------------------------------- submit
$('birth-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const err = $('form-error');
  err.textContent = '';
  const f = e.target;
  const [y, mo, d] = (f.date.value || '').split('-').map(Number);
  const clock = parseClock(f.hh.value, f.mm.value, f.ampm.value);
  if (!y || !mo || !d || !clock) {
    err.textContent = t('badTime');
    return;
  }
  const hh = clock.hour;
  const mm = clock.minute;

  const lat = parseFloat(f.lat.value);
  const lon = parseFloat(f.lon.value);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    err.textContent = t('noPlace');
    return;
  }

  const zone = f.tz.value === 'auto' ? zoneFor(lat, lon) : offsetZone(Number(f.tz.value));
  const conv = localToUtc({ year: y, month: mo, day: d, hour: hh, minute: mm }, zone);
  if (!conv.valid) {
    err.textContent = t('badTime');
    return;
  }
  const chart = computeChart({ utc: conv.utc, lat, lon }, { node: f.node.value });
  state.last = {
    chart,
    meta: {
      name: f.name.value.trim(),
      place: state.place?.label || f.place.value.trim(),
      lat,
      lon,
      zone,
      conv,
    },
  };
  state.showPalan = location.hash === '#palan';
  $('palan-hint').hidden = true;
  $('temple-hint').hidden = true;
  renderResults(state.last);
  if (location.hash === '#temple') openTempleCard(chart, state.last.meta.name, state.lang);
  $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ---------------------------------------------------------------- render
const fmtDeg = (deg) => {
  const { d, m, s } = dms(deg);
  return `${d}°${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″`;
};
const fmtOffset = (min) => {
  const s = min < 0 ? '−' : '+';
  const a = Math.abs(min);
  return `UTC${s}${Math.floor(a / 60)}:${String(a % 60).padStart(2, '0')}`;
};

function renderResults({ chart, meta }) {
  const L = state.lang;
  const zone = meta.zone;
  const dt = (date, fmt) => DateTime.fromJSDate(date, { zone }).setLocale(L === 'ta' ? 'ta-IN' : 'en-GB').toFormat(fmt);
  const local = DateTime.fromJSDate(meta.conv.utc, { zone });
  const dateLine = local.toFormat('dd-MM-yyyy, hh:mm a');
  const s = chart.summary;
  const gName = (k) => NAMES.graha[L][k];
  const gLabel = (k) => (L === 'en' ? `${gName(k)} <span class="gloss">(${NAMES.grahaGloss[k]})</span>` : gName(k));

  // --- verification strip
  const note = meta.conv.note === 'nonexistent' ? t('gap') : meta.conv.note === 'ambiguous' ? t('ambiguous') : '';
  const verify = `
    <div class="card verify">
      <h2>${t('verify')}</h2>
      <p class="card-help">${help('verify')}</p>
      <dl class="kv">
        <dt>${t('pob')}</dt><dd>${esc(meta.place || '—')}</dd>
        <dt>${t('coords')}</dt><dd>${meta.lat.toFixed(4)}°, ${meta.lon.toFixed(4)}°</dd>
        <dt>${t('timezone')}</dt><dd>${esc(zone)} (${fmtOffset(meta.conv.offsetMinutes)})</dd>
        <dt>${t('localTime')}</dt><dd>${local.toFormat('yyyy-MM-dd HH:mm')}</dd>
        <dt>${t('utcTime')}</dt><dd>${DateTime.fromJSDate(meta.conv.utc, { zone: 'utc' }).toFormat('yyyy-MM-dd HH:mm')} UTC</dd>
        <dt>${t('ayanamsa')}</dt><dd>${fmtDeg(chart.ayanamsa)}</dd>
      </dl>
      ${note ? `<p class="warn">${note}</p>` : ''}
    </div>`;

  // --- summary
  const summary = `
    <div class="card summary">
      <h2>${meta.name ? esc(meta.name) : t('summary')}</h2>
      <p class="sub">${dateLine} · ${esc(meta.place || `${meta.lat.toFixed(2)}, ${meta.lon.toFixed(2)}`)}</p>
      <p class="card-help">${help('summary')}</p>
      <div class="tiles">
        <div class="tile"><span>${t('rasi')}</span><strong>${nm('rasi', s.rasi)}</strong></div>
        <div class="tile"><span>${t('nakshatra')}</span><strong>${nm('nakshatra', s.nakshatra)}</strong><em>${t('pada')} ${s.pada}</em></div>
        <div class="tile"><span>${t('lagnam')}</span><strong>${nm('rasi', s.lagnam)}</strong></div>
        <div class="tile"><span>${t('rasiLord')}</span><strong>${gName(s.rasiLord)}</strong></div>
        <div class="tile"><span>${t('nakLord')}</span><strong>${gName(s.nakshatraLord)}</strong></div>
      </div>
      <button type="button" class="btn-temple no-print" id="btn-temple">🙏 ${t('templeCard')}</button>
    </div>`;

  // --- charts
  const retroMark = L === 'ta' ? '(வ)' : '(R)';
  const boxes = (signOf) => {
    const b = Array.from({ length: 12 }, () => []);
    b[signOf(chart.lagnam)].push(`<b class="lag">${NAMES.grahaShort[L].lagnam}</b>`);
    for (const p of chart.planets) {
      b[signOf(p)].push(`${NAMES.grahaShort[L][p.key]}${p.retro && p.key !== 'rahu' && p.key !== 'ketu' ? `<sup>${retroMark}</sup>` : ''}`);
    }
    return b;
  };
  const centre = [meta.name, dateLine].filter(Boolean);
  const rasiChart = southIndianChart({
    title: t('rasiChart'),
    centerLines: centre,
    boxes: boxes((p) => p.sign),
    lagnaSign: chart.lagnam.sign,
    signNames: NAMES.rasi[L],
    ariaLabel: t('rasiChart'),
  });
  const navChart = southIndianChart({
    title: t('navamsaChart'),
    centerLines: centre,
    boxes: boxes((p) => p.navamsa),
    lagnaSign: chart.lagnam.navamsa,
    signNames: NAMES.rasi[L],
    ariaLabel: t('navamsaChart'),
  });
  const charts = `
    <div class="charts">
      <div class="card chart-card"><h2>${t('rasiChart')}</h2><p class="card-help">${help('rasiChart')}</p>${rasiChart}</div>
      <div class="card chart-card"><h2>${t('navamsaChart')}</h2><p class="card-help">${help('navamsaChart')}</p>${navChart}</div>
    </div>`;

  // --- planet table
  const rows = [chart.lagnam, ...chart.planets]
    .map(
      (p) => `<tr>
        <th scope="row">${gLabel(p.key)}</th>
        <td>${nm('rasi', p.sign)}</td>
        <td class="num">${fmtDeg(p.degInSign)}</td>
        <td>${nm('nakshatra', p.nakshatra)}</td>
        <td class="num">${p.pada}</td>
        <td>${p.retro ? `<span class="retro">${t('retro')}</span>` : ''}</td>
      </tr>`
    )
    .join('');
  const table = `
    <div class="card">
      <h2>${t('planets')}</h2>
      <p class="card-help">${help('planets')}</p>
      <div class="table-wrap"><table class="planets">
        <thead><tr><th>${t('graha')}</th><th>${t('rasi')}</th><th>${t('degree')}</th><th>${t('nakshatra')}</th><th>${t('pada')}</th><th>${t('retro')}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <p class="hint">${chart.input.options.node === 'true' ? t('trueNode') : t('meanNode')} · ${t('ayanamsa')} ${fmtDeg(chart.ayanamsa)}</p>
    </div>`;

  // --- dasa
  const now = new Date();
  const act = activePeriod(chart.dasa, now);
  const bal = yearsToYMD(chart.dasa.balanceYears);
  const dfmt = 'dd-MM-yyyy';
  const dasaRows = chart.dasa.periods
    .map((p, i) => {
      const isCur = act && act.dasa === p;
      const bh = p.bhuktis
        .map((b) => {
          const cur = act && act.bhukti === b;
          return `<li class="${cur ? 'current' : ''}"><span>${gName(p.lord)} – ${gName(b.lord)}</span><span class="num">${dt(b.start, dfmt)} → ${dt(b.end, dfmt)}</span>${cur ? `<em class="badge">${t('current')}</em>` : ''}</li>`;
        })
        .join('');
      return `<details class="dasa ${isCur ? 'current' : ''}" ${isCur ? 'open' : ''}>
        <summary><span class="dl">${gName(p.lord)}${i === 0 ? ' *' : ''}</span><span class="num">${dt(p.start, dfmt)} → ${dt(p.end, dfmt)}</span><span class="yrs">${p.years} ${t('years')}</span>${isCur ? `<em class="badge">${t('current')}</em>` : ''}</summary>
        <ol class="bhukti">${bh}</ol>
      </details>`;
    })
    .join('');
  const dasa = `
    <div class="card">
      <h2>${t('dasa')}</h2>
      <p class="card-help">${help('dasa')}</p>
      <p class="balance">* ${t('balance')}: <strong>${gName(chart.dasa.firstLord)}</strong> ${bal.y} ${t('years')} ${bal.m} ${t('months')} ${bal.d} ${t('days')}</p>
      <div class="dasa-list">${dasaRows}</div>
    </div>`;

  // --- panchangam
  const pc = chart.panchangam;
  const pak = NAMES.paksha[L][pc.paksha];
  const panch = `
    <div class="card">
      <h2>${t('panchangam')}</h2>
      <p class="card-help">${help('panchangam')}</p>
      <dl class="kv">
        <dt>${t('thithi')}</dt><dd>${pak} ${thithiName(pc.thithi, L)}</dd>
        <dt>${t('vaaram')}</dt><dd>${nm('vaaram', pc.vaaram)}${pc.beforeSunrise ? ` <small>(${t('beforeSunrise')})</small>` : ''}</dd>
        <dt>${t('nakshatra')}</dt><dd>${nm('nakshatra', pc.nakshatra)}</dd>
        <dt>${t('yogam')}</dt><dd>${nm('yogam', pc.yogam)}</dd>
        <dt>${t('karanam')}</dt><dd>${nm('karanam', pc.karanam)}</dd>
        ${pc.sunrise ? `<dt>${t('sunrise')}</dt><dd>${dt(pc.sunrise, 'dd-MM-yyyy hh:mm a')}</dd>` : ''}
      </dl>
    </div>`;

  const actions = `<div class="actions no-print">
      <button type="button" class="btn-primary" id="btn-print">${t('print')}</button>
      <button type="button" class="btn-ghost dark" id="btn-edit">${t('edit')}</button>
    </div>`;

  // --- palan (traditional readings): a prominent call-to-action, expanded on demand
  const PALAN_ICON = { brief: '✦', now: '📍', months: '📅', ahead: '🗓️', areas: '🧭', safety: '🛡️', transits: '🪐', nature: '🌿', dasa: '⏳', gochara: '🪐', yogas: '🌟', areasTech: '🧭', houses: '🏠', planets: '☉' };
  let palan = `
    <div class="palan-cta${state.showPalan ? ' is-open' : ''}">
      <div>
        <h2>${t('palanCtaTitle')}</h2>
        <p>${t('palanCtaText')}</p>
      </div>
      <button type="button" class="btn-cta" id="btn-palan" aria-expanded="${state.showPalan}" aria-controls="palan">${state.showPalan ? t('palanHide') : t('palanShow')}</button>
    </div>`;
  if (state.showPalan) {
    const pl = generatePalan(chart, L, (a, b) => `${dt(a, dfmt)} → ${dt(b, dfmt)}`, new Date(), (d) => dt(d, dfmt), (d) => dt(d, 'LLL yyyy'), state.palanSystem);
    const plainSecs = pl.sections.filter((x) => !x.technical);
    const techSecs = pl.sections.filter((x) => x.technical);
    // only "In brief" starts open; readers open the sections they want
    const openPlain = (i) => i === 0;
    const item = (x) => {
      if (typeof x === 'string') return `<li>${esc(x)}</li>`;
      return `<li class="pl-item">
        ${x.h ? `<div class="pl-head"><strong>${esc(x.h)}</strong></div>` : ''}
        ${(x.p || []).length ? `${x.h && !x.noLabel ? `<div class="pl-label">${t('plExpect')}</div>` : ''}<ul class="pl-p">${x.p.map((y) => `<li>${esc(y)}</li>`).join('')}</ul>` : ''}
        ${(x.tips || []).length ? `<div class="pl-label pl-do">${t('plDo')}</div><ul class="pl-tips">${x.tips.map((y) => `<li>${esc(y)}</li>`).join('')}</ul>` : ''}
        ${x.why ? `<p class="pl-why">${esc(x.why)}</p>` : ''}
      </li>`;
    };
    const secHtml = (sec, open) => `<details class="palan-sec sec-${sec.key}" ${open ? 'open' : ''}>
        <summary><span class="ico" aria-hidden="true">${PALAN_ICON[sec.key] || '•'}</span><h3>${esc(sec.title)}</h3></summary>
        <ul class="pl-list">${sec.items.map(item).join('')}</ul>
      </details>`;
    palan += `
    <div class="card palan" id="palan">
      <div class="sys-switch" role="radiogroup" aria-label="${t('readWith')}">
        <span>${t('readWith')}</span>
        ${['parasari', 'kp'].map((k) => `<button type="button" role="radio" aria-checked="${state.palanSystem === k}" class="sys-btn${state.palanSystem === k ? ' on' : ''}" data-sys="${k}">${t('sysBtn')[k]}</button>`).join('')}
      </div>
      ${bayesBanner(chart)}
      ${state.bayesWinner && !state.palanSystemChosen ? `<p class="hint">${t('sysFromBayes')(t('sysBtn')[state.bayesWinner])}</p>` : ''}
      <p class="palan-note">${esc(pl.note)}</p>
      ${plainSecs.map((sec, i) => secHtml(sec, openPlain(i))).join('')}
      <details class="palan-tech">
        <summary>🔭 ${esc(pl.techTitle)}</summary>
        ${techSecs.map((sec) => secHtml(sec, false)).join('')}
      </details>
      <p class="hint">${esc(pl.excluded)}</p>
    </div>`;
  }

  const res = $('results');
  res.innerHTML = actions + summary + palan + charts + verify + table + panch + dasa;
  res.hidden = false;
  $('btn-print').addEventListener('click', () => window.print());
  $('btn-temple').addEventListener('click', () => openTempleCard(chart, meta.name, L));
  res.querySelectorAll('.sys-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      state.palanSystem = btn.dataset.sys;
      state.palanSystemChosen = true;
      renderResults(state.last);
      $('palan')?.scrollIntoView({ block: 'start' });
    })
  );
  $('btn-palan').addEventListener('click', () => {
    state.showPalan = !state.showPalan;
    if (state.showPalan && location.hash !== '#palan') history.replaceState(null, '', '#palan');
    if (!state.showPalan && location.hash === '#palan') history.replaceState(null, '', '#jathagam');
    route();
    renderResults(state.last);
    if (state.showPalan) $('palan').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('btn-edit').addEventListener('click', () => $('birth-form').scrollIntoView({ behavior: 'smooth' }));
}

// Expand every dasa for printing (also when printing from the browser menu).
let closedForPrint = [];
window.addEventListener('beforeprint', () => {
  closedForPrint = [...document.querySelectorAll('details.dasa:not([open]), details.palan-sec:not([open]), details.palan-tech:not([open])')];
  closedForPrint.forEach((d) => (d.open = true));
});
window.addEventListener('afterprint', () => closedForPrint.forEach((d) => (d.open = false)));

initGlossary(document.querySelector('main'), () => state.lang, () => ({ close: t('close'), more: t('allTerms') }));
applyLang();
