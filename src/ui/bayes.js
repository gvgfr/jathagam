// Bayesian tab: calibrate the traditional rules against the person's own life.
import { DateTime } from 'luxon';
import { EVENT_KINDS } from '../bayes/model.js';
import { robustCheck } from '../bayes/robust.js';
import { EVENT_DEFS, DEF_VERSION, roundBirthTime } from '../forecast/definitions.js';
import { makeRecord, migrate, resolve, score as scoreRecords, exportRecords, importRecords } from '../forecast/record.js';
import { BUI } from '../i18n.js';
import { birthFields, wireBirth, readBirth } from './birthInput.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const STORE = 'jathagam.bayes.v1';
const FSTORE = 'jathagam.bayes.forecasts.v1'; // same key; records inside are versioned (v1 legacy, v2 sealed)
const loadF = () => {
  try {
    return JSON.parse(localStorage.getItem(FSTORE) || '[]').map(migrate);
  } catch {
    return [];
  }
};
const saveF = (v) => {
  try {
    localStorage.setItem(FSTORE, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
};
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
          </div>${d.year && !d.month ? `<p class="hint b-weak">${t.weakDate}</p>` : ''}`
        )
        .join('');
      return `<div class="b-kind${e.dates.length || e.never ? ' used' : ''}">
          <div class="b-kind-head"><strong>${esc(t.kinds[k])}</strong>
            <label class="inline"><input type="checkbox" data-never="${k}" ${e.never ? 'checked' : ''} /> ${t.never}</label></div>
          ${EVENT_DEFS[k] ? `<p class="hint b-def">${t.countsAs} ${esc(EVENT_DEFS[k][ctx.lang()].yes)}</p>` : ''}
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
      if (el.dataset.f === 'month' || el.dataset.f === 'year') renderForm();
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
        reported[k] = []; // recorded, but a timing test conditional on events learns nothing from it
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
    setTimeout(async () => {
      const r = robustCheck({ utc: b.conv.utc, lat: b.lat, lon: b.lon }, reported, { toleranceMin: state.tol });
      state.last = { r, b, reported };
      // which rule system the Palan should use for this person: only when the evidence is real
      const sysPost = (sys) => r.models.filter((m) => m.system === sys).reduce((a, m) => a + m.post, 0);
      const winner = r.overallBF > 3 ? (sysPost('kp') > 0.75 ? 'kp' : sysPost('parasari') > 0.75 ? 'parasari' : null) : null;
      ctx.setWinner?.(winner);
      // share a short summary with the Palan tab (kept on the phone only if "remember" is ticked)
      ctx.setSummary?.(
        { utc: b.conv.utc.getTime(), lat: b.lat, lon: b.lon, avgBF: r.overallBF, pEffect: r.pEffect, lambda: r.lambda.mean, oosBF: r.oos ? r.oos.testBF : null, winner, at: Date.now() },
        $('b-remember').checked
      );
      // E. keep the forecasts (only if the person asked to remember) so they can be scored later
      if ($('b-remember').checked) {
        const rec = loadF();
        const month = new Date().toISOString().slice(0, 7);
        const inputs = { utc: b.conv.utc.toISOString(), lat: b.lat, lon: b.lon, tol: state.tol, reported };
        const model = { method: 'robust-alignment-v2', distinctModels: r.distinctModels, models: r.models.length, toleranceMin: state.tol, spike: 0.5 };
        for (const f of r.forecast) {
          // one open forecast per kind per month, so re-running does not stack duplicates
          if (rec.some((x) => x.kind === f.kind && !x.legacy && new Date(x.createdAt).toISOString().slice(0, 7) === month)) continue;
          rec.push(await makeRecord({ kind: f.kind, p: f.p, base: f.base, pEffect: r.pEffect, model, inputs, defVersion: DEF_VERSION }));
        }
        saveF(rec);
      }
      $('b-error').textContent = '';
      renderResults();
      $('bayes-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  });

  function renderResults() {
    if (!state.last) return;
    const t = T();
    const { r, b } = state.last;
    const L = ctx.lang();
    const tm = (utc) => DateTime.fromJSDate(utc, { zone: b.zone }).toFormat('hh:mm a');
    const pct = (x) => `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;
    const fmtBF = (bf) => (bf >= 100 ? bf.toFixed(0) : bf >= 10 ? bf.toFixed(1) : bf.toFixed(2));
    const dfmt = (d) => DateTime.fromJSDate(d, { zone: b.zone }).setLocale(L === 'ta' ? 'ta-IN' : 'en-GB').toFormat('LLL yyyy');
    const one = (x) => (x > 0 && x < 0.1 ? x.toFixed(2) : Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : x.toFixed(1));
    const verdictOf = (bf) => (bf > 20 ? 'strong' : bf > 3 ? 'moderate' : bf < 1 / 3 ? 'against' : 'none');
    const modelName = (m) => t.modelName(t.sysShort[m.system], t.ayanName[m.ayanamsa], t.nodeName[m.node], m.yearDays);

    // 1. honest score (model average) and rule strength
    const lam = r.lambda;
    const hm = $(`${p}-mm`)?.value;
    const quality = `<div class="card b-res">
        <h2>${t.rQuality}</h2>
        <ul class="b-rules">
          <li>${t.qEvents(Object.values(state.last.reported).flat().length, Math.round(r.weakShare * 100))}</li>
          ${roundBirthTime($(`${p}-hh`)?.value, hm) ? `<li>${t.qRound}</li>` : ''}
          <li>${t.qList}</li>
        </ul>
      </div>`;
    const score = `<div class="card b-res">
        <h2>${t.rScore}</h2>
        <p class="hint"><strong>${t.retroLabel}</strong></p>
        <p class="b-verdict">${t.verdicts[verdictOf(r.overallBF)]}</p>
        <p>${t.pEffectLine(Math.round(r.pEffect * 100))}</p>
        <p>${t.strengthLine(Math.round(lam.slabMean * 100), Math.round(lam.lo * 100), Math.round(lam.hi * 100))}</p>
        <p class="hint">${t.bfLine(fmtBF(r.overallBF))} ${t.avgNote(r.models.length, r.distinctModels)}</p>
      </div>`;

    // 2. which model fits best (A)
    const sysPost = (sys) => r.models.filter((m) => m.system === sys).reduce((a, m) => a + m.post, 0);
    const rows = r.models
      .slice(0, 6)
      .map((m) => `<div class="b-bar"><span class="b-model">${esc(modelName(m))}</span><i style="width:${Math.max(2, (m.post / r.models[0].post) * 100)}%"></i><em>${pct(m.post)}</em></div>`)
      .join('');
    const modelsCard = `<div class="card b-res">
        <h2>${t.rModels}</h2>
        <p>${t.modelsIntro(r.models.length)} ${t.distinctNote(r.distinctModels)}</p>
        <p><strong>${t.sysSplit(pct(sysPost('parasari')), pct(sysPost('kp')))}</strong></p>
        <div class="b-bars b-models">${rows}</div>
        <p class="hint">${r.overallBF > 3 ? t.modelsMeaningful : t.modelsNotMeaningful}</p>
      </div>`;

    // 3. out-of-sample (C)
    const o = r.oos;
    const oosCard = `<div class="card b-res">
        <h2>${t.rOos}</h2>
        ${o ? `<p class="hint">${t.oosHow}</p><p>${t.oosLine(o.splitYear, o.nTrain, esc(modelName(o.trainModel)), o.nTest, fmtBF(o.testBF))}</p><p class="b-verdict">${t.oosVerdict[verdictOf(o.testBF)]}</p>` : `<p>${t.oosNeedMore}</p>`}
      </div>`;

    // 4. birth time
    const maxPost = Math.max(...r.times.map((c) => c.post));
    const statedUtc = r.times.find((c) => c.offsetMin === 0).utc;
    const bestT = r.times.find((c) => c.offsetMin === r.bestOffsetMin);
    const bars = r.times.length > 1
      ? `<p class="hint">${t.timeTable}</p><div class="b-bars">${r.times
          .map((c) => `<div class="b-bar${c.offsetMin === 0 ? ' stated' : ''}"><span>${tm(c.utc)}</span><i style="width:${Math.max(2, (c.post / maxPost) * 100)}%"></i><em>${pct(c.post)}</em></div>`)
          .join('')}</div>`
      : '';
    const time = `<div class="card b-res">
        <h2>${t.rTime}</h2>
        <p>${r.timeMoved ? t.timeMoved(tm(bestT.utc), tm(statedUtc), '3+') : t.timeKept(tm(statedUtc))}</p>
        ${r.timeMoved ? `<button type="button" class="btn-ghost dark" id="b-use">${t.useTime(tm(bestT.utc))}</button>` : ''}
        ${bars}
      </div>`;

    // 5. each kind of event, under the best model, against age-aware chance (B)
    const detail = Object.entries(r.detail)
      .map(([k, v]) => `<li><strong>${esc(t.kinds[k])}</strong> <span class="hint">(${t.reported(Math.round(v.E))})</span><br>${t.ruleLineAge(Math.round(v.firedShare * 100), one(v.expected), one(v.h), Math.round(v.E))} <em>${t.ruleVerdict[verdictOf(Math.exp(v.logBF))]}</em></li>`)
      .join('');
    const rulesCard = `<div class="card b-res"><h2>${t.rRules}</h2><p class="hint">${t.detailNote(esc(modelName(r.bestModel)))} ${t.detailSelected}</p><ul class="b-rules">${detail}</ul></div>`;

    // 6. probability forecasts (E)
    const fc = r.forecast
      .map((f) => `<li><strong>${esc(t.kinds[f.kind])}: ${pct(f.p)}</strong> <span class="hint">${t.vsNormal(pct(f.base))}</span>${f.window && f.p > f.base * 1.2 ? `<br>${t.favouredWindow(dfmt(f.window.start), dfmt(f.window.end))}` : ''}${EVENT_DEFS[f.kind] ? `<br><span class="hint">${t.countsAs} ${esc(EVENT_DEFS[f.kind][L].yes)}</span>` : ''}</li>`)
      .join('');
    const fcCard = `<div class="card b-res"><h2>${t.rForecast12}</h2>
        <p class="hint"><strong>${t.notValidated}</strong></p>
        <p class="hint">${t.forecastExplain2(Math.round(r.pEffect * 100))}</p>
        ${fc ? `<ul class="b-rules">${fc}</ul>` : `<p>${t.forecastNoneAge}</p>`}
        <p class="hint">${$('b-remember').checked ? t.savedForScoring : t.rememberToScore}</p>
      </div>`;

    // 7. forecast record: resolve, score, export / import
    const rec = loadF();
    const due = rec.filter((x) => x.to < Date.now() && !x.outcome);
    const sc = scoreRecords(rec);
    const calib = sc && sc.n >= 20
      ? `<p class="hint">${t.calibTitle}</p><table class="b-calib"><tr><th>${t.calibP}</th><th>${t.calibObs}</th><th>n</th></tr>${sc.calibration.map((c) => `<tr><td>${pct(c.meanP)}</td><td>${pct(c.rate)}</td><td>${c.n}</td></tr>`).join('')}</table>`
      : sc ? `<p class="hint">${t.calibNeed(sc.n)}</p>` : '';
    const recCard = `<div class="card b-res"><h2>${t.rRecord}</h2>
        ${due.length ? `<p>${t.recordAsk}</p><ul class="b-rules">${due.map((x) => `<li>${esc(t.kinds[x.kind])} (${dfmt(new Date(x.from))} – ${dfmt(new Date(x.to))})${EVENT_DEFS[x.kind] ? `<br><span class="hint">${t.countsAs} ${esc(EVENT_DEFS[x.kind][L].yes)}</span>` : ''}<br><button type="button" class="b-yes" data-id="${esc(x.id)}" data-v="yes">${t.yes}</button> <button type="button" class="b-yes" data-id="${esc(x.id)}" data-v="no">${t.no}</button> <button type="button" class="b-yes" data-id="${esc(x.id)}" data-v="unknown">${t.dontKnow}</button></li>`).join('')}</ul>` : ''}
        <p>${sc ? t.scoreLine(sc.n, sc.events, sc.brier.toFixed(3), sc.brierBase.toFixed(3), (sc.skill * 100).toFixed(0), sc.logLoss.toFixed(3), sc.logLossBase.toFixed(3)) : rec.length ? t.recordWaiting(rec.length) : t.recordEmpty}</p>
        ${sc && sc.n < 30 ? `<p class="hint">${t.fewScored}</p>` : ''}
        ${calib}
        <div class="b-io"><button type="button" class="btn-ghost dark" id="b-export" ${rec.length ? '' : 'disabled'}>${t.exportBtn}</button>
          <label class="btn-ghost dark b-import-l">${t.importBtn}<input type="file" id="b-import" accept="application/json,.json" hidden /></label></div>
        <p class="hint" id="b-io-msg"></p>
        <p class="hint">${t.hashNote}</p>
      </div>`;

    $('bayes-results').innerHTML = quality + score + modelsCard + oosCard + time + rulesCard + fcCard + recCard + `<div class="card b-res"><p class="hint">${t.limits}</p></div>`;
    $('bayes-results').hidden = false;
    $('b-export')?.addEventListener('click', () => {
      const blob = new Blob([exportRecords(loadF())], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `gv-jathagam-forecasts-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $('b-import')?.addEventListener('change', async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      try {
        const res = await importRecords(await file.text(), loadF());
        saveF(res.records);
        renderResults();
        $('b-io-msg').textContent = t.importDone(res.added, res.conflicts, res.invalid);
      } catch {
        $('b-io-msg').textContent = t.importFail;
      }
    });
    $('b-use')?.addEventListener('click', () => ctx.useTime(DateTime.fromJSDate(bestT.utc, { zone: b.zone }), b));
    $('bayes-results').querySelectorAll('.b-yes').forEach((btn) =>
      btn.addEventListener('click', () => {
        const all = loadF();
        const i = all.findIndex((y) => y.id === btn.dataset.id);
        if (i >= 0) all[i] = resolve(all[i], btn.dataset.v);
        saveF(all);
        renderResults();
      })
    );
  }

  renderForm();
  return {
    relabel() {
      renderForm();
      renderResults();
    },
  };
}
