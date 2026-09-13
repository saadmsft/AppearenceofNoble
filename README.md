# The Noble Project · دی نوبل پروجیکٹ

A respectful, source-first English and Urdu library about the reported
appearance, character and life of Prophet Muhammad ﷺ. **No depictions, portraits,
historical voice reconstructions, or impersonation.**

**Read online:** [English](https://thenobleproject.org/?lang=en)
· [اردو](https://thenobleproject.org/?lang=ur)
· [Search all narrations](https://thenobleproject.org/?view=collection&shelf=all&lang=en)
· [The Noble Life](https://thenobleproject.org/?view=story&shelf=life&lang=en)

## What is included

- **Monthly Series** (`?view=monthly`) introduces a separate, bilingual long-form
  audio series. Its archive currently says "First episode in preparation";
  no monthly episode, script, or recording is published yet. Homepage,
  navigation and audiobook-library entries lead to the same section.
  Approved episodes can use the existing single player, chapter navigation,
  language-specific durations, local resume, transcripts and source companion.

- **Audiobooks** is a clear homepage and navigation entry, with three original
  ornamental book covers, language-specific durations, chapter counts and
  Start/Continue listening. Book pages show the saved listening position,
  chapter durations and 15-second back/forward controls, while keeping source
  evidence available. All recordings are reused; no additional generation.
- **Narrated stories / listen-only mode** adds six connected editorial trails:
  Appearance, Character and Life in English and Urdu. Their 36 chapter scripts
  have **72 saved recordings** using the approved Cedar voice on Azure OpenAI
  `gpt-realtime-2.1`. These are explicitly editorial stories, not new hadith
  records or full translations. Transcripts and supporting sources stay
  available, with one shared audio engine, continuous playback and local resume.
- **Illuminated motion** adds an ornamental chapter aperture, fine-pointer
  depth/light on decorative frames, a one-shot home/dedication ink flourish
  and small control feedback. Text, calligraphy, controls and geographic labels
  remain stationary; reduced-motion, pause and visibility gates remain intact.
- A gentle English/Urdu **Dedication & gratitude** welcome, honoring Allah and
  Prophet Muhammad (S.A.W.W.) first, followed by thanks to Farkhanda Abid and
  Abid Mahmood for their continuing support. It appears once per browser-tab
  session, leaves direct narration links uninterrupted, and can be reopened
  from the footer. It is personal dedication, not research or a hadith quote.
- **Story Edition** is the primary collection entry: scroll-paced passages and
  one evolving ornamental stage for each Appearance, Character or Life trail. Chapter
  jumps and previous/next controls use native scrolling, with evidence opened
  only on request. Reading view retains the conventional chapter layout.
- A project home with **Appearance**, **Character** and **Life** collections.
  Character introduces mercy, patience, humility, generosity, justice,
  forgiveness, honesty, and family/community. The shared reader and search keep
  the project collection distinct from the hadith-book source filter.
- **The Noble Life** follows twelve selected milestones: early life/work,
  first revelation, the Makkan years, Ta'if, Hijrah, the Madinan community,
  Badr, Uhud, al-Hudaybiyyah, the return to Makkah, the Farewell Pilgrimage and
  final days. Chronology and place notes have separate evidence and visible
  qualifications. The ornamental place locator is schematic, not an exact
  historical travel route.
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
- Continue reading, explicit read/unread marks, collection/chapter progress,
  and private plain-text notes with immediate browser-local saving.
- Private JSON backup/restore with preview, merge or replace, conflict
  disclosure, storage-failure handling and deletion confirmation. Version-2
  backups include listening state; older version-1 backups remain importable.
- Saved synthetic MP3 narration for all **111 entries** in Arabic, English and
  Urdu: **333 language mappings and 329 unique MP3s**. The original 95 entries
  and their 281 MP3s are preserved. The 48 new Life recordings use the same
  approved voices and generate-once approach. Playback makes no Azure Speech
  requests.
- **Story Listening** queues a chapter's reports in one coordinated player:
  play/pause, previous/next, seeking, language, speed and the current source.
  It continues across reader close and same-collection views. A collection
  switch pauses it; nothing starts automatically on page load.
- Language/asset-aware **listening resume** and optional **Follow the story**.
  Following is off by default, matches narrations rather than individual
  words, and suspends for manual exploration. Listening never marks an entry
  read. Reports without a corresponding story beat retain honest chapter
  context rather than highlighting unrelated words.

Chapter highlights in `web/src/lib/chapters.ts` are original, selective summaries
of the existing corpus, with retained primary-source IDs. Every highlight must
point to an established, on-topic report. Chapter panels initially show sahih
and hasan entries; cautioned reports require a second explicit choice. The
animations are abstract decorations, not portraits, anatomical reconstructions,
skin-colour samples, or recordings of the Prophet's ﷺ voice.

The Appearance audit of 10 September 2026 covers **71 entries, 67 unique primary references,
and 98 primary/related source URLs**. It includes 55 sahih, 9 hasan, and 7
weak-category entries. See the [audit manifest](research/audit.json) for the
method, corrections, limits, and full-Arabic transcription fingerprint.

The [Character audit](research/character-audit.json) covers **24 entries, 24
unique primary references and 25 cited URLs**, with three entries per theme.
All use the conventional sahih classification of Bukhari or Muslim.

Life adds **16 new narrations**, plus one unchanged Character narration
cross-listed for Badr, across **12 milestones**. Its source transcriptions have separate
[Makkan](research/life-makkan-audit.json) and
[Madinan](research/life-madinan-audit.json) evidence manifests. Milestones in
`web/src/data/life-*.json` reference canonical narration IDs; an existing report
can appear in Life without duplicating its note or read mark. Source discovery
and progress counts include these cross-listed records consistently.

There are no accounts, tracking services, advertisements, runtime AI requests,
or third-party font requests. Bookmarks and preferences use local storage on the
reader's device. Narration links open Sunnah.com; historical-context citations
may open their separately identified source sites. Project links open GitHub.
Normal GitHub Pages hosting logs are outside this application's control.

## Monthly episode publication

Monthly drafting automation is research-only. Drafts belong outside the public
catalog (for example `drafts/monthly-series/YYYY-MM`) and are never imported by
the website. Each script, audio budget and release still requires explicit
approval. The series aims for roughly 15 minutes **per language**; published
durations come from measured audio, not that target.

Only reviewed releases belong in `web/src/data/monthly-series.json`, with
`status: "published"`, a publication date, bilingual title/summary/editorial
qualifications, ordered chapters and a Sunnah.com source companion. Each
chapter has a `story-monthly-…` identity, its parent `monthlyEpisodeId`, `kind:
"story"`, shelf `life`, topic `all`, bilingual original text and source IDs
from that episode's companion. These are editorial stories, not canonical
hadith records or additions to the original short-story collections.

Recordings belong in `web/src/data/monthly-audio-manifest.json` and
`web/public/audio/`, using the existing approved story profile. Each chapter
requires both English and Urdu assets before publication. Split long episodes
into meaningful chapters of at most 590 seconds each; the complete episode can
span 15 minutes or more without changing the existing listening backup format.
The catalog rejects draft status, duplicate identities, orphan tracks, missing
languages and unresolved source references. Unit checks verify released MP3
bytes, durations, script fingerprints and transcript fidelity. Approval is a
human release gate, not something a JSON status can establish by itself.

`?view=monthly&episode=<id>&lang=ur` opens a published episode. Unknown episode
links show an explicit unavailable state. Publishing requires updating both
catalogs, approving content/permissions and recordings, running the existing
checks and deploying a reviewed release. Nothing discovers drafts or publishes
them based on the calendar. Future model changes require a separately approved
profile update; this release creates no audio or Azure resources.

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

Life is an introductory selected-source trail, not an exhaustive Seerah or a
reconstruction of every event. A narration's grading badge does not authenticate
an editorial date, place or all surrounding historical claims. Chronology has
its own cited basis, approximate/period/source-reported labels and limitations.
Unreported dialogue, motives, precise dates and detailed travel routes are not
invented. The timeline's order and schematic locator do not claim equal time
intervals or geographic distances.

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

Open the root URL printed by Vite. Build assets use relative URLs so the same
static output supports the custom-domain root and the legacy repository path.

```sh
pnpm --dir web exec playwright install chromium
pnpm --dir web lint
pnpm --dir web test
pnpm --dir web audio:check
pnpm --dir web build
pnpm --dir web test:e2e
```

The built-in Node test runner validates data, source fingerprints, filtering,
URL state, personal storage and audio generation safeguards. Some isolated
component tests also require Chromium. Playwright exercises the production build on desktop and mobile,
including Urdu RTL, bookmarks, deep links, empty states, source access, and the
research download. Production browser tests start their own server on port
4173; keep that port free.

To run the same browser suite against the deployed site:

```sh
cd web
SITE_URL=https://thenobleproject.org/ pnpm test:e2e
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
| `web/src/lib/life-schema.ts`, `life.ts` | Separate chronology validation, milestone references and cross-listing |
| `web/src/data/life-*.json` | Reviewed bilingual Life milestones and chronology/place evidence |
| `web/src/lib/listening.ts`, `web/src/hooks/useListening.ts` | Shared media lifecycle, queue and versioned local resume state |
| `web/src/data/story-scripts.json`, `web/src/lib/stories.ts` | Original bilingual story chapters and their canonical evidence |
| `web/src/data/story-audio-manifest.json`, `web/src/lib/story-audio.ts` | Separate verified editorial-story audio catalog |
| `web/src/lib/i18n.ts` | Complete English/Urdu interface and methodology |
| `web/src/lib/search.ts` | Cross-script search and intersecting filters |
| `web/src/lib/route.ts` | Pages-safe query/hash navigation |
| `web/src/components/` | Reader, cards, source index, and reading guide |
| `web/tests/` | Content/unit tests and production-browser tests |
| `.github/workflows/pages.yml` | Build, validation, and Pages deployment |

When adding a content file, add its import to `library.ts`. A test fails if a
JSON file is present in `content/` but absent from the shipped app.

## Publishing

The primary custom domain is `thenobleproject.org`, with `www` directed to the
same GitHub Pages site. It is configured in GitHub Pages settings; this Actions
publishing workflow does not use a source-branch CNAME file. DNS and certificate
issuance must be complete before the domain is considered live.

Browser storage does not automatically move between origins. Before changing
from the legacy `saadmsft.github.io` address, export a private backup from
My reading, then import it on the custom domain. Re-select appearance
preferences if needed. Never commit or publish a personal backup.

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

The default route opens the project home. `?view=story&shelf=appearance`
and `?view=story&shelf=character` open the existing Story Edition trails.
`?view=story&shelf=life` opens the Life trail; the same shelf also supports
`view=journey` and `view=collection`. A `topic` and
zero-based `beat` preserve explicit passage navigation. The older
`?view=journey&shelf=appearance` and `?view=journey&shelf=character` URLs retain
the conventional reading journeys.
`?view=collection&shelf=all` searches all collections. Earlier Appearance
journey/filter links without a shelf retain their original meaning. Narration
links retain their view, shelf and topic; private notes never enter share URLs.

`?view=listen&shelf=appearance`, `?view=listen&shelf=character` and
`?view=listen&shelf=life` open the narrated-story listening view. The optional
topic selects a starting chapter without autoplay. Story playback does not
mark source reports read or turn editorial chapters into bookmark/note records.
Version-2 personal backups can retain story listening positions through the
validated playback catalog, while older backups remain importable.

`?view=audiobooks` opens the three-book library. Existing `view=listen` links
remain valid book-detail links. Listening position is not a claim that every
earlier chapter was heard, and it never changes explicit read/unread marks.

Appearance and Character retain their thematic Story trails. Life uses a
separately reviewed chronological sequence, not historical reenactments.
All three use reviewed, source-backed highlights; there are no invented
dialogues or physical depictions. Scrolling changes the visual
position only, not explicit read marks. Motion pauses offscreen or behind the
reader, and existing pause/reduced-motion preferences apply. Audio is never
generated or automatically played by scrolling.

A chapter starts playing only after a deliberate action. Reader and compact
controls share one audio engine. Switching audio language pauses playback and
uses that language's own saved position rather than aligning unlike transcripts.
Queues stop at the end and never silently skip a failed asset or synthesize a
replacement. Follow mode moves at narration boundaries when a matching passage
exists; it does not provide word-level synchronization or steal keyboard focus.

Resume saves current media time on pause, seek, track changes and lifecycle
events, with bounded periodic checkpoints. A normally paused position is
restored after media metadata loads. Browser/process crashes may lose time
since the last checkpoint; uninterrupted background playback is platform-dependent.

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

## Release approvals and static audio

Follow [RELEASES.md](RELEASES.md). Each release needs its own written plan and
explicit user approval; a feature roadmap does not authorize future work.

Release 2.0's approved audio approach is **generate once, play saved MP3s**.
Azure Speech is used only by an explicitly invoked generation tool. Browser
playback reads static audio assets; it does not call Azure Speech. Keys and
tokens must never be committed, embedded in the browser, or printed in logs.
Paid generation must not run automatically in the deployment workflow.
The CI audio check is offline and verifies saved assets, transcripts, hashes
and complete entry/language coverage. See the
[audio operations guide](web/scripts/audio/README.md) for manual gated
generation, conservative budgeting and cache/recovery rules.

Stock synthetic voices read the Arabic source reports and the original
English/Urdu summaries, with exact spoken transcripts and visible synthetic
labels. English/Urdu audio is not a complete hadith translation. Voice samples
require user approval before bulk generation, and all requests, including
retries, count toward the approved synthesis allowance.

Release 2.2 has a separately approved **US$10 before-tax maximum** for new Life
audio using the existing resource and stock voice profile. Its private ledger
is separate from the immutable Release 2.0 ledger. New release approval is not
permission to reset a failed run, regenerate cached files or exceed a cap.

Release 2.3 has a separate **US$20 before-tax Azure-only maximum** for the new
story recordings and corrections. All 72 final tracks are complete, with
US$15.761408 conservatively reserved across 74 attempts. Reservations are not
the final invoice. New output transcripts were matched to the source-checked
scripts before publication, and native provider results were retained before
MP3 encoding. Original report recordings and all earlier ledgers are unchanged.
There are no browser model requests; a future retirement of the preview model
does not stop playback of already saved files.

Private notes, read/unread state and resume information stay in browser storage.
They are not encrypted or automatically backed up; personal backup/restore is
an explicit user action. Private notes must never enter the public research
download, repository, or speech-generation inputs. Listening data uses its own
`noble-project.listening.v1` key; existing preferences and reading keys retain
their formats. Personal backup version 2 includes listening state while version
1 imports leave unrelated listening data alone. Imported audio identities are
validated against the published catalog, not treated as arbitrary media URLs.

The single-file HTML keeps offline text reading. Hosted MP3 playback still
needs connectivity unless a reader separately saves the audio file.

## Acknowledgments

Primary-source access is linked to [Sunnah.com](https://sunnah.com/). This project
does not copy its modern translations or claim affiliation.

Arabic and Urdu fonts are Noto Naskh Arabic and Noto Nastaliq Urdu, distributed
through Fontsource under the SIL Open Font License. The UI is built with React,
TypeScript, Vite, adapted shadcn/Radix primitives, and Lucide icons. The design
uses the Clawpilot light/dark theme.
