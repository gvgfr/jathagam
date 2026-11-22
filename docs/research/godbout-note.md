# Research note: Vincent Godbout's automated chart–biography matching

**Not implemented. This note is for reference only.**

## What it is (from secondary sources found by web search, 22 November 2026; not verified)

- **The method.** Software extracts keywords from short biographies, and turns astrological factors into keywords through a dictionary. Each chart is then scored against each biography by "semantic proximity", and charts are paired with biographies blindly.
- **Reported result.** A press release (24-7pressrelease.com, 2017) describes 42 celebrities from a *Le Monde* directory. Seven were matched correctly, with odds against chance of "about six in 100,000".
- **Publication.** The NCGR Research Journal (Winter 2022) lists "Comparison of Astrological Charts with Biographies using Automated Matching" by Vincent Godbout. K. McRitchie (*Journal of Scientific Exploration*, 2022 and 2023) cites "Godbout (2020)" as an automated chart-matching study.
- **Sources.** These are mostly advocates of astrology. A critique by Dean and Kelly is referred to but was not examined. None of the papers themselves were read: the hosts are not reachable from this environment.

## Why it is not implemented here

- **What kind of method it is.** It is a test of whether a chart *describes a person*. It does not forecast future events, so it does not fit this site's forecasting harness.
- **Missing inputs needed to reproduce it:**
  - the factor-to-keyword dictionary, its weights, and the astrological factors included;
  - the biography keyword-extraction procedure, its vocabulary, and the language model used;
  - the similarity formula and how a match is assigned;
  - the exact sample, the biography texts, and the chance or permutation model behind the published odds.
- **No invented substitute.** Building a dictionary or similarity formula ourselves would test our own guesses, not Godbout's method. No results would be comparable.

**Next step if wanted:** obtain the paper and any licensed materials (dictionary and code) from the author or publisher. Then decide whether a faithful reproduction is possible.
