import { describe, it, expect } from 'vitest';
import { fromOpenMeteo, fromPhoton, mergePlaces, parseCoords } from '../src/ui/geocode.js';

describe('place search parsing', () => {
  it('Open-Meteo results include the district', () => {
    const r = fromOpenMeteo({ results: [{ name: 'Kodavasal', admin2: 'Tiruvarur', admin1: 'Tamil Nadu', country: 'India', latitude: 10.85, longitude: 79.48 }] });
    expect(r[0]).toEqual({ label: 'Kodavasal, Tiruvarur, Tamil Nadu, India', lat: 10.85, lon: 79.48 });
  });
  it('Photon (OpenStreetMap) villages are kept, roads and shops dropped', () => {
    const r = fromPhoton({
      features: [
        { geometry: { type: 'Point', coordinates: [79.6371, 10.7672] }, properties: { osm_key: 'place', osm_value: 'village', name: 'Sengalipuram', county: 'Tiruvarur', state: 'Tamil Nadu', country: 'India' } },
        { geometry: { type: 'Point', coordinates: [79.6, 10.7] }, properties: { osm_key: 'highway', osm_value: 'residential', name: 'Sengalipuram Road' } },
      ],
    });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ label: 'Sengalipuram, Tiruvarur, Tamil Nadu, India', kind: 'village', lat: 10.7672, lon: 79.6371 });
  });
  it('merging drops near-duplicates', () => {
    const a = [{ label: 'A', lat: 10, lon: 79 }];
    const b = [{ label: 'A again', lat: 10.005, lon: 79.004 }, { label: 'B', lat: 11, lon: 79 }];
    expect(mergePlaces(a, b).map((x) => x.label)).toEqual(['A', 'B']);
  });
  it('coordinates pasted from Google Maps', () => {
    expect(parseCoords('10.7672, 79.6371')).toEqual({ lat: 10.7672, lon: 79.6371 });
    expect(parseCoords(' 40.7128,-74.0060 ')).toEqual({ lat: 40.7128, lon: -74.006 });
    expect(parseCoords('Chennai')).toBeNull();
    expect(parseCoords('95, 10')).toBeNull();
  });
});
