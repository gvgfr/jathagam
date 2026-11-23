// Shared birth-details fields (date, time, place with autocomplete, manual
// lat/long) used by the dosham and Bayesian pages.
import { computeChart, localToUtc, zoneFor, parseTimeValue } from '../engine/index.js';
import { attachAutocomplete } from './geocode.js';

/** HTML for the fields; ids are prefixed with `p` (e.g. "p-girl"). */
export function birthFields(p) {
  return `
      <div class="field">
        <label for="${p}-name" data-i18n="name"></label>
        <input id="${p}-name" type="text" autocomplete="off" maxlength="60" />
      </div>
      <div class="row-2">
        <div class="field">
          <label for="${p}-date" data-i18n="dob"></label>
          <input id="${p}-date" type="date" min="1800-01-01" max="2199-12-31" />
        </div>
        <div class="field time-field">
          <label for="${p}-tob" data-i18n="tob"></label>
          <input id="${p}-tob" type="time" />
        </div>
      </div>
      <div class="field place-field">
        <label for="${p}-place" data-i18n="pob"></label>
        <input id="${p}-place" type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${p}-list" data-i18n-placeholder="placeHint" />
        <ul id="${p}-list" class="place-list" role="listbox" hidden></ul>
        <p class="hint" data-i18n="villageHint"></p>
      </div>
      <details class="more">
        <summary data-i18n="manualCoords"></summary>
        <div class="row-2">
          <div class="field"><label for="${p}-lat" data-i18n="lat"></label><input id="${p}-lat" type="number" step="any" min="-90" max="90" /></div>
          <div class="field"><label for="${p}-lon" data-i18n="lon"></label><input id="${p}-lon" type="number" step="any" min="-180" max="180" /></div>
        </div>
      </details>
`;
}

/** Hook up the place autocomplete for prefix `p` inside `root`. */
export function wireBirth(root, p, onGeoError) {
  const $ = (id) => root.querySelector(`#${id}`);
  attachAutocomplete(
    $(`${p}-place`),
    $(`${p}-list`),
    (pl) => {
      $(`${p}-lat`).value = pl.lat.toFixed(4);
      $(`${p}-lon`).value = pl.lon.toFixed(4);
    },
    () => {
      $(`${p}-place`).closest('.mode-birth, .birth-fields').querySelector('details.more').open = true;
      onGeoError();
    }
  );
}

/**
 * Read and validate the fields; returns null when incomplete.
 * @returns {{name:string, lat:number, lon:number, zone:string, conv:object, chart:object}|null}
 */
export function readBirth(root, p, opts = {}) {
  const $ = (id) => root.querySelector(`#${id}`);
  const [y, mo, d] = ($(`${p}-date`).value || '').split('-').map(Number);
  const clock = parseTimeValue($(`${p}-tob`).value);
  const lat = parseFloat($(`${p}-lat`).value);
  const lon = parseFloat($(`${p}-lon`).value);
  if (!y || !mo || !d || !clock) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const zone = zoneFor(lat, lon);
  const conv = localToUtc({ year: y, month: mo, day: d, hour: clock.hour, minute: clock.minute }, zone);
  if (!conv.valid) return null;
  const chart = computeChart({ utc: conv.utc, lat, lon }, opts);
  return { name: $(`${p}-name`).value.trim(), lat, lon, zone, conv, chart };
}
