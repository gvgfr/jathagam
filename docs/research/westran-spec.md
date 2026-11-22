# Westran-inspired Sun–Venus timing: research specification

**Status: Westran-INSPIRED, not a Westran replication.**

**Model version:** `westran-inspired-0.1` (`src/western/engine.js`).

## Sources and access

| Source | Access | What we have |
|---|---|---|
| https://www.positiveastrology.com/definitions (method) | Not reachable from this environment: the proxy refused it with 403, and the owner declined a network change | Owner-supplied summary note, accessed 2026-11-22 (offline research packet, `01_method_notes.md`) |
| https://www.positiveastrology.com/the-data (results) | Not reachable | Summary note, accessed 2026-11-22 (`02_results_notes.md`) |
| https://www.positiveastrology.com/control-group-results (controls) | Not reachable | Summary note, accessed 2026-11-22 (`03_control_notes.md`) |
| https://www.positiveastrology.com/pdf-articles (article landing page) | Not reachable | Note only (`04_article_links.md`). No PDF was obtained. |
| *Correlation* 33(2), April 2021 | Not retrieved | Cited by the results page; **not inspected** |
| Web search, 22 Nov 2026 (Astrological Association page summary; Astrology News Service; forums) | Search summaries only | Secondary leads |

The packet notes are **summaries of the author's own pages**: the author's reported methods and findings, not independently reproduced results. No raw data, numerical tables, software or the full article were supplied. The packet itself is not stored in this repository.

## What the notes say (author-reported, unverified)

### Samples

- **Two historical samples, 2005 and 2019**, each of 1,300 public relationships.
- **Inclusion:** usable birth dates and places, plus a relationship-start or marriage date. Arranged or coerced relationships were excluded.
- **Outcome definition:** romantic liaisons of widely varying length.

### Event date

- Progressed positions are taken at the relationship start where known; otherwise the marriage date is used instead.
- Some start dates are known only to the year.
- The author acknowledges two issues:
  - the same people appear in more than one relationship;
  - start dates and marriage dates are mixed.

### Birth times

Used when available; the account also describes noon births.

### Aspects

- **Pairs:** Sun–Venus conjunction, trine and opposition.
- **Chart combinations:** natal and progressed.
- **Pairings:** direct and reverse pairings are discussed.
- **Same-planet comparisons:** the author distinguishes Sun–Sun and Venus–Venus comparisons from Sun–Venus ones.

### Tolerance

- **Two degrees and one arcminute (2°01′).**
- The notes warn that the page's notation and explanation are inconsistent, so its boundary arithmetic should not be copied uncritically.

### Controls

- 500 artificial partners for each subject.
- Their birth dates fall within the real partner's birth year ± 2 years.
- The real event date is kept fixed.
- Results are scaled to the real sample to give expected counts.
- 2.6 million generated non-relationships are reported in total.

### Results

- The author reports small significance values in both samples.
- **We have not audited them.** They must not be turned into accuracy percentages, individual probabilities, or evidence of reliable marriage prediction.

## Specification table

| Item | From the notes | This implementation | Source of choice |
|---|---|---|---|
| Bodies, aspects | Sun–Venus conjunction, trine, opposition | Same | notes |
| Chart combinations | Natal and progressed | NN, NP, PN, PP | notes (exact list of layers not confirmed) |
| Partner directions | Direct and reverse discussed | Both: A's Sun with B's Venus, and A's Venus with B's Sun | notes (exact rule unverified) |
| Same-planet comparisons (Sun–Sun, Venus–Venus) | Discussed separately | **Not implemented** | — |
| Natal–natal | Included among combinations | Reported once as permanent; never a timing signal | ours |
| Progression method | "Progressed", convention unspecified | Secondary, a day for a year from the birth instant | **ours, unresolved** |
| Year length | Unspecified | Setting: 365.24219 (default) or 365.25 days. The difference is about 1 minute over 40 years. | **ours, unresolved** |
| Zodiac, coordinates | Unspecified | Tropical, geocentric, apparent ecliptic longitude, true equinox of date; within 10″ of Swiss Ephemeris | **ours, unresolved** |
| Orb | 2°01′ stated; notation inconsistent | Setting: 2°01′ (default), 2°00′, 1°00′ | value from notes; choice to default to it is ours |
| Boundary | Inconsistent in source | Inclusive (separation ≤ orb) | **ours** |
| Applying or separating | Not mentioned | Not used | — |
| Birth time unknown | Noon births described | Tab: midday plus earliest/latest envelope. Harness: midday, flagged. Controls: real partner's time of day, or noon UTC. | partly notes, mostly **ours** |
| Event anchor | Start; marriage substitutes; some year-only | Beginning, else marriage (flagged as a substitute). Month- or year-only dates are taken at their midpoint and counted by precision. | notes plus **ours** (midpoint) |
| Control sampling | Birth year ± 2; event fixed; 500 per subject; scaled | `generatedPartnerComparison`: uniform calendar day within the ± 2-year span; real time of day; seeded; default 100 per subject (settable to 500); both partners as subject by default (`subjects: 'a'` for one side) | distribution, seed, subject rule and time handling are **ours** |
| Significance test | Reported by the author | None given: repeated people and many configurations make simple tests invalid | ours |

## Review questions from the notes (our checks, not claims of error)

- **Exact date-sampling distribution.** Ours is uniform over calendar days.
- **Random generator and seed.** Ours is mulberry32 with a reported seed.
- **Birth-time handling.** See the table.
- **Duplicate aspects.** Counting both partners as subjects mirrors every configuration: (NP, A.sun–B.venus) for one subject is (PN, A.venus–B.sun) for the other. Our output sets `mirrored: true`, and `subjects: 'a'` removes it.
- **Repeated-person dependence.** Output reports distinct people and connected groups. Development and held-out splits keep connected groups together.
- **Correspondence between aggregate formulas and raw records.** Cannot be checked without the raw data.

## What prevents an exact replication

1. The method, the control description and *Correlation* 33(2) were not read in full. The notes are summaries.
2. Progression-date convention, year length, coordinates and birth-time rule are unresolved.
3. The exact control sampling and counting definitions are unresolved.
4. No raw records, tables or software are available.

## Scope

- **What this is:** a two-person, retrospective hypothesis about relationship-start timing.
- **What it is not:** a forecast engine for an individual, or for career, money, children or health.
- **What it does not do:** improve or change the Tamil Palan.
- **A window is a timing signal**, not a prediction or a probability.
- **Predictive performance has not been evaluated.**
