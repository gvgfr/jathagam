// Today's panchangam and Raagu kaalam for a chosen place and date.
import { DateTime } from 'luxon';
import { dailyPanchangam, zoneFor, dailyReading, gocharam, rasisOfStar } from '../engine/index.js';
import { generatePalan } from '../palan/index.js';
import { EVENTS, EVENT_TEXT } from '../palan/eventTexts.js';

const CARE_KEYS = [...EVENTS.filter((e) => e.care).map((e) => e.key), 'safety', 'parents'];
import { NAMES, TAMIL_MONTHS, thithiName, TODAY_TEXT } from '../i18n.js';
import { attachAutocomplete, parseCoords } from './geocode.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function initToday(root, ctx) {
  root.innerHTML = `
    <form id="today-form" class="card form-card" novalidate>
      <h2 data-i18n="todayTitle"></h2>
      <p class="hint" data-i18n="todayIntro"></p>
      <div class="field place-field">
        <label for="t-place" data-i18n="place"></label>
        <input id="t-place" type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="t-list" data-i18n-placeholder="placeHint" />
        <ul id="t-list" class="place-list" role="listbox" hidden></ul>
      </div>
      <div class="row-2">
        <div class="field">
          <button type="button" class="btn-ghost dark loc-btn" id="t-loc" data-i18n="useLocation"></button>
        </div>
        <div class="field">
          <label for="t-date" data-i18n="date"></label>
          <input id="t-date" type="date" />
        </div>
      </div>
      <fieldset class="field t-star">
        <legend data-i18n="yourStar"></legend>
        <div class="row-2">
          <div class="field"><label for="t-nak" data-i18n="nakshatra"></label><select id="t-nak"></select></div>
          <div class="field"><label for="t-rasi" data-i18n="rasi"></label><select id="t-rasi"></select></div>
        </div>
        <p class="hint" data-i18n="yourStarHint"></p>
      </fieldset>
      <p id="t-error" class="error" role="alert"></p>
      <button type="submit" class="btn-primary" data-i18n="show"></button>
    </form>
    <section id="today-results" aria-live="polite" hidden></section>`;

  const $ = (id) => root.querySelector(`#${id}`);
  let place = null; // {label, lat, lon}
  let last = null;
  $('t-date').value = DateTime.local().toISODate();

  attachAutocomplete(
    $('t-place'),
    $('t-list'),
    (pl) => {
      place = pl;
      $('t-error').textContent = '';
      show();
    },
    () => ($('t-error').textContent = ctx.t('geoError'))
  );
  $('t-place').addEventListener('input', () => {
    if (!parseCoords($('t-place').value)) place = null;
  });

  $('t-loc').addEventListener('click', () => {
    if (!navigator.geolocation) {
      $('t-error').textContent = ctx.t('locFailed');
      return;
    }
    $('t-error').textContent = ctx.t('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        place = { label: ctx.t('myLocation'), lat: pos.coords.latitude, lon: pos.coords.longitude, mine: true };
        $('t-place').value = `${ctx.t('myLocation')} (${place.lat.toFixed(3)}, ${place.lon.toFixed(3)})`;
        $('t-error').textContent = '';
        show();
      },
      () => ($('t-error').textContent = ctx.t('locFailed')),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
    );
  });

  // birth star and rasi for the personal card (kept in memory only)
  const birth = { nakshatra: null, rasi: null, chart: null };
  let seenChart = null; // the last chart from the Jathagam tab that was applied here
  function fillStarSelects() {
    const Lg = ctx.lang();
    const choose = `<option value="">${esc(ctx.t('choose'))}</option>`;
    $('t-nak').innerHTML = choose + NAMES.nakshatra[Lg].map((n, i) => `<option value="${i}">${esc(n)}</option>`).join('');
    const rasis = birth.nakshatra != null ? rasisOfStar(birth.nakshatra) : [...Array(12).keys()];
    $('t-rasi').innerHTML = choose + rasis.map((r) => `<option value="${r}">${esc(NAMES.rasi[Lg][r])}</option>`).join('');
    $('t-nak').value = birth.nakshatra ?? '';
    $('t-rasi').value = birth.rasi != null && rasis.includes(birth.rasi) ? birth.rasi : '';
  }
  $('t-nak').addEventListener('change', () => {
    birth.nakshatra = $('t-nak').value === '' ? null : Number($('t-nak').value);
    birth.chart = null;
    const rs = birth.nakshatra != null ? rasisOfStar(birth.nakshatra) : null;
    if (rs && rs.length === 1) birth.rasi = rs[0];
    else if (rs && !rs.includes(birth.rasi)) birth.rasi = null;
    fillStarSelects();
    if (last) render();
  });
  $('t-rasi').addEventListener('change', () => {
    birth.rasi = $('t-rasi').value === '' ? null : Number($('t-rasi').value);
    birth.chart = null;
    if (last) render();
  });

  $('today-form').addEventListener('submit', (e) => {
    e.preventDefault();
    show();
  });

  function show() {
    if (!place) {
      $('t-error').textContent = ctx.t('needPlace');
      return;
    }
    const zone = zoneFor(place.lat, place.lon);
    const date = $('t-date').value || DateTime.now().setZone(zone).toISODate();
    last = { place, zone, p: dailyPanchangam(date, place.lat, place.lon, zone) };
    render();
    $('today-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function render() {
    if (!last) return;
    const Lg = ctx.lang();
    const t = ctx.t;
    const { place: pl, zone, p } = last;
    const res = $('today-results');
    if (p.polar) {
      res.innerHTML = `<div class="card"><p>${t('polar')}</p></div>`;
      res.hidden = false;
      return;
    }
    const tm = (d) => {
      const x = DateTime.fromJSDate(d, { zone });
      const nd = x.toISODate() !== p.date ? ` <small>${x.toFormat('dd/MM')}</small>` : '';
      return `${x.toFormat('hh:mm a')}${nd}`;
    };
    const nowMs = Date.now();
    const isToday = DateTime.now().setZone(zone).toISODate() === p.date;
    const seqLine = (arr, nameOf) =>
      arr
        .map((x, i) => `${i ? `<span class="then">${t('then')}</span> ` : ''}<strong>${nameOf(x.index)}</strong> <span class="till">${t('till')} ${tm(x.end)}</span>`)
        .join('<br>');
    const thName = (i) => `${NAMES.paksha[Lg][i < 15 ? 'valarpirai' : 'theipirai']} ${thithiName(i, Lg)}`;
    const period = (key, x) => {
      const active = isToday && nowMs >= x.start && nowMs < x.end;
      return `<div class="period${active ? ' active' : ''}"><span>${t(key)}</span><strong>${tm(x.start)} – ${tm(x.end)}</strong>${active ? `<em class="badge">${t('now')}</em>` : ''}</div>`;
    };
    const day = DateTime.fromISO(p.date, { zone });
    const L = TODAY_TEXT[Lg];
    let personal = `<div class="card pd"><p>${L.needStar}</p></div>`;
    if (birth.nakshatra != null && birth.rasi != null) {
      const go = gocharam(birth.rasi, new Date((p.sunrise.getTime() + p.sunset.getTime()) / 2));
      const r = dailyReading(birth, p, go);
      const span = (a, b) => {
        const f = (x) => DateTime.fromJSDate(x, { zone }).setLocale(Lg === 'ta' ? 'ta-IN' : 'en-GB').toFormat('EEE d LLL, h:mm a');
        return `${f(a)} – ${f(b)}`;
      };
      const monthOf = (x) => DateTime.fromJSDate(x, { zone }).setLocale(Lg === 'ta' ? 'ta-IN' : 'en-GB').toFormat('LLL yyyy');
      // this season: the current sub-period from the person's own chart (only when it came from the Jathagam tab)
      let season = null;
      let seasonCare = false;
      if (birth.chart) {
        const pl = generatePalan(birth.chart, Lg, (a, b) => monthOf(b), new Date(p.sunrise), (x) => monthOf(x), (x) => monthOf(x), null);
        const it = pl.sections.find((x) => x.key === 'now')?.items?.[0];
        const text = it?.p?.[0];
        // skip the "quieter phase" line; cautions go under "be careful about"
        if (text && text !== EVENT_TEXT.quiet[Lg][0]) {
          season = L.season(it.h, text);
          seasonCare = CARE_KEYS.some((k) => EVENT_TEXT[k]?.[Lg][0] === text);
        }
      }
      const look = [...r.look.map((l) => L.line[l.key]), ...(season && !seasonCare ? [season] : []), ...r.background.filter((x) => x.key === 'guruGood').map((x) => L.bg[x.key](monthOf(x.until)))];
      const care = [
        ...(r.chand ? [L.chandOn(span(r.chand.start, r.chand.end))] : []),
        ...(season && seasonCare ? [season] : []),
        ...r.care.filter((l) => l.key !== 'h8all').map((l) => L.line[l.key]),
        ...(r.taraWeak && !r.chand ? [L.taraCare] : []),
        ...r.background.filter((x) => x.key !== 'guruGood').map((x) => L.bg[x.key](monthOf(x.until))),
      ];
      const ul = (xs) => `<ul class="pd-list">${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
      personal = `<div class="card pd">
        <h2>${L.title}</h2>
        <p class="pd-verdict pd-v-${r.verdict}">${L.verdict[r.verdict]}</p>
        ${look.length ? `<h3>${L.lookTitle}</h3>${ul(look)}` : ''}
        ${care.length ? `<h3>${L.careTitle}</h3>${ul(care)}` : ''}
        <p class="pd-times">${L.avoidTimes(`${tm(p.raaguKaalam.start)} – ${tm(p.raaguKaalam.end)}`, `${tm(p.yamagandam.start)} – ${tm(p.yamagandam.end)}`)}</p>
        <p class="hint">${esc(L.nextChand(r.nextChandrashtamam.map((c) => span(c.start, c.end)).join('; ')))}</p>
        <p class="hint">${esc(L.why(NAMES.rasi[Lg][r.moonMain.sign], r.moonMain.house, NAMES.nakshatra[Lg][r.taraMain.index], L.taraName[r.taraMain.tara]))} ${esc(L.label)}</p>
      </div>`;
    }
    res.innerHTML = personal + `
      <div class="card today">
        <div class="today-head">
          <div class="tamil-date">${TAMIL_MONTHS[Lg][p.tamilMonth]} ${p.tamilDay}</div>
          <div>${NAMES.vaaram[Lg][p.weekday]} · ${day.toFormat('dd-MM-yyyy')}</div>
          <div class="hint">${esc(pl.label)} · ${zone}</div>
        </div>
        <div class="periods">
          ${period('raagu', p.raaguKaalam)}
          ${period('yama', p.yamagandam)}
          ${period('kuligai', p.kuligai)}
        </div>
        <p class="hint">${t('avoid')}</p>
        <dl class="kv today-kv">
          <dt>${t('sunrise')}</dt><dd>${tm(p.sunrise)}</dd>
          <dt>${t('sunset')}</dt><dd>${tm(p.sunset)}</dd>
          <dt>${t('thithi')}</dt><dd>${seqLine(p.thithi, thName)}</dd>
          <dt>${t('nakshatra')}</dt><dd>${seqLine(p.nakshatra, (i) => NAMES.nakshatra[Lg][i])}</dd>
          <dt>${t('yogam')}</dt><dd>${seqLine(p.yogam, (i) => NAMES.yogam[Lg][i])}</dd>
          <dt>${t('karanam')}</dt><dd>${seqLine(p.karanam, (i) => NAMES.karanam[Lg][i])}</dd>
        </dl>
      </div>`;
    res.hidden = false;
  }

  fillStarSelects();
  return {
    relabel() {
      fillStarSelects();
      render();
    },
    /** Use the birth star and rasi from the Jathagam tab, unless the person already chose one here. */
    setBirth(b) {
      // every newly cast chart wins; a star picked by hand here is kept only until the next new chart
      if (b.chart && b.chart === seenChart) return;
      seenChart = b.chart || null;
      birth.nakshatra = b.nakshatra;
      birth.rasi = b.rasi;
      birth.chart = b.chart || null;
      fillStarSelects();
      if (last) render();
    },
  };
}
