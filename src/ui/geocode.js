// Place search. Two free, key-less, CORS-enabled geocoders:
//  1. Open-Meteo (GeoNames data): fast, good for towns and cities.
//  2. Photon by Komoot (OpenStreetMap data): far better coverage of small
//     villages; used when Open-Meteo returns few results.
// Only the typed place name is sent; nothing else leaves the browser.
const OPEN_METEO = 'https://geocoding-api.open-meteo.com/v1/search';
const PHOTON = 'https://photon.komoot.io/api/';
const ENOUGH = 4; // fewer Open-Meteo results than this -> also ask OpenStreetMap

const label = (...parts) => [...new Set(parts.filter(Boolean))].join(', ');

export function fromOpenMeteo(data) {
  return (data.results || []).map((r) => ({
    label: label(r.name, r.admin2, r.admin1, r.country),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

// Photon returns GeoJSON; keep places (not roads/shops), show district + state.
const PLACE_KEYS = new Set(['place', 'boundary']);
export function fromPhoton(data) {
  return (data.features || [])
    .filter((f) => f.geometry?.type === 'Point' && PLACE_KEYS.has(f.properties?.osm_key))
    .map((f) => {
      const p = f.properties;
      const kind = ['village', 'hamlet', 'town', 'suburb', 'neighbourhood', 'locality', 'isolated_dwelling'].includes(p.osm_value) ? p.osm_value : '';
      return {
        label: label(p.name, p.district || p.county, p.state, p.country),
        kind,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      };
    });
}

/** "lat, lon" typed or pasted (Google Maps format) -> {lat, lon} or null. */
export function parseCoords(text) {
  const m = /^\s*(-?\d{1,2}(?:\.\d+)?)°?\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)°?\s*$/.exec(text || '');
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

/** Merge lists, dropping places within ~2 km of one already listed. */
export function mergePlaces(a, b, max = 10) {
  const out = [...a];
  for (const p of b) {
    if (!out.some((q) => Math.abs(q.lat - p.lat) < 0.02 && Math.abs(q.lon - p.lon) < 0.02)) out.push(p);
  }
  return out.slice(0, max);
}

/**
 * Spelling-tolerant key for Tamil/Indian place names written in English:
 * Pappiredipatti, Pappireddipatti and Papireddypatti all give the same key.
 */
export function nameKey(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
    .replace(/zh/g, 'l')
    .replace(/([tdsckgpb])h/g, '$1')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/y/g, 'i')
    .replace(/w/g, 'v')
    .replace(/(.)\1+/g, '$1');
}

/** Edit distance (small strings only). */
export function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Keep places whose name is a close spelling match for what was typed. */
export function closeMatches(query, places, nameOf) {
  const q = nameKey(query.split(',')[0]);
  const tol = q.length >= 8 ? 2 : 1;
  return places.filter((p) => {
    const k = nameKey(nameOf(p));
    return k.startsWith(q) || editDistance(q, k.slice(0, q.length + 1)) <= tol || editDistance(q, k) <= tol;
  });
}

async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Geocoder HTTP ${res.status}`);
  return res.json();
}

export async function searchPlaces(query, signal) {
  const found = await searchExact(query, signal);
  if (found.length || query.trim().length < 5) return found;
  // Nothing found: the spelling may differ (single/double letters, th/t, zh/l...).
  // Search a shorter prefix and keep names that are a close spelling match.
  const words = query.split(',')[0].trim();
  const prefix = words.slice(0, Math.max(4, Math.ceil(words.length / 2)));
  try {
    const data = await getJson(`${OPEN_METEO}?name=${encodeURIComponent(prefix)}&count=50&language=en&format=json`, signal);
    const raw = (data.results || []).filter((r) => closeMatches(words, [r], (x) => x.name).length);
    return fromOpenMeteo({ results: raw }).slice(0, 10);
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    return [];
  }
}

async function searchExact(query, signal) {
  let first = [];
  let firstErr = null;
  try {
    first = fromOpenMeteo(await getJson(`${OPEN_METEO}?name=${encodeURIComponent(query)}&count=8&language=en&format=json`, signal));
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    firstErr = e;
  }
  if (first.length >= ENOUGH) return first;
  try {
    const more = fromPhoton(await getJson(`${PHOTON}?q=${encodeURIComponent(query)}&limit=10&lang=en`, signal));
    return mergePlaces(first, more);
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    if (firstErr && !first.length) throw firstErr;
    return first;
  }
}

/**
 * Wire an <input> + <ul role=listbox> pair into an accessible autocomplete.
 * @param {HTMLInputElement} input
 * @param {HTMLUListElement} list
 * @param {(place:{label:string,lat:number,lon:number})=>void} onPick
 * @param {(err:Error)=>void} onError
 */
export function attachAutocomplete(input, list, onPick, onError) {
  let timer = 0;
  let ctrl = null;
  let items = [];
  let active = -1;

  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    active = -1;
  };
  const render = () => {
    list.innerHTML = '';
    items.forEach((p, i) => {
      const li = document.createElement('li');
      li.role = 'option';
      li.id = `${list.id}-opt-${i}`;
      li.textContent = p.label;
      const sub = document.createElement('small');
      sub.textContent = `${p.kind ? ` · ${p.kind}` : ''} · ${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}`;
      li.append(sub);
      li.setAttribute('aria-selected', String(i === active));
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        pick(i);
      });
      list.append(li);
    });
    list.hidden = items.length === 0;
    input.setAttribute('aria-expanded', String(!list.hidden));
    if (active >= 0) input.setAttribute('aria-activedescendant', `${list.id}-opt-${active}`);
    else input.removeAttribute('aria-activedescendant');
  };
  const pick = (i) => {
    const p = items[i];
    if (!p) return;
    input.value = p.label;
    close();
    onPick(p);
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    // Coordinates pasted from Google Maps, e.g. "10.7672, 79.6371"
    const c = parseCoords(q);
    if (c) {
      items = [];
      render();
      onPick({ label: `${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}`, lat: c.lat, lon: c.lon, keepText: true });
      return;
    }
    if (q.length < 2) {
      items = [];
      render();
      return;
    }
    timer = setTimeout(async () => {
      ctrl?.abort();
      ctrl = new AbortController();
      try {
        items = await searchPlaces(q, ctrl.signal);
        active = -1;
        render();
      } catch (e) {
        if (e.name !== 'AbortError') onError(e);
      }
    }, 300);
  });
  input.addEventListener('keydown', (e) => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown') active = Math.min(items.length - 1, active + 1);
    else if (e.key === 'ArrowUp') active = Math.max(0, active - 1);
    else if (e.key === 'Enter') {
      e.preventDefault();
      pick(active < 0 ? 0 : active);
      return;
    } else if (e.key === 'Escape') return close();
    else return;
    e.preventDefault();
    render();
  });
  input.addEventListener('blur', () => setTimeout(close, 150));
}
