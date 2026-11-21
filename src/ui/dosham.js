// Dosham page. Shown only after the visitor acknowledges the disclaimer.
import { DateTime } from 'luxon';
import { doshams } from '../engine/index.js';
import { NAMES } from '../i18n.js';
import { birthFields, wireBirth, readBirth } from './birthInput.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function initDosham(root, ctx) {
  const p = 'd-person';
  root.innerHTML = `
    <form id="dosham-form" novalidate>
      <div class="card risk-card">
        <h2 data-i18n="dTitle"></h2>
        <p class="risk" data-i18n="dRisk"></p>
        <p data-i18n="dRiskMore"></p>
      </div>
      <div class="card person birth-fields">
        ${birthFields(p)}
      </div>
      <label class="agree"><input type="checkbox" id="d-agree" /> <span data-i18n="dAgree"></span></label>
      <p id="d-error" class="error" role="alert"></p>
      <button type="submit" class="btn-primary" data-i18n="dCheck"></button>
      <p class="hint privacy" data-i18n="privacy"></p>
    </form>
    <section id="dosham-results" aria-live="polite" hidden></section>`;

  const $ = (id) => root.querySelector(`#${id}`);
  let last = null;
  wireBirth(root, p, () => ($('d-error').textContent = ctx.t('geoError')));

  $('dosham-form').addEventListener('submit', (e) => {
    e.preventDefault();
    $('d-error').textContent = '';
    const b = $('d-agree').checked ? readBirth(root, p) : null;
    if (!b) {
      $('d-error').textContent = ctx.t('dNeed');
      return;
    }
    last = { b, result: doshams(b.chart) };
    render();
    $('dosham-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function render() {
    if (!last) return;
    const L = ctx.lang();
    const t = ctx.t;
    const { b, result } = last;
    const g = (k) => NAMES.graha[L][k];
    const sign = (i) => NAMES.rasi[L][i];
    const fromLabel = { lagnam: t('fromLagnam'), moon: t('fromMoon'), venus: t('fromVenus') };
    const status = (d) =>
      d.present
        ? `<span class="st st-present">${t('dPresent')}</span>`
        : d.cancelled
          ? `<span class="st st-cancelled">${t('dCancelled')}</span>`
          : `<span class="st st-absent">${t('dAbsent')}</span>`;

    const blocks = result.map((d) => {
      let body = '';
      if (d.key === 'sevvai') {
        body += `<p class="rule">${t('sevvaiRule')} ${t('marsIn')(sign(d.marsSign))}.</p><ul>`;
        body += d.refs
          .map((r) => `<li class="${r.inHouse ? 'hit' : ''}">${fromLabel[r.from]}: ${t('house')(r.house)}${r.inHouse ? ' ●' : ''}</li>`)
          .join('');
        body += '</ul>';
        if (d.triggered && d.exceptions.length)
          body += `<p class="rule">${t('exceptions')}:</p><ul>${d.exceptions.map((x) => `<li>${t('ex')[x]}</li>`).join('')}</ul>`;
        body += `<p class="hint">${t('context')}</p>`;
      } else if (d.key === 'raaguKethu') {
        body += `<p class="rule">${t('raaguRule')}</p>`;
        if (d.hits.length)
          body += `<ul>${d.hits.map((h) => `<li class="hit">${t('nodeIn')(g(h.node), fromLabel[h.from], t('house')(h.house))}</li>`).join('')}</ul>`;
      } else {
        body += `<p class="rule">${t('kalaRule')}</p>`;
        if (d.variant) body += `<p>${t('kalaVariant')[d.variant]}</p>`;
        else if (d.outside.length) body += `<p>${t('kalaOutside')(d.outside.map(g).join(', '))}</p>`;
      }
      return `<div class="dosham-block"><h3>${t(d.key)}</h3>${status(d)}${body}</div>`;
    });

    const off = b.conv.offsetMinutes;
    const sg = off < 0 ? '−' : '+';
    const local = DateTime.fromJSDate(b.conv.utc, { zone: b.zone });
    $('dosham-results').innerHTML = `
      <div class="card">
        <h2>${t('dResult')}${b.name ? ` — ${esc(b.name)}` : ''}</h2>
        <p class="risk">${t('dRisk')}</p>
        <p class="sub hint">${local.toFormat('dd-MM-yyyy hh:mm a')} · ${b.lat.toFixed(4)}, ${b.lon.toFixed(4)} · ${b.zone} UTC${sg}${Math.floor(Math.abs(off) / 60)}:${String(Math.abs(off) % 60).padStart(2, '0')}
          · ${t('lagnam')} ${sign(b.chart.lagnam.sign)} · ${t('rasi')} ${sign(b.chart.summary.rasi)}</p>
        ${blocks.join('')}
        <p class="warn">${t('dRiskMore')}</p>
      </div>`;
    $('dosham-results').hidden = false;
  }

  return { relabel: render };
}
