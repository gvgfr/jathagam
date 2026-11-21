# GV Jathagam — Tamil birth chart (jothidam)

A client-side Tamil astrology site: rasi and navamsam charts in the South Indian
square format, nakshatram/padam, lagnam, planet table with vakram, Vimshottari
dasa/bhukti and the panchangam at birth. Tamil/English toggle (Tamil names in
both modes).

**Live:** `https://gvgfr.github.io/jathagam/` — GitHub Actions tests, builds
and deploys every push to `main` (`.github/workflows/pages.yml`).

## Palan (predictions)
The **Palan** tab (`#palan`) is written for people, not astrologers
(`src/palan/plain.js`, texts in `plainTexts.js` and `eventTexts.js`). It uses
the methods working astrologers combine to time events:

* **Signification (KP-style) event matching** — each planet signifies houses
  through where it sits, what it rules and where its star lord sits. A life
  event is indicated when the running period planets signify all its houses
  (e.g. promotion 10+11, property 4+11, marriage 2+7+11, childbirth 2+5+11,
  job change 10+12, expenses 2+12). The shortest period's planet must itself
  back at least half of the houses.
* **Dasa → bhukti → antaram** (`antarams()` in `dasa.js`) for timing down to
  weeks: a month-by-month outlook for the next 12 months.
* **Ashtakavarga** (`src/engine/ashtakavarga.js`, BPHS tables; totals checked
  against the classical 48/49/39/54/56/52/39 = 337) to judge how Saturn and
  Jupiter's transits act on this chart, and **Jupiter–Saturn double transit**
  over the 4th, 5th, 7th, 10th and 11th houses.
* **Divisional charts** D9 (strength), D10 (career) and D7 (children).
* **Age-aware**: events and life areas only where relevant (no education after
  30s; children's milestones and parents from mid-life; marriage timing only
  21–42).
* **Take extra care**: physical-safety caution windows from Mars/Saturn/Raagu
  sub-periods linked to the 8th house and Mars transits over the 1st/8th from
  the Moon or lagnam, phrased as practical care, never as a prediction.
* Every item has a **"Why"** line naming the period planets and their houses.

Sections: In brief · Right now · Month by month · Next few years · Life areas ·
Take extra care · Planets now · Your nature, plus a collapsed
**For astrologers** section. Tone is in words, not colours; only "In brief"
starts open. Health is general wellbeing guidance with a see-a-doctor note;
lifespan is not covered. These are traditional rules: they are not shown to
predict events, and the page says so.

## Bayesian check (`#bayes`)
A tab that tests the traditional rules against the person's own life
(`src/bayes/model.js`, UI `src/ui/bayes.js`). The person lists when big events
happened (marriage, children, job changes, property, moves, injuries, illness,
losses, parents…), with "never happened" for kinds that didn't occur.

* **Model.** For each event kind the person reports: q = share of the checked
  time during which the palan's rule for that kind fired (by antaram), E =
  number of events (a year-only date is spread over the periods it overlaps),
  h = events that fell in fired time. H0 (no connection): each event lands in
  fired time with probability q. H1 (rule works): probability θ > q with
  θ ~ Uniform(q, 1). Bayes factor = ∫_q^1 θ^h(1−θ)^(E−h)dθ/(1−q) ÷ q^h(1−q)^(E−h),
  multiplied across kinds (<1/3 favours no connection, >3 some support, >20
  strong). Kinds marked "never happened" cannot be tested and are not scored.
  The page shows, per kind, how many events chance would put in the rule's
  periods versus how many actually fell there.
* **Birth-time correction.** Candidate times every 5 minutes within the stated
  uncertainty (±15/30/60 min) get posterior ∝ prior × Bayes factor (prior
  highest at the stated time). The site only suggests another time when it beats
  the stated one by a Bayes factor > 3 *and* the rules beat chance there;
  otherwise it says keep your time. A tested synthetic life recovers a true time
  20 minutes away from the stated one.
* **Per-rule results** in plain counts ("fired in 17 periods; 1 of your 2
  events fell in them") with the verdict.
* **Personal forecast** for the next 2 years using only rules with Bayes factor
  > 3 for this person, and only age-appropriate events. If none qualify it says
  so plainly.
* Entries stay on the device; they are saved in the browser only if the person
  ticks "Remember my entries on this phone" (with a "Forget" button).

## Plain-language help
For people who don't know the terminology (`src/help.js`, `src/ui/glossary.js`):

* Every tab opens with a short **"What is this?"** bullet list.
* Result cards have a one-line plain explanation under their heading.
* Tamil/Sanskrit terms (about 55, in both scripts) are **highlighted in blue**
  the first time they appear in each section; tapping one opens a pop-up with a
  simple explanation. Highlighting runs automatically on new content.
* A **FAQ** tab (`#faq`) answers common questions and lists every term.

## Today's panchangam
The **Today** tab (`#today`) shows the panchangam for any place and date
(`src/engine/today.js`): Tamil month and date, weekday, sunrise and sunset,
thithi, nakshatram, yogam and karanam with their end times, and Raagu kaalam,
Yamagandam and Kuligai (daytime split into eight parts by weekday). The place
comes from the geocoder or the browser's location, which stays on the device.

## Temple card
The **Temple** tab (`#temple`), or the **Temple card (for archanai)** button on every chart, opens a large card with
name, nakshatram + padam, rasi, optional gothram and lagnam in Tamil with
English underneath — easy to show a priest. It can be saved as a PNG or shared;
the image is drawn on the device (`src/ui/templeCard.js`) and nothing is uploaded.

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

Results open with a short summary (how many were found and what to do
first). Each dosham found is explained for non-astrologers (`src/doshamTexts.js`):
in simple words, what tradition says it can affect, how strong it is in the
chart (mild / moderate / stronger), what it does NOT mean, and what to do,
separately for people looking for a match and people already married. The rule
and positions sit in a collapsed "For astrologers" section. Results include context
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
analytics. The only network requests are the place-name search: the
[Open-Meteo geocoding API](https://open-meteo.com/en/docs/geocoding-api) first,
and, when it returns few results (often for small villages),
[Photon](https://photon.komoot.io) with OpenStreetMap data. The font is
self-hosted. Coordinates can also be pasted straight into the place box (e.g. `10.7672, 79.6371` from Google Maps), or typed under Settings.

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
