# GV Jathagam: summary for independent verification

> **Update (Nov 2026):** the forecasting maths was audited and revised. See **AUDIT.md** for the current model: spike-and-slab λ, distinct-model count, predictive out-of-sample test, event definitions, sealed forecast records, and the evaluation harness (`npm run eval`). Figures in section 4 below are the earlier ones.
>
> **Removed (Nov 2026):** the Porutham tab and the experimental Western / Research tab no longer exist; references to them below are historical.

- **Live site:** https://gvgfr.github.io/jathagam/
- **Code:** github.com/gvgfr/jathagam. The repo is public, and every push to `main` deploys to GitHub Pages through GitHub Actions (`.github/workflows/pages.yml`).
- **Latest deployed commit:** `7c28066`.
- **Status:** 167 unit tests pass (`npm test`, vitest).

The site was first built inside gvgfr/GMDB (masalameterratings.com) under `/jathagam/`. It was moved to its own repo, and GMDB PR #86 removed it from there.

## 1. What the site is

It is a Tamil astrology (jothidam) website, in Tamil and English. It runs **entirely in the browser**:

- There is no backend.
- Birth details are never sent anywhere. The only network call is the place-name lookup, to Open-Meteo geocoding with a Photon/OpenStreetMap fallback.
- Some optional data is kept in `localStorage`, and only if the user ticks "remember": the Bayesian events and saved forecasts.
- A `noindex` meta tag keeps search engines from listing the site.

**Stack:** Vite 8, vanilla JS, vitest. Dependencies:

- `astronomy-engine` 2.1.19 (MIT): planet positions.
- `luxon`: time zones.
- `@photostructure/tz-lookup`: time zone from latitude and longitude.
- `@fontsource/noto-sans-tamil`.

## 2. Tabs and features

| Tab | What it does |
|---|---|
| **Jathagam** | Birth details (with place search) produce: <ul><li>South-Indian rasi and navamsam charts</li><li>A planet table (sidereal longitude, rasi, nakshatram/padam, vakram)</li><li>Lagnam</li><li>Vimshottari dasa/bhukti</li><li>Birth panchangam</li></ul>Options: mean or true Rahu; Lahiri, KP or Raman ayanamsa. Supports Print/PDF. |
| **Palan** (predictions) | A plain-language reading for non-astrologers: <ul><li>"In brief", a written paragraph</li><li>Now, the coming months, the years ahead</li><li>Six life areas (family/relationships, children, health, career, money, education), adjusted for age</li><li>Career/study pointers</li><li>Safety periods, transits, nature</li></ul>Technical sections are collapsed. Only "In brief" starts open. There is no colour coding. A switch selects Simplified (Parasari) or KP. A banner shows the person's own Bayesian check result. |
| **Today** | Panchangam for any place and date (thithi, nakshatram, yogam, karanam, Tamil month/date, sunrise/sunset) and Raagu kaalam, Yamagandam, Kuligai. |
| **Temple** | A quick card with star, rasi and gothram fields for archanai, downloadable as a 1080×1440 PNG. |
| **Porutham** | Marriage matching: the 10 Tamil poruthams and dosham comparison. |
| **Dosham** | Chevvai/Mangal, Rahu-Ketu (sarpa/naga), Kala Sarpa, and others. Each has a level (mild/moderate/strong), plain-language meaning, what to do, and traditional remedies. A strong "use at your own risk, not accurate" disclaimer is shown. |
| **Bayesian check** | The user enters real life events (marriage, children, job changes, moves, injuries, and so on). The site tests whether astrology "predicted" them better than chance. Details in section 4. |
| **FAQ / glossary** | Tamil and Sanskrit terms are highlighted and open a pop-up explanation on tap. Each tab has a plain-language intro, and there is an FAQ. |

Across the site:

- Tamil/English toggle; Tamil names are used in both modes.
- Mobile layout. iPhone 13 was checked with Playwright.
- "Use these birth details" prefills the Bayesian and Dosham forms from the Jathagam tab.

## 3. Calculation method (please verify)

**Ayanamsa: Lahiri (Chitra paksha)**

- The mean ayanamsa is 23.245524743° at JD 2435553.5, with IAU2006 precession, plus nutation in longitude (dpsi).
- Sidereal longitude = true-of-date tropical longitude − (mean ayanamsa + dpsi). This matches the Swiss Ephemeris `SE_SIDM_LAHIRI` convention.
- KP ayanamsa = Lahiri − 0.09685°.
- Raman ayanamsa = Lahiri − 1.446301°.

**Rahu/Ketu.** Mean node, or true node (osculating lunar orbit intersected with the ecliptic of date).

**Lagnam.** Ascendant from local sidereal time and true obliquity.

**Placidus cusps (KP).** Semi-arc iteration. Agrees with Swiss Ephemeris to within about 0.004′.

**Verification already done.** Results were compared with pyswisseph (Swiss Ephemeris) for:

- Reference charts: `test/reference-charts.json`.
- A sweep of dates from 1900 to 2050: `test/reference-sweep.json`.
- KP cusps and sub-lords: `test/reference-kp.json`.

Planet tolerance is under 1 arcminute (most cases are a few arcseconds).

**Time handling.**

- Local time is converted to UTC with the IANA zone found from latitude and longitude, using historical offsets from luxon.
- An ambiguous DST time takes the **first** occurrence.
- Inputs like 00:30 and 24-hour times are accepted.

**Vimshottari dasa.**

- The balance comes from the Moon's position in its nakshatram.
- The year length can be set to 365.25 (default), 360, or 365.2564 days.
- Bhukti and antaram are proportional.

**Panchangam.**

- Thithi = floor((Moon − Sun) / 12°). Nakshatram = floor(Moon / 13°20′). Yogam and karanam use standard formulas.
- The weekday changes at sunrise.
- Raagu kaalam etc. split daytime into 8 parts:
  - Raagu: parts [8,2,7,5,6,4,3], indexed Sunday to Saturday.
  - Yamagandam: [5,4,3,2,1,7,6].
  - Kuligai: [7,6,5,4,3,2,1].
- Tamil month = sidereal Sun sign. If the sankranti is before sunset, that day is day 1.

**Navamsam (D9)**, plus D7 (saptamsam) and D10 (dasamsam), use standard Parasari varga rules.

**Ashtakavarga.** BPHS tables. The sarva totals are 48/49/39/54/56/52/39, which sum to 337, and a test checks this.

**Porutham.** The ten Tamil poruthams: dina, gana, mahendra, stree-deergha, yoni, rasi, rasi-adhipati, vasya, rajju, vedhai.

**KP.** Star lord and sub lord for each planet and cusp; four-level significators; Rahu/Ketu acting as agents; promise from the cusp sub-lord; event house groups.

## 4. Prediction logic (Palan) and its honesty checks

**How the Palan predicts.**

- A planet signifies the house it occupies, the houses it owns, and the house of its star lord.
- Life events are defined as house combinations, for example marriage = 2/7/11 and job change = 2/6/10.
- Dasa → bhukti → antaram are checked. An event "fires" when the period lords signify enough of its houses. The antaram lord must back at least half of the event's houses.
- Timing is refined with ashtakavarga, the double transit of Jupiter and Saturn, and the D7, D9 and D10 charts.

**Content rules.** Readings are age-aware: no education talk at 49. Generic filler such as travel, pilgrimage and "keep your documents" was removed.

**Bayesian check** (`src/bayes/robust.js`).

- **Models.** 18 in total:
  - Parasari × {Lahiri, Raman} × {mean, true node} × {365.25, 360, 365.2564-day year}.
  - KP × {node} × {year length}.
- **Uncertainty.** A small grid of birth times around the given time.
- **Chance level.** The chance of each event kind at each age is age-aware (a Gaussian per event kind).
- **Likelihood.** A pooled "hit lift" λ: P(hit) = q + λ(1−q), where q is the share of time the rule is "on" by chance, with λ ~ Uniform(0,1).
- **Output:**
  - A model-averaged Bayes factor against pure chance.
  - An out-of-sample test that fits on events before the median date and tests on events after it.
  - 12-month probability forecasts per event kind.
  - Brier scoring once forecasts resolve.
- **The owner's own result** (born 28 Jul 1977, 00:30): average BF ≈ 0.14 (favours chance), λ ≈ 9%, out-of-sample BF ≈ 0.20. This is consistent with the published research below.

**Research basis.** A report was written separately: `/home/user/reports/Astrology predictive validity evidence.md`. These controlled tests find no predictive ability above chance:

- Carlson 1985, *Nature*.
- Dean & Kelly 2003, *J. Consciousness Studies* (time twins).
- Narlikar et al. 2009, *Current Science* (Indian astrologers).
- Clearer Thinking 2024.

The site says so honestly and presents readings as cultural and traditional, not proven.

## 5. In progress: uncommitted and not yet deployed

`src/engine/calendar.js` is new and not yet committed, tested or wired into the UI. It contains:

- `dayInfo`/`scanDays`: sunrise and sunset per day, thithi at sunrise/sunset/afternoon, nakshatram, Tamil month and date.
- `tamilCalendar(year, lat, lon, zone)`: about 24 festivals plus monthly observances (amavasai, pournami, ekadasi, pradosham, sashti, sankatahara chathurthi, karthigai star).
- `starBirthdays`: the nakshatra birthday, i.e. the day in the birth Tamil month when the birth star is at sunrise.
- `thithiOf` / `thithiDates`: shraddham dates, with the thithi judged in the afternoon.
- `toICS`: calendar export.

Its output for Chennai 2026 should be checked against a printed Tamil panchangam:

| Festival | Date |
|---|---|
| Pongal | 14 Jan |
| Thai Poosam | 1 Feb |
| Maha Shivaratri | 15 Feb |
| Puthandu | 14 Apr |
| Chithra Pournami | 1 May |
| Krishna Jayanthi | 4 Sep |
| Vinayagar Chathurthi | 15 Sep |
| Mahalaya Amavasai | 10 Oct |
| Navaratri | starts 11 Oct |
| Saraswathi Puja | 20 Oct |
| Vijayadasami | 21 Oct |
| Deepavali | 8 Nov |
| Karthigai Deepam | 24 Nov |
| Vaikunta Ekadasi | 20 Dec |

The rules follow the Thirukanitha (computed) calendar. Vakya panchangams can differ by a day.

Planned but **not built yet**:

- Calendar UI with .ics export, star birthday card, thithi finder, and baby-name letters (namakshara).
- Brier skill score, "what counts as yes" text, a hash and timestamp on saved forecasts, and a calibration chart.
- Prompts in the event form (list every event, mark year-only dates as weaker, warn on round birth times).
- A sourced "what research says" note on the Palan, Dosham and Porutham tabs.

## 6. Suggested checks for the verifier

1. **Positions.** Compare planets, lagnam and nakshatram for a few charts against Jagannatha Hora or astro.com (Lahiri). Try 28 Jul 1977 00:30 IST in Chennai, plus a southern-hemisphere chart and a DST case in the US or UK.
2. **Dasa.** Compare dasa start dates with Jagannatha Hora using a 365.25-day year.
3. **Daily panchangam and Raagu kaalam.** Compare a few dates against drikpanchang.com (Chennai) and check the sunrise times.
4. **Porutham.** Compare scores for 2–3 couples with a standard Tamil porutham calculator.
5. **Festival dates.** Check the section 5 table against a Tamil panchangam.
6. **Privacy.** Check the claim in the browser DevTools Network tab. The only outbound request should be the geocoding lookup.
7. **Bayesian maths.** Review `src/bayes/robust.js`:
   - prior on λ
   - how the chance rate q is computed
   - the birth-time grid
   - model averaging
   - the out-of-sample split
8. **Wording.** Make sure no text claims proven predictive power and the disclaimers are present (Dosham, Palan, FAQ).

## 7. Known limitations

- Dosham rules and remedies vary between traditions. One common set is used.
- The Palan event rules are this site's own reading of standard Parasari and KP ideas. They are not taken from one canonical text.
- Festival rules may disagree with Vakya-based calendars by one day.
- Geocoding depends on Open-Meteo and Photon coverage. Pasted latitude/longitude works as a fallback.
