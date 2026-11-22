// "Western / Research" tab: Westran-inspired Sun–Venus progressed-synastry
// TIMING SIGNALS for two people. Keeps interpretation, timing signals and
// predictions apart; makes no predictions. Browser-only; nothing is stored
// or sent (the place search is the only network call, as elsewhere).
import { DateTime } from 'luxon';
import { localToUtc, zoneFor, parseClock } from '../engine/index.js';
import { birthFields, wireBirth } from './birthInput.js';
import { WUI } from '../i18n.js';
import { MODEL_VERSION, DEFAULTS, YEAR_DAYS, positions, natalAspects, snapshot, timelineWithUncertainty, samePerson } from '../western/engine.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ORBS = { '2.0167': 2 + 1 / 60, '2': 2, '1': 1 }; // keys: 1, 2, 2.0167 in display order (integer-like keys sort first)

/** Read one person's fields; birth time may be unknown (then the whole local day is the range). */
export function readPerson(root, p) {
  const $ = (id) => root.querySelector(`#${id}`);
  const [y, mo, d] = ($(`${p}-date`).value || '').split('-').map(Number);
  const lat = parseFloat($(`${p}-lat`).value);
  const lon = parseFloat($(`${p}-lon`).value);
  if (!y || !mo || !d) return { error: 'date' };
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return { error: 'place' };
  const zone = zoneFor(lat, lon);
  const name = $(`${p}-name`).value.trim();
  if ($(`${p}-notime`).checked) {
    const at = (hour, minute) => localToUtc({ year: y, month: mo, day: d, hour, minute }, zone);
    const lo = at(0, 0);
    const hi = at(23, 59);
    const mid = at(12, 0);
    if (!lo.valid || !hi.valid || !mid.valid) return { error: 'date' };
    return { name, lat, lon, zone, birth: mid.utc, birthMin: lo.utc, birthMax: hi.utc, timeKnown: false };
  }
  const clock = parseClock($(`${p}-hh`).value, $(`${p}-mm`).value, $(`${p}-ampm`).value);
  if (!clock) return { error: 'time' };
  const c = localToUtc({ year: y, month: mo, day: d, hour: clock.hour, minute: clock.minute }, zone);
  if (!c.valid) return { error: 'date' };
  return { name, lat, lon, zone, birth: c.utc, timeKnown: true };
}

export function initWestern(root, ctx) {
  const state = { last: null };
  const thisYear = new Date().getFullYear();
  const person = (p, key) => `
      <div class="card person birth-fields" data-person="${p}">
        <h2 class="w-${key}-h"></h2>
        ${birthFields(p)}
        <label class="agree"><input type="checkbox" id="${p}-notime" /> <span class="w-notime-l"></span></label>
      </div>`;
  root.innerHTML = `
    <form id="western-form" novalidate>
      <div class="card w-intro">
        <h2 class="w-title"></h2>
        <p class="w-label"><strong class="w-badge"></strong></p>
        <ul class="w-intro-list"></ul>
      </div>
      ${person('w-a', 'a')}
      ${person('w-b', 'b')}
      <div class="card">
        <h2 class="w-set-h"></h2>
        <div class="row-2">
          <div class="field"><label for="w-orb" class="w-orb-l"></label><select id="w-orb"></select></div>
          <div class="field"><label for="w-year" class="w-year-l"></label><select id="w-year"></select></div>
        </div>
        <div class="row-2">
          <div class="field"><label for="w-from" class="w-from-l"></label><input id="w-from" type="number" inputmode="numeric" min="1900" max="2150" value="${thisYear - 30}" /></div>
          <div class="field"><label for="w-to" class="w-to-l"></label><input id="w-to" type="number" inputmode="numeric" min="1900" max="2150" value="${thisYear + 5}" /></div>
        </div>
      </div>
      <p id="w-error" class="error" role="alert"></p>
      <button type="submit" class="btn-primary w-run"></button>
    </form>
    <section id="western-results" aria-live="polite" hidden></section>`;
  const $ = (id) => root.querySelector(`#${id}`);
  for (const p of ['w-a', 'w-b']) {
    wireBirth(root, p, () => ($('w-error').textContent = ctx.t('geoError')));
    $(`${p}-notime`).addEventListener('change', (e) => {
      for (const k of ['hh', 'mm', 'ampm']) $(`${p}-${k}`).disabled = e.target.checked;
    });
  }
  const T = () => WUI[ctx.lang()];

  function renderForm() {
    const t = T();
    root.querySelector('.w-title').textContent = t.title;
    root.querySelector('.w-badge').textContent = t.badge;
    root.querySelector('.w-intro-list').innerHTML = t.intro.map((x) => `<li>${esc(x)}</li>`).join('');
    root.querySelector('.w-a-h').textContent = t.personA;
    root.querySelector('.w-b-h').textContent = t.personB;
    root.querySelectorAll('.w-notime-l').forEach((el) => (el.textContent = t.noTime));
    root.querySelector('.w-set-h').textContent = t.settings;
    root.querySelector('.w-orb-l').textContent = t.orb;
    root.querySelector('.w-year-l').textContent = t.yearLen;
    root.querySelector('.w-from-l').textContent = t.from;
    root.querySelector('.w-to-l').textContent = t.to;
    const orb = $('w-orb').value || '2.0167';
    $('w-orb').innerHTML = Object.keys(ORBS).map((k) => `<option value="${k}">${esc(t.orbOpts[k])}</option>`).join('');
    $('w-orb').value = orb;
    const yr = $('w-year').value || 'tropical';
    $('w-year').innerHTML = Object.keys(YEAR_DAYS).map((k) => `<option value="${k}">${esc(t.yearOpts[k])}</option>`).join('');
    $('w-year').value = yr;
    root.querySelector('.w-run').textContent = t.run;
  }

  $('western-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = T();
    $('w-error').textContent = '';
    const a = readPerson(root, 'w-a');
    if (a.error) {
      $('w-error').textContent = t.err[a.error](t.personA);
      return;
    }
    const hasB = !!$('w-b-date').value;
    const b = hasB ? readPerson(root, 'w-b') : null;
    if (b?.error) {
      $('w-error').textContent = t.err[b.error](t.personB);
      return;
    }
    if (b && samePerson(a, b)) {
      $('w-error').textContent = t.err.same;
      return;
    }
    const fromY = Number($('w-from').value);
    const toY = Number($('w-to').value);
    if (!(fromY >= 1900 && toY <= 2150 && toY > fromY && toY - fromY <= 80)) {
      $('w-error').textContent = t.err.range;
      return;
    }
    const opts = { ...DEFAULTS, orbDeg: ORBS[$('w-orb').value], yearDays: YEAR_DAYS[$('w-year').value] };
    $('w-error').textContent = t.working;
    setTimeout(() => {
      const from = new Date(Date.UTC(fromY, 0, 1));
      const to = new Date(Date.UTC(toY, 11, 31));
      const res = { a, b, opts, from, to, orbKey: $('w-orb').value, yearKey: $('w-year').value };
      res.natalA = positions(a.birth);
      if (b) {
        res.natalB = positions(b.birth);
        res.natal = natalAspects(a, b, opts);
        res.windows = timelineWithUncertainty(a, b, from, to, opts);
        res.now = snapshot(a, b, new Date(), opts).filter((c) => c.active && !c.permanent);
      }
      state.last = res;
      $('w-error').textContent = '';
      renderResults();
      $('western-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  });

  function renderResults() {
    const r = state.last;
    if (!r) return;
    const t = T();
    const L = ctx.lang();
    const nameA = r.a.name || t.personAShort;
    const nameB = r.b ? r.b.name || t.personBShort : '';
    const dt = (d, zone, fmt) => DateTime.fromJSDate(d, { zone }).setLocale(L === 'ta' ? 'ta-IN' : 'en-GB').toFormat(fmt);
    const mon = (d) => dt(d, 'UTC', 'LLL yyyy');
    const signOf = (lon) => `${t.signs[Math.floor(lon / 30)]} ${(lon % 30).toFixed(1)}°`;
    const birthLine = (p, n) => (p.timeKnown ? t.birthKnown(n, dt(p.birth, p.zone, 'd LLL yyyy, HH:mm'), dt(p.birth, 'UTC', 'HH:mm')) : t.birthUnknown(n, dt(p.birth, p.zone, 'd LLL yyyy')));
    const cfgName = (w) => t.cfgName(w.layer, w.dir, nameA, nameB, t.aspectName[w.aspect]);

    // 1. calculation settings
    const settings = `<div class="card w-res">
        <h2>${t.rSettings}</h2>
        <ul class="b-rules">
          <li>${esc(birthLine(r.a, nameA))}</li>
          ${r.b ? `<li>${esc(birthLine(r.b, nameB))}</li>` : ''}
          <li>${esc(t.convZodiac)}</li>
          <li>${esc(t.convProg(r.opts.yearDays))}</li>
          <li>${esc(t.convAspects(r.opts.aspects.map((x) => t.aspectName[x]).join(', '), t.orbOpts[r.orbKey]))}</li>
          <li>${esc(t.convRange(r.from.getUTCFullYear(), r.to.getUTCFullYear()))}</li>
          <li>${esc(t.convResolution(r.opts.stepDays))}</li>
          <li>${esc(t.convVersion(MODEL_VERSION))}</li>
          <li>${esc(t.convSource)}</li>
        </ul>
      </div>`;

    // 2. traditional interpretation (labelled)
    const natalRows = [[nameA, r.natalA], ...(r.b ? [[nameB, r.natalB]] : [])]
      .map(([n, p]) => `<li>${esc(t.natalLine(n, signOf(p.sun), signOf(p.venus)))}</li>`)
      .join('');
    const natalAsp = r.b
      ? r.natal.length
        ? `<p>${esc(t.natalAspectsIntro)}</p><ul class="b-rules">${r.natal.map((n) => `<li><strong>${esc(t.cfgName('NN', n.dir, nameA, nameB, t.aspectName[n.aspect]))}</strong> (${esc(t.orbLabel(n.orb))})<br>${esc(t.interp[n.aspect])}</li>`).join('')}</ul>`
        : `<p>${esc(t.noNatalAspects)}</p>`
      : `<p>${esc(t.needB)}</p>`;
    const interp = `<div class="card w-res">
        <h2>${t.rInterp}</h2>
        <p class="hint"><strong>${t.interpLabel}</strong></p>
        <ul class="b-rules">${natalRows}</ul>
        <p class="hint">${esc(t.planetMeaning)}</p>
        ${natalAsp}
      </div>`;

    // 3. experimental timing
    let timing = '';
    if (r.b) {
      const rows = r.windows
        .map((w) => {
          const span = `${mon(w.start)}${w.openStart ? ` (${t.orEarlier})` : ''} – ${mon(w.end)}${w.openEnd ? ` (${t.orLater})` : ''}`;
          const unc = w.uncertain ? `<br><span class="hint">${esc(t.uncertainSpan(mon(w.earliest), mon(w.latest), w.certainStart ? `${mon(w.certainStart)} – ${mon(w.certainEnd)}` : null))}</span>` : '';
          const ex = w.exact.length ? `<br><span class="hint">${esc(t.exactAt(w.exact.map(mon).join(', ')))}</span>` : '';
          return `<li><strong>${esc(cfgName(w))}</strong><br>${esc(span)}${ex}${unc}</li>`;
        })
        .join('');
      const nowList = r.now.length ? r.now.map((c) => `<li>${esc(cfgName(c))} (${esc(t.orbLabel(c.orb))})</li>`).join('') : `<li>${esc(t.noneNow)}</li>`;
      timing = `<div class="card w-res">
          <h2>${t.rTiming}</h2>
          <p class="w-label"><strong>${t.badge}</strong></p>
          <p class="hint">${esc(t.timingExplain)}</p>
          <h3>${t.activeNow}</h3>
          <ul class="b-rules">${nowList}</ul>
          <h3>${t.windowsTitle(r.from.getUTCFullYear(), r.to.getUTCFullYear())}</h3>
          ${rows ? `<ul class="b-rules">${rows}</ul>` : `<p>${esc(t.noWindows)}</p>`}
          <p class="hint">${esc(t.precisionNote)}</p>
        </div>`;
    }
    const limits = `<div class="card w-res"><h2>${t.rLimits}</h2><ul class="b-rules">${t.limits.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    $('western-results').innerHTML = settings + interp + timing + limits;
    $('western-results').hidden = false;
  }

  renderForm();
  return {
    relabel() {
      renderForm();
      renderResults();
    },
  };
}
