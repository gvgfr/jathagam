// Bayesian tab: calibrate the traditional rules against the person's own life.
import { DateTime } from 'luxon';
import { calibrate, EVENT_KINDS } from '../bayes/model.js';
import { BUI } from '../i18n.js';
import { birthFields, wireBirth, readBirth } from './birthInput.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const STORE = 'jathagam.bayes.v1';
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE) || 'null');
  } catch {
    return null;
  }
};
const save = (v) => {
  try {
    if (v) localStorage.setItem(STORE, JSON.stringify(v));
    else localStorage.removeItem(STORE);
  } catch {
    /* storage unavailable: fine */
  }
};

export function initBayes(root, ctx) {
  const p = 'b-person';
  const state = { events: Object.fromEntries(EVENT_KINDS.map((k) => [k, { never: false, dates: [] }])), tol: 30, last: null };

  root.innerHTML = `
    <form id="bayes-form" novalidate>
      <div class="card">
        <h2 class="b-title"></h2>
        <ul class="b-intro"></ul>
      </div>
      <div class="card person birth-fields">${birthFields(p)}
        <div class="field"><label for="b-tol" class="b-tol-l"></label><select id="b-tol"></select></div>
      </div>
      <div class="card">
        <h2 class="b-ev-title"></h2>
        <p class="hint b-ev-help"></p>
        <div id="b-kinds"></div>
      </div>
      <label class="agree"><input type="checkbox" id="b-remember" /> <span class="b-remember-l"></span></label>
      <button type="button" class="btn-ghost dark b-forget" id="b-forget" hidden></button>
      <p id="b-error" class="error" role="alert"></p>
      <button type="submit" class="btn-primary b-run"></button>
    </form>
    <section id="bayes-results" aria-live="polite" hidden></section>`;
  const $ = (id) => root.querySelector(`#${id}`);
  wireBirth(root, p, () => ($('b-error').textContent = ctx.t('geoError')));

  // restore saved entries
  const saved = load();
  if (saved) {
    Object.assign(state.events, saved.events || {});
    state.tol = saved.tol ?? 30;
    for (const [k, v] of Object.entries(saved.birth || {})) if ($(`${p}-${k}`)) $(`${p}-${k}`).value = v;
    $('b-remember').checked = true;
  }

  const T = () => BUI[ctx.lang()];
  function renderForm() {
    const t = T();
    root.querySelector('.b-title').textContent = t.bTitle;
    root.querySelector('.b-intro').innerHTML = t.bIntro.map((x) => `<li>${esc(x)}</li>`).join('');
    root.querySelector('.b-tol-l').textContent = t.tol;
    $('b-tol').innerHTML = Object.entries(t.tolOpts).map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('');
    $('b-tol').value = String(state.tol);
    root.querySelector('.b-ev-title').textContent = t.eventsTitle;
    root.querySelector('.b-ev-help').textContent = t.eventsHelp;
    root.querySelector('.b-remember-l').textContent = t.remember;
    $('b-forget').textContent = t.forget;
    $('b-forget').hidden = !load();
    root.querySelector('.b-run').textContent = t.run;
    const months = Array.from({ length: 12 }, (_, i) => DateTime.fromObject({ month: i + 1 }).setLocale(ctx.lang() === 'ta' ? 'ta-IN' : 'en-GB').toFormat('LLL'));
    $('b-kinds').innerHTML = EVENT_KINDS.map((k) => {
      const e = state.events[k];
      const rows = e.dates
        .map(
          (d, i) => `<div class="b-date">
            <input type="number" inputmode="numeric" min="1900" max="2100" placeholder="${t.year}" aria-label="${t.year}" data-k="${k}" data-i="${i}" data-f="year" value="${d.year ?? ''}" />
            <select aria-label="${t.month}" data-k="${k}" data-i="${i}" data-f="month"><option value="">${t.month}</option>${months.map((m, j) => `<option value="${j + 1}" ${d.month === j + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select>
            <button type="button" class="b-rm" data-k="${k}" data-i="${i}" aria-label="${t.remove}">✕</button>
          </div>`
        )
        .join('');
      return `<div class="b-kind${e.dates.length || e.never ? ' used' : ''}">
          <div class="b-kind-head"><strong>${esc(t.kinds[k])}</strong>
            <label class="inline"><input type="checkbox" data-never="${k}" ${e.never ? 'checked' : ''} /> ${t.never}</label></div>
          ${rows}
          ${e.never ? '' : `<button type="button" class="b-add" data-k="${k}">${t.addDate}</button>`}
        </div>`;
    }).join('');
  }

  $('b-kinds').addEventListener('click', (ev) => {
    const add = ev.target.closest('.b-add');
    const rm = ev.target.closest('.b-rm');
    if (add) {
      state.events[add.dataset.k].dates.push({ year: null, month: null });
      renderForm();
      root.querySelector(`input[data-k="${add.dataset.k}"][data-i="${state.events[add.dataset.k].dates.length - 1}"]`)?.focus();
    } else if (rm) {
      state.events[rm.dataset.k].dates.splice(Number(rm.dataset.i), 1);
      renderForm();
    }
  });
  $('b-kinds').addEventListener('change', (ev) => {
    const el = ev.target;
    if (el.dataset.never) {
      state.events[el.dataset.never] = { never: el.checked, dates: el.checked ? [] : state.events[el.dataset.never].dates };
      renderForm();
    } else if (el.dataset.k) {
      const d = state.events[el.dataset.k].dates[Number(el.dataset.i)];
      d[el.dataset.f] = el.value ? Number(el.value) : null;
    }
  });
  $('b-tol').addEventListener('change', () => (state.tol = Number($('b-tol').value)));
  $('b-forget').addEventListener('click', () => {
    save(null);
    $('b-remember').checked = false;
    $('b-forget').hidden = true;
  });

  $('bayes-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = T();
    $('b-error').textContent = '';
    const b = readBirth(root, p);
    if (!b) {
      $('b-error').textContent = t.needBirth;
      return;
    }
    const reported = {};
    let units = 0;
    for (const [k, v] of Object.entries(state.events)) {
      const dates = v.dates.filter((d) => d.year >= 1900 && d.year <= 2100).map((d) => (d.month ? { year: d.year, month: d.month } : { year: d.year }));
      if (v.never) {
        reported[k] = [];
        units++;
      } else if (dates.length) {
        reported[k] = dates;
        units += dates.length;
      }
    }
    if (units < 2) {
      $('b-error').textContent = t.needEvents;
      return;
    }
    if ($('b-remember').checked) {
      const birth = Object.fromEntries(['name', 'date', 'hh', 'mm', 'ampm', 'place', 'lat', 'lon'].map((k) => [k, $(`${p}-${k}`)?.value ?? '']));
      save({ events: state.events, tol: state.tol, birth });
    }
    $('b-error').textContent = t.working;
    setTimeout(() => {
      const r = calibrate({ utc: b.conv.utc, lat: b.lat, lon: b.lon }, reported, { toleranceMin: state.tol, stepMin: 5 });
      state.last = { r, b, reported };
      $('b-error').textContent = '';
      renderResults();
      $('bayes-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  });

  function renderResults() {
    if (!state.last) return;
    const t = T();
    const { r, b, reported } = state.last;
    const L = ctx.lang();
    const tm = (utc) => DateTime.fromJSDate(utc, { zone: b.zone }).toFormat('hh:mm a');
    const pct = (x) => `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;
    const fmtBF = (bf) => (bf >= 100 ? bf.toFixed(0) : bf >= 10 ? bf.toFixed(1) : bf.toFixed(2));
    const dfmt = (d) => DateTime.fromJSDate(d, { zone: b.zone }).setLocale(L === 'ta' ? 'ta-IN' : 'en-GB').toFormat('LLL yyyy');

    // 1. honest score
    const score = `<div class="card b-res">
        <h2>${t.rScore}</h2>
        <p class="b-verdict">${t.verdicts[r.overall.verdict]}</p>
        <p class="hint">${t.bfLine(fmtBF(r.overall.bf))}</p>
      </div>`;

    // 2. birth time
    const statedUtc = r.candidates.find((c) => c.offsetMin === 0).utc;
    const maxPost = Math.max(...r.candidates.map((c) => c.post));
    const bars = r.candidates.length > 1
      ? `<p class="hint">${t.timeTable}</p><div class="b-bars">${r.candidates
          .map((c) => `<div class="b-bar${c.offsetMin === 0 ? ' stated' : ''}${c.offsetMin === r.usedOffsetMin ? ' used' : ''}"><span>${tm(c.utc)}</span><i style="width:${Math.max(2, (c.post / maxPost) * 100)}%"></i><em>${pct(c.post)}</em></div>`)
          .join('')}</div>`
      : '';
    const ratio = Math.exp(r.candidates.find((c) => c.offsetMin === r.best.offsetMin).logBF - r.stated.logBF);
    const time = `<div class="card b-res">
        <h2>${t.rTime}</h2>
        <p>${r.movedTime ? t.timeMoved(tm(r.best.utc), tm(statedUtc), ratio.toFixed(1)) : t.timeKept(tm(statedUtc))}</p>
        ${r.movedTime ? `<button type="button" class="btn-ghost dark" id="b-use">${t.useTime(tm(r.best.utc))}</button>` : ''}
        ${bars}
      </div>`;

    // 3. per-rule results
    const rules = Object.entries(r.kinds)
      .map(([k, v]) => {
        const fired = v.table.a + v.table.b;
        const verdict = v.logBF > Math.log(20) ? 'strong' : v.logBF > Math.log(3) ? 'moderate' : v.logBF < Math.log(1 / 3) ? 'against' : v.logBF < 0 ? 'slightlyAgainst' : 'none';
        const line = reported[k].length ? t.ruleLine(Math.round(fired), Math.round(v.table.a), reported[k].length) : t.ruleNever(Math.round(fired));
        return `<li><strong>${esc(t.kinds[k])}</strong> <span class="hint">(${reported[k].length ? t.reported(reported[k].length) : t.never})</span><br>${line} <em>${t.ruleVerdict[verdict]}</em></li>`;
      })
      .join('');
    const rulesCard = `<div class="card b-res"><h2>${t.rRules}</h2><ul class="b-rules">${rules}</ul></div>`;

    // 4. personal forecast: only rules that clearly worked for this person
    const seen = new Set();
    const items = r.forecast
      .filter((f) => (seen.has(f.key + f.start.getTime()) ? false : seen.add(f.key + f.start.getTime())))
      .sort((a, b2) => a.start - b2.start)
      .slice(0, 8)
      .map((f) => `<li><strong>${dfmt(f.start)} – ${dfmt(f.end)}: ${esc(t.kinds[f.key])}</strong><br>${t.fLine(fmtBF(f.bf))}</li>`)
      .join('');
    const fc = `<div class="card b-res"><h2>${t.rForecast}</h2>
        ${items ? `<p class="hint">${t.forecastNote}</p><ul class="b-rules">${items}</ul>` : `<p>${t.forecastNone}</p>`}
        <p class="hint">${t.limits}</p></div>`;

    $('bayes-results').innerHTML = score + time + rulesCard + fc;
    $('bayes-results').hidden = false;
    $('b-use')?.addEventListener('click', () => ctx.useTime(DateTime.fromJSDate(r.best.utc, { zone: b.zone }), b));
  }

  renderForm();
  return {
    relabel() {
      renderForm();
      renderResults();
    },
  };
}
