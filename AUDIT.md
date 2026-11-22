# GV Jathagam: forecasting audit (November 2026)

**Scope.** Does the site's astrology carry reproducible predictive information, and is the forecasting maths sound? Everything below comes from reading and running the code in this repository.

**Real data available.** One person's remembered life history (the site owner):

- 22 events across 8 kinds.
- Every event has a year only; none has a month.
- That history was seen while the rules were being written.

So no claim about predictive accuracy in general can be made from it.

## Bottom line

- **No predictive improvement has been demonstrated.**
  - No dataset exists that could show it: many people, month-precision events, and follow-up after the forecast.
  - The one real history favours "no effect":
    - Looking back: Bayes factor 0.12.
    - On held-out later events: 0.63.
- **The forecasting maths had real defects.** They are fixed; see sections 2 and 3.
- **An evaluation harness now exists** (`npm run eval`). It can answer "do the rules beat a non-astrology baseline?" once real data exist. Tested on synthetic cohorts:
  - it does not invent skill where there is none;
  - it detects a strong planted effect with about 100 people;
  - a weak one (1.3×) needs about 1,000 or more people.
- **The site's own engine scored worse than a simple fitted age baseline** on synthetic data. Partly this is by construction: the synthetic age curves differ from its hand-chosen ones. Its age curves are assumptions, not data.

## 1. Code path: birth details to forecast text

| Stage | Code | What it does |
|---|---|---|
| Time | `src/engine/time.js` (`localToUtc`, `zoneFor`) | IANA zone from latitude/longitude; historical offsets; ambiguous DST takes the first occurrence |
| Positions | `src/engine/astro.js` (`grahaPositions`, `siderealLongitude`, `lagnam`, `placidusCusps`) | astronomy-engine true-of-date positions minus (mean Lahiri ayanamsa + nutation); KP = Lahiri − 0.09685°, Raman = Lahiri − 1.446301°; mean or true node; Placidus cusps by semi-arc iteration |
| Divisional charts | `src/engine/vargas.js` | D9, D7, D10 (Parasari rules) |
| Dasa | `src/engine/dasa.js` (`vimshottari`, `antarams`) | balance from the Moon's nakshatra; year length 365.25 / 360 / 365.2564 days |
| Parasari significators | `src/palan/plain.js` `significations`, `ruleFires(A, kind, bhuktiLord, antaramLord)` | a planet signifies its occupied house, owned houses and its star lord's house. An event (`EVENTS` in `src/palan/eventTexts.js`, e.g. marriage = 2/7/11) fires when the union of both lords covers all its houses, and the antaram lord covers at least half |
| KP | `src/engine/kp.js` (`kpChart`, `kpFires`, `KP_EVENTS`) | four-level significators, cusp sub-lord promise, Rahu/Ketu as agents |
| Transits, ashtakavarga | `src/engine/transit.js`, `src/engine/ashtakavarga.js` | used **only in Palan wording**, not in any forecast probability or test |
| Bayesian check | `src/bayes/robust.js` (`robustCheck`) | see section 2 |
| Forecast UI | `src/ui/bayes.js` | renders the check; saves and scores forecast records |
| Palan text | `src/palan/index.js` (`generatePalan`), `src/palan/plain.js` (`plainPalan`) | traditional interpretation; timing comes from `ruleFires` / `matchEvents` on dasa periods |

The calculations were checked earlier against Swiss Ephemeris (`test/reference-*.json`, tests in `test/engine.test.js`, `test/kp.test.js`). Agreement with Swiss Ephemeris or other calculators shows the astronomy is right. It is **not** evidence that the astrology predicts anything.

## 2. Audit of the probability model (`src/bayes/robust.js`)

### What it actually is

**A retrospective alignment test.**

- It conditions on the events that happened. For each event kind it asks whether the events fell in rule-fired periods more often than *q*.
- *q* is the share of the person's adult time in fired periods, weighted by an age curve.
- Likelihood: the number of hits *h* out of *E* events follows Binomial(*E*, θ), with θ = *q* + λ(1 − *q*).
- One rule-strength parameter λ is pooled across all event kinds.

What it cannot do:

- It never models how often events happen, so it cannot produce absolute event probabilities.
- It never learns from fired months without events.
- A "never happened" answer adds nothing to it.

**Window width is handled correctly.** A rule that fires most of the time gets *q* ≈ 1, so it earns no credit for events landing inside it.

### Model enumeration

- `modelGrid()` yields 12 Parasari settings (2 ayanamsas × 2 nodes × 3 year lengths) plus 6 KP settings (KP ayanamsa × 2 nodes × 3 year lengths), **18 in total**. A "30" would need Raman and Lahiri for KP too, which the code does not do. Prior weights are equal.
- **Duplicates.** For the owner's chart, every mean-node setting gives exactly the same firing tables and dasa dates as its true-node twin (verified by fingerprinting). Lahiri and Raman also give identical firing tables there, differing only through dasa dates. So **9 of the 18 are distinct**.
- Equal weight per setting therefore double-counts some configurations. The page now reports the distinct count (`distinctModels`).

### Defects found and fixed

| # | Defect | Effect | Fix |
|---|---|---|---|
| D1 | λ prior was Uniform(0,1) with no "no effect" mass. The posterior mean of λ is then always > 0, and it was used directly in forecasts. | Forecasts were nudged toward the rules even when evidence was against them. Owner: Bayes factor 0.14 but λ̂ = 9%, so the job-change forecast was 4.8% against a 4.5% baseline. | **Spike-and-slab**: P(λ = 0) = 0.5. The forecast is (1 − P(effect))·baseline + P(effect)·rule-adjusted. With the owner's data, P(effect) = 11% and the forecasts equal the baseline to within 0.1 percentage point. |
| D2 | The "overall" Bayes factor averaged models at the stated birth time only, while the posterior used all birth times. | Inconsistent evidence summary. | The overall Bayes factor is now the prior-weighted average over models **and** birth times. The old figure is kept as `statedBF`. |
| D3 | The out-of-sample test chose models and birth time on training events (good), but re-started λ from a uniform prior on the test events. | Not a predictive test of what was learned. | `predictiveLogBF` carries the training λ-posterior into the test events. Owner: 0.20 (old) becomes 0.63 (new). Both are below 1: no predictive improvement. |
| D4 | Forecasts used `EVENTS` age windows ± 2 years and ignored eligibility. | A first marriage could be "forecast" for someone already married; "travel" kept a forecast after it had been removed from the Palan. | Explicit event definitions (`src/forecast/definitions.js`) with eligibility and repeatability. Non-repeatable kinds that already happened are excluded. |
| D5 | "Never happened" ticks counted toward the 2-event minimum but contribute nothing. | Could run a test on no information. | Only dated events count. The UI says why. |
| D6 | Forecast records had no event definition, model, code version or input fingerprint, could not be exported, and called the age curve "chance". | Not verifiable later. | Versioned, SHA-256-sealed records with export/import and Brier, skill, log loss and calibration (`src/forecast/record.js`). The age curve is labelled an assumption. |
| D7 | Wording presented retrospective fit as "the rules worked for you" and showed a hand-picked best model's hit counts as evidence. | Overstated. | Results are labelled "looking back, not a test of prediction". The best model is flagged as selected after seeing the data. A banner fit is never called a forecast. |

### Known problems not fixed (testable hypotheses or limits)

- **H1. Age curves are invented.** `BASE` uses hand-chosen Gaussian shapes with no published source. They are now labelled as assumptions. The harness compares them with fitted curves (M2 vs M0).
- **H2. Events are treated as independent.** Children, moves and job changes cluster in real lives, which overstates the evidence in either direction.
- **H3. Fractional hits.** Year-only dates are spread across the periods they overlap, so a binomial with non-integer counts is an approximation. All of the owner's events are year-only, which blurs everything.
- **H4. Birth-time "correction" reuses the same events.** It is a posterior, not an independent finding. The "use this time" button can make the Palan fit the past by construction. The out-of-sample test chooses time on training events only.
- **H5. Contamination.** The event rules were edited in this project after the owner's history and complaints were seen ("past is wrong", the injury event, removing travel). The owner's history is therefore **not** an untouched test set for any version of the rules.
- **H6. The split date** is the median of all event dates, so it depends on the existence of test events (minor).
- **H7. Transits, ashtakavarga and divisional charts** are not part of any tested model. Whether they add value is **untested**.

## 3. Evaluation protocol (fixed before any tuning)

Defined in `src/forecast/definitions.js` and `src/forecast/evaluate.js`.

**Event definitions.** Each kind has yes / no / unknown criteria in English and Tamil, an eligible age range, a repeatable flag, a 12-month horizon and 15 days' edge tolerance.

Unknowns are excluded, never counted as "no":

- kinds the person did not answer about;
- months in a year that holds a year-only event.

**Unit.** Person × kind × calendar month, within follow-up, while eligible. A non-repeatable kind stops at its first occurrence.

**Splits.**

- People are split into K folds. Models are fitted on *other* people's months before the cutoff, and scored on *this* fold's people from the cutoff on. Both people and time are held out.
- Hyper-parameters are chosen by inner person-folds on training data only.
- People marked `split: "final"` are used only by `--final`. That run writes a lock file and refuses to run again, so the final test is not reused after its result has been seen.

**Astrological feature.** "The rule fires this month" under one pre-registered configuration: `PREREG` = Parasari, Lahiri, mean node, 365.25 days, stated birth time.

- KP is a separate named experiment (`--system kp`), not a search over settings.
- No birth-time rectification is used in evaluation.

**Models.**

| Model | Description |
|---|---|
| M0 | Baseline: kind × age-band rates, smoothed toward the kind rate. |
| M1 | M0 × a per-kind rate ratio for fired versus not-fired months, shrunk toward 1. The shrinkage is tuned; infinite shrinkage equals M0. |
| M2 | The site's own engine: Gaussian age curve scaled to the training rate, plus pooled λ with the spike. |
| M2 without rules | M2's baseline alone. |

**Metrics.**

- Brier score; Brier skill versus M0; log loss.
- Calibration bins.
- A bootstrap over people for the difference against M0.

"Improvement demonstrated" means the whole 95% interval of the log-loss difference (M1 − M0) lies below zero.

## 4. Results

### 4.1 Harness self-check on synthetic cohorts

These are generated, not real people. They say nothing about astrology. Command: `npm run eval -- --synthetic` (300 people, cutoff 2015-01, about 157,000 test person-months).

| Cohort | M1 − M0 log loss, 95% CI | Brier skill M1 | Verdict | M2 (site engine) skill |
|---|---|---|---|---|
| Null: events ignore the chart | −0.00001 … 0.00000 | 0.00% | no improvement demonstrated | −0.19% (worse) |
| Planted, 2.5× | −0.00071 … −0.00033 | +0.22% | improvement demonstrated | −0.10% (worse) |
| Planted, 1.3× | −0.00006 … 0.00000 | +0.01% | no improvement demonstrated | −0.17% (worse) |

**Power and false alarms.** From a separate script (seeded, 300 bootstrap draws):

- Effect 2.5×: detected in 4 of 4 runs with 100 people, and 1 of 4 with 30 people.
- Effect 1.3×: detected in 1 of 2 runs with 1,000 people.
- No effect: 0 false alarms in 6 runs of 150 people.

**What this shows.**

- The harness does not manufacture skill.
- It can detect a strong effect from a modest cohort.
- A modest real effect would need on the order of a thousand or more people with month-precision histories.
- Brier skill numbers are tiny because monthly event rates are about 0.5%. Log loss and its interval are the better guide.

### 4.2 The one real history (owner)

The test reused the 22 year-only events from earlier in this project, with a birth time of 00:30 IST in Chennai and ±30 minutes uncertainty.

| Quantity | Before fixes | After fixes |
|---|---|---|
| Overall Bayes factor | 0.142 (stated time only) | 0.124 (models × birth times) |
| P(rules carry information) | not reported | 11% |
| λ used in forecasts | 0.089 | 0.0098 (spike-weighted) |
| Out-of-sample Bayes factor (later 11 events) | 0.196 | 0.634 |
| Distinct models | "18" | 9 of 18 |
| 12-month job-change forecast | 4.8% vs 4.5% baseline | 4.5% vs 4.5% |

A Bayes factor below 1 means "no effect" is favoured. This is one person, with year-only dates, and rules that were written after seeing the history. **It cannot show predictive skill or its absence in general.**

### 4.3 What would be needed for a real answer

- A cohort of hundreds to thousands of consenting people.
- Birth times from records, not memory.
- Month-precision dates for defined events, with each kind answered yes or no.
- A follow-up period that starts **after** the forecasts are recorded (prospective).
- Collection happens outside this site: the site never transmits data. People can export their sealed forecast files and send them to a study if they choose.
- Run `npm run eval -- --data cohort.json` on development people only. Run `--final` once.

## 5. Changes made

- `src/forecast/definitions.js`: event definitions (en/ta), eligibility, weak-date share, round-time check.
- `src/forecast/record.js`: sealed, versioned forecast records; resolve; score (Brier, skill, log loss, calibration); export/import with conflict and tamper detection; migration of old records. Notes that a local hash is not proof of when a record was made.
- `src/forecast/evaluate.js`, `src/forecast/synthetic.js`, `scripts/eval.mjs` (`npm run eval`): the harness, plus a lock on the final test.
- `src/bayes/robust.js`: fixes D1–D4, labelled `kind: 'retrospective-alignment'`, `calibrated: false` on forecasts.
- `src/ui/bayes.js`, `src/i18n.js`, `src/help.js`, `src/palan/index.js`, `src/style.css`:
  - "what counts as yes" per kind;
  - year-only badge;
  - round birth time warning;
  - "list every one" prompt;
  - retrospective labelling;
  - P(effect) and distinct-model count;
  - "not validated" on forecasts;
  - Yes / No / Don't know resolution;
  - skill, log loss and calibration;
  - export/import;
  - a sourced FAQ entry on research (Carlson 1985; Dean & Kelly 2003; Narlikar et al. 2009);
  - a Palan header stating its timing is traditional and untested.
- `vite.config.js`: the build stamps the git commit into each forecast record (`codeVersion`).
- Tests: `test/forecast.test.js` (new), plus four new tests in `test/robust.test.js`. 182 tests pass.

## 6. Status

- **Improved and verified by tests:** statistical consistency (D1–D3), eligibility (D4), input validation (D5), forecast record integrity and scoring (D6), honest labelling (D7).
- **Built but unused until real data exist:** the evaluation harness. It is checked against synthetic null and planted cohorts.
- **Untested:** whether any astrological feature (Parasari, KP, transits, ashtakavarga, vargas) adds predictive value beyond an age baseline in real people.
- **Predictive skill beyond baseline: not demonstrated.**
