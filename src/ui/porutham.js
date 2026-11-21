// Porutham (marriage matching) page.
import { DateTime } from 'luxon';
import { porutham, rasisForNakshatra } from '../engine/index.js';
import { NAMES, PORUTHAM, PUI } from '../i18n.js';
import { birthFields, wireBirth, readBirth } from './birthInput.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function personBlock(who) {
  const p = `p-${who}`;
  return `
  <fieldset class="card person" id="${p}">
    <legend data-i18n="${who}"></legend>
    <div class="seg" role="radiogroup">
      <label><input type="radio" name="${p}-mode" value="birth" checked /> <span data-i18n="modeBirth"></span></label>
      <label><input type="radio" name="${p}-mode" value="star" /> <span data-i18n="modeStar"></span></label>
    </div>
    <div class="mode-birth">
      ${birthFields(p)}
    </div>
    <div class="mode-star" hidden>
      <div class="row-2">
        <div class="field"><label for="${p}-star" data-i18n="selectStar"></label><select id="${p}-star"></select></div>
        <div class="field"><label for="${p}-rasi" data-i18n="selectRasi"></label><select id="${p}-rasi"></select></div>
      </div>
    </div>
  </fieldset>`;
}

/**
 * @param {HTMLElement} root container for the porutham view
 * @param {{lang: () => 'ta'|'en', t: (k:string)=>string}} ctx
 * @returns {{relabel: () => void}}
 */
export function initPorutham(root, ctx) {
  root.innerHTML = `
    <form id="porutham-form" novalidate>
      <div class="card"><h2 data-i18n="pTitle"></h2><p class="hint" data-i18n="pIntro"></p></div>
      <div class="persons">${personBlock('girl')}${personBlock('boy')}</div>
      <p id="p-error" class="error" role="alert"></p>
      <button type="submit" class="btn-primary" data-i18n="check"></button>
      <p class="hint privacy" data-i18n="privacy"></p>
    </form>
    <section id="porutham-results" aria-live="polite" hidden></section>`;

  const $ = (id) => root.querySelector(`#${id}`);
  let last = null;

  for (const who of ['girl', 'boy']) {
    const p = `p-${who}`;
    root.querySelectorAll(`input[name="${p}-mode"]`).forEach((r) =>
      r.addEventListener('change', () => {
        const star = root.querySelector(`input[name="${p}-mode"]:checked`).value === 'star';
        $(p).querySelector('.mode-birth').hidden = star;
        $(p).querySelector('.mode-star').hidden = !star;
      })
    );
    wireBirth(root, p, () => {
      $('p-error').textContent = ctx.t('geoError');
    });
    $(`${p}-star`).addEventListener('change', () => fillRasi(who));
  }

  function fillStars(who) {
    const sel = $(`p-${who}-star`);
    const cur = sel.value;
    sel.innerHTML = NAMES.nakshatra[ctx.lang()].map((n, i) => `<option value="${i}">${esc(n)}</option>`).join('');
    if (cur !== '') sel.value = cur;
    fillRasi(who);
  }
  function fillRasi(who) {
    const sel = $(`p-${who}-rasi`);
    const cur = sel.value;
    const opts = rasisForNakshatra(Number($(`p-${who}-star`).value || 0));
    const pada = ctx.lang() === 'ta' ? 'பாதம்' : 'padam';
    sel.innerHTML = opts
      .map((o) => `<option value="${o.rasi}">${esc(NAMES.rasi[ctx.lang()][o.rasi])} (${pada} ${o.padams.join(', ')})</option>`)
      .join('');
    if (opts.some((o) => String(o.rasi) === cur)) sel.value = cur;
  }

  function readPerson(who) {
    const p = `p-${who}`;
    const mode = root.querySelector(`input[name="${p}-mode"]:checked`).value;
    if (mode === 'star') {
      return { nakshatra: Number($(`${p}-star`).value), rasi: Number($(`${p}-rasi`).value), source: 'star' };
    }
    const b = readBirth(root, p);
    if (!b) return null;
    const { summary } = b.chart;
    return { nakshatra: summary.nakshatra, rasi: summary.rasi, pada: summary.pada, name: b.name, source: 'birth', zone: b.zone, conv: b.conv };
  }

  $('porutham-form').addEventListener('submit', (e) => {
    e.preventDefault();
    $('p-error').textContent = '';
    const girl = readPerson('girl');
    const boy = readPerson('boy');
    if (!girl || !boy) {
      $('p-error').textContent = ctx.t('needBoth');
      return;
    }
    last = { girl, boy, result: porutham(girl, boy) };
    render();
    $('porutham-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function render() {
    if (!last) return;
    const L = ctx.lang();
    const t = ctx.t;
    const P = PORUTHAM;
    const { girl, boy, result } = last;
    const who = (x, label) => {
      const lines = [
        `${esc(NAMES.nakshatra[L][x.nakshatra])}${x.pada ? ` · ${t('pada')} ${x.pada}` : ''}`,
        `${t('rasi')}: ${esc(NAMES.rasi[L][x.rasi])}`,
      ];
      if (x.source === 'birth') {
        const off = x.conv.offsetMinutes;
        const sign = off < 0 ? '−' : '+';
        lines.push(
          `<small>${esc(x.zone)} UTC${sign}${Math.floor(Math.abs(off) / 60)}:${String(Math.abs(off) % 60).padStart(2, '0')} · ${DateTime.fromJSDate(x.conv.utc, { zone: 'utc' }).toFormat('yyyy-MM-dd HH:mm')} UTC</small>`
        );
      }
      return `<div class="tile"><span>${t(label)}${x.name ? ` — ${esc(x.name)}` : ''}</span><strong>${lines[0]}</strong><em>${lines.slice(1).join('<br>')}</em></div>`;
    };
    const detail = (it) => {
      const d = it.detail;
      switch (it.key) {
        case 'dinam':
        case 'mahendram':
        case 'streeDeergham':
        case 'rasi':
          return t('count')(d.count);
        case 'ganam':
          return `${P.ganam[L][d.girl]} – ${P.ganam[L][d.boy]}`;
        case 'yoni':
          return `${P.yoni[L][d.girl]} – ${P.yoni[L][d.boy]}`;
        case 'rasiAdhipathi':
          return `${NAMES.graha[L][d.girl]} – ${NAMES.graha[L][d.boy]}`;
        case 'rajju':
          return `${P.rajju[L][d.girl]} – ${P.rajju[L][d.boy]}`;
        default:
          return '';
      }
    };
    const rows = result.items
      .map(
        (it) => `<tr class="lv-${it.level}${it.key === 'rajju' ? ' key-row' : ''}">
          <th scope="row">${P.names[L][it.key]}<small>${esc(P.meaning[L][it.key])}</small></th>
          <td><span class="lv">${P.level[L][it.level]}</span><small>${esc(detail(it))}</small></td>
        </tr>`
      )
      .join('');
    const res = $('porutham-results');
    res.innerHTML = `
      <div class="card">
        <h2>${t('result')}</h2>
        <div class="tiles two">${who(girl, 'girl')}${who(boy, 'boy')}</div>
        <div class="score ${result.rajjuOk ? 'ok' : 'no'}">
          <strong>${result.score}/10</strong>
          <span>${t('score')(result.score)} ${result.rajjuOk ? t('rajjuOk') : t('rajjuNo')}</span>
        </div>
        <div class="table-wrap"><table class="porutham">
          <thead><tr><th>${t('porutham')}</th><th>${t('level')}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
        <p class="warn">${t('guide')}</p>
        <p class="hint">${t('rulesVary')}</p>
      </div>`;
    res.hidden = false;
  }

  return {
    relabel() {
      fillStars('girl');
      fillStars('boy');
      render();
    },
  };
}
