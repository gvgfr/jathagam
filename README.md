# GV Jathagam — Tamil birth chart (jothidam)

A client-side Tamil astrology site: rasi and navamsam charts in the South Indian
square format, nakshatram/padam, lagnam, planet table with vakram, Vimshottari
dasa/bhukti and the panchangam at birth. Tamil/English toggle (Tamil names in
both modes).

**Live:** `https://gvgfr.github.io/jathagam/` — GitHub Actions tests, builds
and deploys every push to `main` (`.github/workflows/pages.yml`).

## Palan (predictions)
The **Palan** tab (`#palan`, also the gold call-to-action card on every chart)
shows rule-based traditional readings generated in `src/palan/` (Tamil and
English). They are specific to the chart:

* **Key points:** strong planets, yogams, running dasa–bhukti, Saturn transit,
  career and marriage lords.
* **Dasa / bhukti:** what the dasa lord rules and where it sits, its dignity,
  and the current plus next three bhuktis with dates.
* **Gocharam (transits today):** Saturn, Guru and Raagu from the Moon sign with
  ingress/egress dates; Ezharai Sani phase and span (or when the next starts),
  Ashtama and Arthashtama Sani (`src/engine/transit.js`).
* **Yogams:** Gajakesari, Budha-Aditya, Chandra-Mangala, the five
  Mahapurusha yogams, Yogakarakan, Raja, Dhana, Parivarthana, Neecha bhanga.
* **Areas of life:** career, marriage, children, education, wealth, home —
  house lord placement and dignity, occupants, aspects (drishti), significators,
  and the coming dasa/bhukti periods traditionally linked with each.
* **House by house** (lord of each house and where it sits) and **planet by planet**.

Significations follow classical conventions (BPHS, Phaladeepika). Every line
is phrased as what tradition says, with a note that these are cultural
beliefs, not proven predictions. Health and lifespan are left out.

## Thirumana porutham (marriage matching)
The **Marriage porutham** tab (`#porutham`) runs the ten traditional Tamil
checks for a bride and groom, from birth details or directly from a known
nakshatram + rasi. Code: `src/engine/porutham.js`, UI `src/ui/porutham.js`.
Counts are inclusive, from the girl's star/sign to the boy's.

| Porutham | Rule used |
|---|---|
| Dinam | star count mod 9 ∈ {2,4,6,8,0} |
| Ganam | same ganam, or deva girl + manushya boy = good; manushya girl + deva boy = fair; any rakshasa mismatch = no |
| Mahendram | star count ∈ {4,7,10,13,16,19,22,25} |
| Stree deergham | star count > 13 good, > 7 fair |
| Yoni | enemy animals (horse–buffalo, elephant–lion, goat–monkey, serpent–mongoose, dog–deer, cat–rat, cow–tiger) = no; same animal good; else fair |
| Rasi | sign count 1 or 7 good; 9–12 fair; 2–6, 8 no |
| Rasi adhipathi | lords friendly both ways good; any enmity no; else fair |
| Vasyam | Tamil almanac vasya table, either direction |
| Rajju | stars must be in different rajju (pada/ooru/naabhi/kanta/siro) |
| Vedhai | the 13 vedha pairs (incl. Mirugaseeridam–Chithirai–Avittam) |

Rules vary between families and almanacs; same-nakshatram exceptions and
Sevvai dosham are not applied. The result is shown as a traditional guide
(score out of 10, rajju highlighted), never as a verdict.

## Dosham (use at your own risk)
The **Dosham** tab (`#dosham`) checks a birth chart against three commonly
printed rules (`src/engine/dosham.js`). It opens with a prominent "use at your
own risk — not accurate" warning, and results appear only after the visitor
ticks an acknowledgement box.

* **Sevvai (Chevvai) dosham:** Mars in the 2nd, 4th, 7th, 8th or 12th house
  from lagnam or the Moon (Venus shown for information). Exceptions applied:
  Mars in own sign or exalted, with Guru or Chandiran, and the house-specific
  exempt signs (2nd: Mithunam/Kanni, 4th: Mesham/Viruchigam, 7th:
  Kadagam/Magaram, 8th: Dhanusu/Meenam, 12th: Rishabam/Thulam).
* **Raagu–Kethu dosham:** Raagu or Kethu in the 1st, 2nd, 7th or 8th house from
  lagnam or the Moon.
* **Kala sarpa dosham:** all seven planets on one side of the Raagu–Kethu axis.

Results say only whether the rule is met, with the reason, plus context
(about 40% of people have Sevvai dosham by the lagnam rule alone). For a
triggered dosham, common traditional remedies (temple visits, worship,
fasting, dosha saamyam in matching) are listed with a note that they are
devotional practices, optional, and that large paid remedies should be avoided.

## Privacy
The site is **unlisted**: a `noindex, nofollow` robots meta tag asks search
engines not to list it, so it is reached only by link. (No robots.txt: it would
have to sit at the domain root, and blocking crawling would hide the noindex tag.)
This is not access control — anyone with the URL can open it.

Everything runs in the browser. No storage (no cookies/localStorage), no
analytics. The only network request is the place-name search to the
[Open-Meteo geocoding API](https://open-meteo.com/en/docs/geocoding-api); the
font is self-hosted. Latitude/longitude can be typed in manually instead.

## Layout
```
src/engine/            calculation engine, no DOM
  astro.js             sidereal positions, Lahiri ayanamsa, nodes, lagnam, sunrise
  nakshatra.js vargas.js dasa.js panchangam.js porutham.js time.js constants.js
  index.js             computeChart(), porutham() — the API the UI uses
src/palan/             rule-based traditional readings
src/i18n.js            Tamil / English names and labels
src/ui/                South Indian chart, geocoder autocomplete, porutham page
test/                  verification tests + Swiss Ephemeris reference data
tools/gen_reference.py regenerates the reference data
```

```sh
npm install
npm test          # vitest
npm run dev       # local dev server
npm run build     # writes dist/ (CI does this for deployment)
```

## Calculation engine
* **Ephemeris:** [Astronomy Engine](https://github.com/cosinekitty/astronomy) (MIT),
  apparent geocentric positions (light-time + aberration).
* **Why not Swiss Ephemeris?** The WebAssembly ports on npm (e.g. `swisseph-wasm`
  0.1.x) are young and the Swiss Ephemeris is dual-licensed **AGPL-3.0 /
  commercial** — bundling it would make the whole site AGPL (source must be
  offered to every visitor) or need a paid licence. Astronomy Engine keeps the
  site MIT and lets us test against Swiss Ephemeris as an *independent* reference.
* **Ayanamsa:** Lahiri (Chitrapaksha), implemented here exactly as Swiss
  Ephemeris `SIDM_LAHIRI` defines it: 23.245524743° at JD 2435553.5, carried by
  IAU 2006 general precession. Sidereal longitude = tropical longitude of the
  mean equinox of date − mean ayanamsa (equivalently true longitude − true ayanamsa).
* **Rahu/Ketu:** mean node (Meeus/ELP formula, default) or true (osculating) node
  from the Moon's instantaneous orbit plane. Ketu = Rahu + 180°.
* **Lagnam:** from apparent sidereal time, true obliquity and latitude.
* **Vakram:** sign of the longitude speed (central difference over ±15 min).
* **Dasa year:** 365.25 days (`DEFAULT_YEAR_DAYS` in `dasa.js`, overridable).
* **Vaaram:** the Tamil day runs sunrise to sunrise; births before local sunrise
  get the previous weekday (flagged in the output).
* **Time zones:** IANA zone from lat/long via `@photostructure/tz-lookup`, local
  → UTC with Luxon (uses the browser's tz database, so historical offsets and DST
  rules are applied for the exact date). Non-existent (spring-forward) times are
  flagged; ambiguous (fall-back) times use the first, daylight-saving occurrence.
  Caveat: tzdb treats all of India as IST/Madras time; births recorded in
  **Bombay Time (UTC+4:51, until 1955)** or **Calcutta Time (UTC+5:53, until
  1948)** need the manual offset under *Settings*.

## Verification
`test/engine.test.js` compares the engine with Swiss Ephemeris 2.10.03 (the
engine inside Jagannatha Hora) using `SIDM_LAHIRI` and the full `.se1`
ephemeris files. References are produced by `tools/gen_reference.py`; local
time → UTC for them is done independently with Python's `zoneinfo`.

* 7 reference charts, end to end from local time + place, including Chennai
  1943 (India war time, UTC+6:30), Madurai 1931, New York July 1990 (EDT) and
  Chicago 2008 (first day of the new US DST rules).
* A random sweep of 150 instants/places between 1900 and 2050.
* Tolerances asserted: grahas ≤ 1′, lagnam ≤ 3′, ayanamsa ≤ 1″.
* Measured worst case: Sun 1.4″, Moon 9″, other planets ≤ 13″, mean node 0.1″,
  true node 14″, lagnam 0.2″, ayanamsa 0.13″; vakram flags all match.
  (The Moon drifts after ~2050 because the two libraries extrapolate ΔT
  differently; irrelevant for birth charts.)
* DST gap/overlap and pre-/post-2007 US rules; unit tests for navamsam,
  nakshatra/padam boundaries, dasa sequence and naming.

## Phase 2 hooks (not built)
* **Today's panchangam + rahu kalam:** `panchangam(date, lat, lon)` and the
  sunrise helpers in `astro.js` take any instant/location.
* **Vakya vs Thirukanitha:** `SYSTEMS` in `engine/index.js`; `computeChart`
  takes `{ system }` (only `thirukanitha` is implemented).

## Licences
App code MIT. Astronomy Engine MIT, Luxon MIT, tz-lookup CC0, Noto Sans Tamil
OFL-1.1. Swiss Ephemeris (AGPL) is used only offline to produce test data and
is not shipped.
