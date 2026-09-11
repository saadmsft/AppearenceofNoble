# The Noble Appearance · حلیۂ مبارک

A respectful, source-first English and Urdu web library about the reported
physical appearance of Prophet Muhammad ﷺ. **No depictions, portraits, or
reconstructions.**

**Read online:** [English](https://saadmsft.github.io/AppearenceofNoble/?lang=en)
· [اردو](https://saadmsft.github.io/AppearenceofNoble/?lang=ur)
· [Search all narrations](https://saadmsft.github.io/AppearenceofNoble/?view=collection&lang=en)

## What is included

- A continuous thematic journey beginning **Complexion → Eyes**, then the
  remaining features. Each chapter has distinct abstract ornamental motion,
  concise bilingual highlights, and source-reference buttons. Narration cards
  are **not mounted until the reader explicitly expands that chapter**.
  Chapters expand independently; the full searchable collection remains a
  separate navigation choice.
- Sixteen themes: general appearance, complexion, face, eyes, hair, beard, mouth
  and teeth, stature and build, hands, legs and feet, the Seal of Prophethood,
  walking and posture, fragrance and perspiration, voice, smiling, and dress.
- Original English and Urdu **summaries of meaning**, short classical Arabic
  excerpts and expandable full Arabic reports, narrator identification, linked primary references, related
  transmissions, source-specific grading notes, and source-check dates.
- Search across all three scripts, English/Urdu spelling variants, Eastern
  Arabic digits, and common Roman-Urdu topic words.
- Filters by theme, collection, and grading; a focused reader with adjustable
  text size, dual-language reading, bookmarks, and shareable links.
- Complete RTL layout, locally hosted Naskh/Nastaliq fonts, light/dark themes,
  keyboard access, reduced-motion support, and a downloadable bilingual JSON
  corpus. Sources & Method also offers a self-contained offline HTML edition
  with embedded code, data, fonts, and third-party license notices.
- An illuminated manuscript opening: rose-ink framing, ornamental line drawing,
  and slowly rotating geometry around stationary calligraphy. Ambient motion
  pauses when offscreen, in a hidden tab, or while a narration is open. The
  motion control persists locally; the system's reduced-motion setting always
  takes precedence. Existing bookmarks and preferences are preserved.

Chapter highlights in `web/src/lib/chapters.ts` are original, selective summaries
of the existing corpus, with retained primary-source IDs. Every highlight must
point to an established, on-topic report. Chapter panels initially show sahih
and hasan entries; cautioned reports require a second explicit choice. The
animations are abstract decorations, not portraits, anatomical reconstructions,
skin-colour samples, or recordings of the Prophet's ﷺ voice.

The 10 September 2026 audit covers **71 entries, 67 unique primary references,
and 98 primary/related source URLs**. It includes 55 sahih, 9 hasan, and 7
weak-category entries. See the [audit manifest](research/audit.json) for the
method, corrections, limits, and full-Arabic transcription fingerprint.

There are no accounts, tracking services, advertisements, runtime AI requests,
or third-party font requests. Bookmarks and preferences use local storage on the
reader's device. External source links open Sunnah.com; project links open
GitHub. Normal GitHub Pages hosting logs are outside this application's control.

## Research boundaries

This is a broad **scoped collection**, not a claim to include every surviving
narration, every chain variant, or all Sunni and Shi'i traditions. The current
source set is Sahih al-Bukhari, Sahih Muslim, Jami' at-Tirmidhi, Ash-Shama'il
al-Muhammadiyah, Sunan Abi Dawud, Sunan Ibn Majah, and Sunan an-Nasa'i.
Some books appear through related references rather than separate primary
entries. The app's Sources & Method page provides the live coverage counts.

An entry is a focused reading unit, **not necessarily an independent hadith or
chain**. A composite report can have more than one topical entry, and parallel
reports can describe the same observation. Primary-reference counts are
deduplicated; topic counts overlap.

The default view shows **sahih and hasan** reports. Selected weak, disputed, or
ungraded reports are available through the grading filter with visible warnings.
Their inclusion does not establish the attributes they describe. Each badge
applies to the primary reference only, not automatically to related reports.

For Bukhari and Muslim, "sahih" describes the conventional classification of the
collection, not a new independent chain-by-chain judgement. Other assessments
are attributed to the grading displayed by the linked source. Different
assessments are preserved in the notes where relevant. Numbering follows the
linked edition and can differ elsewhere.

The `arabic` field is an excerpt. **`arabicFull` preserves the complete Arabic
report from the primary page**, including its isnad and any compiler or
transmitter remarks inside the report; not every sentence is Prophetic speech.
English and Urdu are selective original editorial paraphrases, not complete
translations or copied modern translations. Similes,
differences between observations, and limits of weaker reports are retained.
No numerical height, modern racial category, or unreported anatomical detail is
inferred. This research-assisted project is not a scholarly certification,
critical edition, or fatwa service.

## Develop locally

Use Node.js 24 or later and pnpm 10.33.0.

```sh
pnpm --dir web install --frozen-lockfile
pnpm --dir web dev
```

Open the `/AppearenceofNoble/` path on the URL printed by Vite. The base path is
intentional: it matches this repository's GitHub Pages address.

```sh
pnpm --dir web lint
pnpm --dir web test
pnpm --dir web build
pnpm --dir web exec playwright install chromium
pnpm --dir web test:e2e
```

The dependency-free Node test runner validates data completeness, bilingual
fields, filtering, search normalization, URL state, and storage failure
handling. Playwright exercises the production build on desktop and mobile,
including Urdu RTL, bookmarks, deep links, empty states, source access, and the
research download. Production browser tests start their own server on port
4173; keep that port free.

To run the same browser suite against the deployed site:

```sh
cd web
SITE_URL=https://saadmsft.github.io/AppearenceofNoble/ pnpm test:e2e
```

## Repository structure

| Path | Purpose |
| --- | --- |
| `content/*.json` | Version-controlled bilingual research records |
| `research/audit.json` | Recorded coverage, corrections, limits, and Arabic-source fingerprint |
| `web/src/lib/schema.ts` | Strict content schema and source-link constraints |
| `web/src/lib/library.ts` | Explicit imports of the published corpus |
| `web/src/lib/catalog.ts` | Localized theme, collection, and grade labels |
| `web/src/lib/chapters.ts` | Ordered chapters, bilingual highlights and their established source records |
| `web/src/lib/i18n.ts` | Complete English/Urdu interface and methodology |
| `web/src/lib/search.ts` | Cross-script search and intersecting filters |
| `web/src/lib/route.ts` | Pages-safe query/hash navigation |
| `web/src/components/` | Reader, cards, source index, and reading guide |
| `web/tests/` | Content/unit tests and production-browser tests |
| `.github/workflows/pages.yml` | Build, validation, and Pages deployment |

When adding a content file, add its import to `library.ts`. A test fails if a
JSON file is present in `content/` but absent from the shipped app.

## Publishing

GitHub Pages uses **GitHub Actions** as its publishing source. A push to `main`
runs the pinned workflow: frozen dependency installation, lint, content and unit
tests, production build, desktop/mobile browser tests, artifact upload, and
deployment. Pull requests run the same checks but do not deploy. Manual workflow
dispatch is also supported; only `main` can deploy.

The build produces static files in `web/dist/`. There is no server or API key.
It also produces `web/dist/noble-appearance.html`, a portable, single-file copy.
Search and reading work offline in that copy; external source links still
require connectivity. The standard site uses cacheable, separately hosted assets.
All navigation uses query parameters and hash fragments so links work on
GitHub Pages without an SPA rewrite. Changing the repository name requires
updating Vite's base, metadata URLs, repository links, and browser-test base URL.

The default route opens the topic journey. `?view=collection` opens the
searchable library. Earlier links containing search, topic, source or grade
filters without a view still resolve to the library. Narration links opened
from a chapter explicitly retain `view=journey` and its topic so reloading does
not unexpectedly switch the reading context.

## Correcting or extending the research

Use the [source correction form](https://github.com/saadmsft/AppearenceofNoble/issues/new?template=source-correction.yml)
with an entry link, the precise correction, and a primary reference. Urdu
language corrections are welcome.

For a new record, verify the actual source page, narrator, numbering, Arabic
excerpt, and named assessment. Write original English and Urdu summaries.
Preserve uncertainties and distinguish source wording from interpretation.
Never upgrade a popular report without evidence. Set `checkedAt` to the actual
source-check date, keep stable entry IDs, and run the content and browser tests.
When the corpus changes, carry out a new source check and update the audit
counts and transcription digest. The tests deliberately reject unaudited
changes to full Arabic or discrepancies between the audit and shipped corpus.

## Acknowledgments

Primary-source access is linked to [Sunnah.com](https://sunnah.com/). This project
does not copy its modern translations or claim affiliation.

Arabic and Urdu fonts are Noto Naskh Arabic and Noto Nastaliq Urdu, distributed
through Fontsource under the SIL Open Font License. The UI is built with React,
TypeScript, Vite, adapted shadcn/Radix primitives, and Lucide icons. The design
uses the Clawpilot light/dark theme.
