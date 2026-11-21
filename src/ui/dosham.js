// Dosham page. Shown only after the visitor acknowledges the disclaimer.
import { DateTime } from 'luxon';
import { doshams } from '../engine/index.js';
import { NAMES } from '../i18n.js';
import { DOSHAM_PLAIN } from '../doshamTexts.js';
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
    const P = DOSHAM_PLAIN[L];
    const stateOf = (d) => (d.present ? 'present' : d.cancelled ? 'cancelled' : 'absent');
    const ul = (arr) => `<ul>${arr.map((x) => `<li>${x}</li>`).join('')}</ul>`;

    // Technical details (the rule and the positions), collapsed
    const technical = (d) => {
      let body = '';
      if (d.key === 'sevvai') {
        body += `<p class="rule">${t('sevvaiRule')} ${t('marsIn')(sign(d.marsSign))}.</p>`;
        body += ul(d.refs.map((r) => `${fromLabel[r.from]}: ${t('house')(r.house)}${r.inHouse ? ' ●' : ''}`));
        if (d.triggered && d.exceptions.length) body += `<p class="rule">${t('exceptions')}:</p>${ul(d.exceptions.map((x) => t('ex')[x]))}`;
        body += `<p class="hint">${t('context')}</p>`;
      } else if (d.key === 'raaguKethu') {
        body += `<p class="rule">${t('raaguRule')}</p>`;
        if (d.hits.length) body += ul(d.hits.map((h) => t('nodeIn')(g(h.node), fromLabel[h.from], t('house')(h.house))));
      } else {
        body += `<p class="rule">${t('kalaRule')}</p>`;
        if (d.variant) body += `<p>${t('kalaVariant')[d.variant]}</p>`;
        else if (d.outside.length) body += `<p>${t('kalaOutside')(d.outside.map(g).join(', '))}</p>`;
      }
      return `<details class="d-tech"><summary>${P.details}</summary>${body}</details>`;
    };

    const blocks = result.map((d) => {
      const st = stateOf(d);
      const T = P[d.key];
      let body = `<p class="d-status d-${st}">${P.status[st]}</p>`;
      if (st === 'absent') body += `<p>${P.absentLine}</p>`;
      else if (st === 'cancelled') body += `<p>${P.cancelledLine(d.exceptions.map((x) => t('ex')[x]).join('; '))}</p>`;
      else {
        body += `
          <div class="d-sec"><h4>${P.simple}</h4><p>${T.simple}</p></div>
          <div class="d-sec"><h4>${P.affects}</h4><p>${T.affects}</p></div>
          <div class="d-sec"><h4>${P.strengthT}</h4><p><strong>${P.strength[d.level]}.</strong> ${T.why[d.level] || ''}</p></div>
          <div class="d-sec"><h4>${P.notMean}</h4>${ul(T.notMean)}</div>
          <div class="d-sec d-todo"><h4>${P.todo}</h4>${ul(T.todo)}</div>
          <div class="remedies"><h4>${t('remediesTitle')}</h4><p class="hint">${t('remediesNote')}</p>${ul(t('remedies')[d.key])}</div>`;
      }
      body += technical(d);
      return `<div class="dosham-block"><h3>${t(d.key)}</h3>${body}</div>`;
    });

    // Summary at the top
    const present = result.filter((d) => d.present);
    const cancelled = result.filter((d) => d.cancelled);
    const summary = [];
    if (!present.length && !cancelled.length) summary.push(P.foundNone);
    if (present.length) summary.push(P.foundSome(present.length, present.map((d) => `${t(d.key)} (${P.strength[d.level].toLowerCase()})`).join(', ')));
    if (cancelled.length) summary.push(P.cancelledSome(cancelled.map((d) => t(d.key)).join(', ')));
    if (present.some((d) => d.key !== 'kalaSarpa')) summary.push(P.firstStep);
    const summaryHtml = `<div class="d-summary"><h3>${P.summaryTitle}</h3>${ul(summary)}</div>`;

    const off = b.conv.offsetMinutes;
    const sg = off < 0 ? '−' : '+';
    const local = DateTime.fromJSDate(b.conv.utc, { zone: b.zone });
    $('dosham-results').innerHTML = `
      <div class="card">
        <h2>${t('dResult')}${b.name ? ` — ${esc(b.name)}` : ''}</h2>
        <p class="risk">${t('dRisk')}</p>
        <p class="sub hint">${local.toFormat('dd-MM-yyyy hh:mm a')} · ${b.lat.toFixed(4)}, ${b.lon.toFixed(4)} · ${b.zone} UTC${sg}${Math.floor(Math.abs(off) / 60)}:${String(Math.abs(off) % 60).padStart(2, '0')}
          · ${t('lagnam')} ${sign(b.chart.lagnam.sign)} · ${t('rasi')} ${sign(b.chart.summary.rasi)}</p>
        ${summaryHtml}
        ${blocks.join('')}
        <p class="warn">${t('dRiskMore')}</p>
      </div>`;
    $('dosham-results').hidden = false;
  }

  return { relabel: render };
}
