# Westran-inspired Sun–Venus timing: research specification

**Status: Westran-INSPIRED, not a Westran replication.** The primary-source pages could not be read; see "Access" below. Every convention not confirmed from a primary source is a documented, configurable assumption.

**Model version:** `westran-inspired-0.1` (`src/western/engine.js`).

## Access (22 November 2026)

| Source | Result |
|---|---|
| https://www.positiveastrology.com/definitions | **Not read.** The proxy refused the connection (`CONNECT tunnel failed, response 403`). |
| https://www.positiveastrology.com/the-data | **Not read.** Same refusal. |
| web.archive.org copies of both | **Not read.** Same refusal. |
| Web search (22 Nov 2026) | Search-result summaries only, no full pages. Sources: Astrological Association, "Paul Westran's study of progressed synastry" (astrologicalassociation.com); Astrology News Service articles "Unique study links Venus to romantic choices people make" and "Successful astrology study replicated" (astrologynewsservice.com); astrologyweekly.com and astrogarden.proboards.com forum threads; a Threads post on Westran's account. |

The project owner was offered a network change to reach positiveastrology.com and web.archive.org, and declined. These are **secondary, unverified** leads. They may be inaccurate.

## What the secondary leads say (unverified)

- **Study.**
  - A 2005 study of progressed synastry in about **1,300 celebrity couples**, described in Westran's 2006 book *When Stars Collide*.
  - A later replication was reported in the Astrological Association's journal *Correlation*.
  - The claimed result is that Sun–Venus aspects "showed up prominently at the start-up of relationships".
  - The headline odds were quoted as about "900,000 to one".
- **Chart combinations named:**
  - natal Sun and natal Venus;
  - natal Sun and progressed Venus;
  - progressed Sun and natal Venus;
  - progressed Sun and progressed Venus.
- **Aspects:** conjunction, trine, opposition.
- **Orb:** "2°" in several summaries. The project brief's lead says **2°01′**. Neither could be confirmed.
- **Endings:** aspects are said to move out of orb at the end of relationships. This is a claim, not something implemented here.

## Specification table

| Item | Primary source | This implementation |
|---|---|---|
| Bodies | Not verified (leads: Sun, Venus) | Sun and Venus only |
| Aspects | Not verified (leads: conjunction, trine, opposition) | Conjunction 0°, trine 120° (either side), opposition 180° |
| Chart combinations | Not verified (leads: the four listed above) | All four layers: natal–natal (NN), natal–progressed (NP), progressed–natal (PN), progressed–progressed (PP) |
| Partner directions | **Unspecified** in the leads | Both: A's Sun with B's Venus, and A's Venus with B's Sun (8 configurations). This is an assumption and may be broader than the original, which would inflate coverage. |
| Natal–natal | Lead lists it | Reported separately as a permanent feature of the pair, never as a timing signal or a new forecast |
| Progression | Leads say "progressed"; method not stated | Secondary progressions, a day for a year: the progressed instant = birth + (target − birth) / yearDays days |
| Year length | **Unspecified** | Setting. Default tropical year, 365.24219 days; alternative Julian year, 365.25 days. Over 40 years of life they shift the progressed instant by only about 1.2 minutes (about 0.001° of Sun), so the choice barely matters. |
| Progressed reference point | Unspecified | Plain day-for-a-year from the birth instant. Not the "adjusted calculation date" used by some software. |
| Zodiac and coordinates | Unspecified (Western astrology, so presumably tropical) | Tropical, geocentric, apparent ecliptic longitude, true equinox of date. Matches Swiss Ephemeris `calc_ut` default flags within 10″ (`test/reference-western.json`). Longitude only: no declination or parallels. |
| Orb and boundary | Not verified (2° vs 2°01′) | Setting: 2°00′ (default), 2°01′ or 1°00′. Inclusive: a separation exactly equal to the orb counts. |
| Applying or separating | Unspecified | Not used. Windows cover both. Exact instants are reported where the signed deviation crosses zero. |
| Relationship event definition | Unverified ("start-up of relationships"; data source and how the start date was defined unknown) | The research harness keeps relationship beginnings, marriages and separations as separate event types |
| Control construction | **Unknown** (how chance expectation and the odds were computed could not be checked) | None claimed. The harness reports how much time the windows cover, so alignment can be compared with coverage. That is descriptive, not a test. |
| Sample, data source, statistics | Not verifiable | Not reproduced; no results are claimed |

## Faithful reproduction vs our extension

- **Possibly faithful, pending verification:** the Sun–Venus pair, the three aspects, the four natal/progressed layers, and the day-for-a-year progression.
- **Our choices:**
  - both partner directions;
  - default year length;
  - default orb;
  - the inclusive boundary;
  - the timeline scan (5-day step, edges refined to 1 day);
  - the birth-time-uncertainty envelope (earliest / central / latest birth instant per partner);
  - how events are matched to windows in the harness.

## What prevents an exact replication

1. The primary method pages and the *Correlation* papers could not be read.
2. The year-length convention, the partner-direction rule, and how "start of relationship" was dated are unknown.
3. The control or chance model behind the published odds is unknown.
4. The original data are not available.

**Predictive performance has not been evaluated.** A window is a timing signal, not a prediction or a probability.
