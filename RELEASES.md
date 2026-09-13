# Release approval process

Every release follows this sequence:

1. Prepare a written plan with scope, dependencies, costs, acceptance criteria,
   migration/privacy implications and publication steps.
2. Obtain the user's explicit approval of that plan and any spending allowance.
3. Implement only the approved release. Material scope changes require another
   approval; a roadmap is not authorization to build later releases.
4. Complete source, functional, accessibility and release-specific checks.
5. Publish the approved scope and confirm the live deployment.
6. Stop. The next release needs a new plan and approval.

## Release 2.0: The Noble Project

Approved by the user on 11 September 2026.

- Umbrella home with Appearance and Character collections.
- Existing Appearance text, IDs, source audit and bookmarks preserved.
- Eight Character themes and 24-32 source-checked entries.
- Local-only resume, explicit read/unread progress, private notes and validated
  personal backup/restore.
- Pre-generated, clearly labeled Azure AI Speech MP3 narration. Generate once,
  serve the saved files; no Speech calls on playback or automatic deployment.
- Maximum approved synthesis allowance: **US$10 before tax**, including
  samples, retries and corrections. No arbitrary paid resource provisioning.

The approved stock-voice proposal is Ryan (`en-GB-RyanNeural`), Asad
(`ur-PK-AsadNeural`) and Hamed (`ar-SA-HamedNeural`). The user must approve
short voice samples before bulk synthesis. Provider credentials stay outside
the repository and browser. Private notes are never speech-generation inputs.

The exact source transcripts, rendered audio, character count and conservative
request-budget ledger must be checked before release. Missing access or
insufficient allowance is a blocker to surface, not permission to substitute
fake audio, switch providers or exceed the cap.

## Release 2.0.1: Collection-switching hotfix

Approved by the user on 12 September 2026.

The journey hero and chapter list had duplicate sibling React keys, causing
old animated headers to accumulate when switching between Appearance and
Character. Give the siblings distinct collection-specific keys and cover
repeated switching, browser history, English/Urdu and personal-data preservation.

No redesign, source changes, MP3 regeneration, storage migration or Azure
operations are authorized by this hotfix.

## Release 2.1: Story Edition

Approved by the user on 12 September 2026 as the **main collection experience**.

- Add source-backed, scroll-paced story trails for Appearance and Character.
- Use one persistent, evolving ornamental stage, short reading beats and
  explicit chapter/passage navigation instead of a sequence of animated cards.
- Keep classic journeys as Reading view and retain the full library, reader,
  saved MP3s, notes, bookmarks and old links.
- Keep evidence behind deliberate actions. No invented scenes, chronology,
  dialogue, depictions or new source claims.
- Respect native scrolling, keyboard access, reduced motion and the pause
  preference; stop decorative work when hidden, offscreen or behind the reader.
- No audio regeneration, Azure operations or additional paid services.

## Release 2.2: The Noble Life and Story Listening

**Approved by the user on 12 September 2026.** The user approved this combined
plan, implementation and publication, including a fresh maximum synthesis
allowance of US$10 before tax on the existing Speech resource with the
previously approved stock voices. This approval does not reuse the Release 2.0
allowance or authorize additional cloud resources.

### Outcome and design

Extend the existing Noble Project, not a separate site or a redesign. A visitor
can explore Appearance, Character or Life through the same Story experience,
open the evidence deliberately, and listen to a chapter without keeping its
source reader open.

Keep the rose-ink/parchment palette, existing theme variables and fonts,
English/Urdu layouts, Arabic source text, light/dark themes, ornamental stage,
motion controls and conventional Reading view. The Story surface remains an
experience; source reading and audio controls remain clear, accessible tools.
No portraits, reenactments, invented dialogue, background music or simulated
historical voices.

| Addition | Release scope |
| --- | --- |
| Chapter listening | A deliberate Play chapter action queues its source narrations, with stable ordering and duplicate-audio handling. |
| Shared player | One audio engine, compact controls, play/pause, previous/next, seeking, language, speed, queue position and the current source. Reader controls use the same engine. |
| Listening resume | Local, language- and asset-aware playback positions, restored only after a deliberate resume action. |
| Follow the story | Optional narration-level following, off by default; never pretend to provide word-level synchronization. |
| The Noble Life | A third collection with 12 planned milestones, a chronological navigator, source-backed bilingual passages and modest geographic context. |
| Consistent integration | Life participates in home/navigation, Story/Reading views, source discovery, search, bookmarks, explicit read marks and private notes. |

On desktop, the existing stage gains a milestone/date/place treatment for Life
while the reading column retains its current composition. On mobile, the
compact player must leave usable reading space and not cover reader controls,
focus targets or safe areas. Motion uses the existing ink-path and ornamental
language, not a new animation framework. Geographic context uses a small static
locator with place labels, not a paid map service or a purported exact travel
route.

### Life content and evidence

The planned milestone sequence is:

1. Early life and work in Makkah.
2. The first revelation.
3. The Makkan years.
4. The journey to Ta'if.
5. The Hijrah.
6. Building the Madinan community.
7. Badr.
8. Uhud.
9. Al-Hudaybiyyah.
10. The return to Makkah.
11. The Farewell Pilgrimage.
12. The final days.

These are research topics, not approved factual copy. Research up to 24 new
source entries, reusing existing canonical narrations where appropriate rather
than padding the collection. Preserve all 95 existing entries, their IDs,
wording, source fingerprints and saved MP3s.

Each passage must identify the evidence supporting its claims. New narration
entries follow the existing full-Arabic, original-English/Urdu-summary and
attributed-grading rules. Classical source text is kept distinct from editorial
narrative; modern copyrighted translations are not copied.

Chronology, historical context and place metadata have separate citations and
uncertainty labels. A hadith's grade does not authenticate an editorial date,
map location or every claim about the surrounding event. Use approximate,
disputed or unspecified dates honestly; omit details that cannot be supported.
Do not combine different reports into a fabricated single narration. This is
an introductory, selected-source Seerah trail, not an exhaustive biography or
a claim of agreement across all traditions.

Source availability is a release dependency. If a planned milestone cannot be
supported adequately, report the gap and obtain approval for a scope change
rather than publish an invented or weakly supported replacement.

### Listening behavior

- Nothing plays on page load, restoring state, opening a reader or passive
  scrolling. Once the user starts a chapter, its queue advances until the end
  without looping.
- Default queues contain established reports. Cautioned reports require an
  explicit inclusion action and retain their warnings.
- A started queue survives closing the reader and moving between views of the
  same collection. Switching collections pauses it; it never starts another
  collection automatically. Starting a different narration explicitly replaces
  the active queue, so two streams cannot compete.
- Changing audio language pauses playback and selects that language's own
  saved position, or its beginning. It does not translate a timestamp between
  a full Arabic report and a shorter editorial summary.
- Follow mode changes position only at narration boundaries and only when
  enabled. It follows a matching passage; for a report without a matching beat,
  it keeps the relevant chapter context and identifies the current source.
  Manual exploration suspends following, and an open reader is never dragged
  away from its source. No word highlighting without alignment data.
- Save the current media time on pause, seek, track changes and page lifecycle
  events, with bounded checkpoints while playing. Resume a normally paused
  clip within one second of its saved position after metadata loads. An abrupt
  browser/process failure can lose the interval since the last checkpoint;
  do not claim crash-proof, sample-exact recovery.
- Listening does not mark narrations read. Playback, media and storage failures
  have explicit states and recovery actions; there is no automatic voice
  substitution, silent skipping or on-demand synthesis.

### Data, dependencies and compatibility

Generalize collection metadata and route handling instead of adding another
Appearance/Character special case. Retain the unique collection-specific
component keys that fixed the switching bug. Existing links, narration hashes,
classic journeys and the portable HTML filenames continue to work.

Life milestones reference canonical source IDs. Cross-listing a source must
not duplicate a person's note/read state or rewrite an existing source's
identity. Keep historical milestone metadata separate from narration records
and from the public text fields admitted to speech generation.

Use a separate versioned local listening store, leaving existing preferences
and reading records intact. Extend personal backups with an explicit new
version that includes listening state, while continuing to import version-1
backups without discarding unrelated listening data. Preserve conflict-aware
merge, confirmed replacement, verified writes and clear partial-failure
reporting. Pause playback before preparing a listening-state restore so its
preview cannot race a running playback checkpoint.

No accounts, analytics, backend, cloud note storage, new paid map service or
browser Speech SDK. Private notes and listening history never enter public
source exports, research files, speech inputs or deployment assets.

Existing MP3s remain unchanged. New Life source entries receive saved Arabic,
English and Urdu tracks using the previously approved stock voices and pacing.
Arabic reads the complete primary report; English/Urdu read the approved
original source summaries, not a dramatized biography. Long reports, if needed,
require lossless segment support with complete transcript coverage and bounded
clips; never truncate a source or bypass the current duration safeguards.
Reuse existing assets and rendering identities whenever compatible.

### Approved cost authorization

Listening Mode itself needs no new synthesis. New Life audio requires a
**fresh maximum allowance of US$10 before tax**, including every synthesis
attempt, sample, retry and correction. This is not a use or renewal of the
unused Release 2.0 allowance.

Reuse the existing Release 2.0 Azure Speech resource and approved Ryan
(`en-GB-RyanNeural`), Asad (`ur-PK-AsadNeural`) and Hamed
(`ar-SA-HamedNeural`) voice profile. Do not create or modify cloud resources.
Generate only missing approved audio, save the MP3s, then serve those files
through GitHub Pages. Listening to them causes no Azure Speech requests.

The current Azure retail response lists standard S1 neural synthesis at
**US$15 per million characters**, under the primary Global billing meter.
Global is the billing label, not a replacement for the existing Sweden Central
resource endpoint. The final estimate depends on the reviewed transcripts,
segmentation and conservative billable counts; calculate it before paid work.

Pricing source: [Azure Retail Prices API](https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview&$filter=meterName%20eq%20%27S1%20Neural%20Text%20To%20Speech%20Characters%27%20and%20armRegionName%20eq%20%27Global%27%20and%20priceType%20eq%20%27Consumption%27).

Keep a new private, durable release ledger, separate from and without changing
the Release 2.0 ledger. Reserve conservative cost before every request, retain
failed-attempt reservations and stop if access, pricing or the remaining
allowance is insufficient. The allowance concerns this release's synthesis,
not unrelated Azure account usage or taxes. No paid generation runs in CI.

### Acceptance criteria and publication

- All 12 milestones have reviewed bilingual content and traceable evidence;
  historical uncertainty is not concealed by a hadith grading badge.
- Existing source fingerprints and MP3s are preserved. Every new published
  audio mapping has a valid complete transcript, asset, hash and duration;
  segmented reports preserve the entire source in the correct order.
- Chapter queueing, seeking, interruption, resume, language changes, optional
  following and error recovery work without overlapping streams or autoplay
  after a reload. Missing audio never triggers a paid request.
- Existing private notes, bookmarks, explicit unread states and old backups
  survive the update. New listening backups round-trip with safe conflict and
  storage-error handling.
- All three collections support English/Urdu, mobile and desktop, keyboard
  operation, reduced motion and paused animation. Repeated collection swaps
  and browser history leave one correct stage/header and preserve personal
  data and source-reader return position.
- The existing source/audio checks, unit/component and relevant end-to-end
  suites pass. The static build and portable text edition retain their current
  offline behavior; MP3s still require a connection unless separately saved.

Implementation sequence: research and audit the Life corpus; implement shared collection
and listening foundations; integrate the Life presentation; lock source text
and generate approved missing audio within the allowance; complete the existing
release gates and a bounded desktop/mobile visual review.

Publish both features together as 2.2.0 through the existing main-branch
GitHub Pages workflow, then confirm the deployed routes and assets. Do not
publish one unfinished half, rename the repository, migrate the domain or begin
another release under this approval. Material scope changes or additional
spending require a fresh decision.

The implemented 2.2 scope contains 16 new narration records, one unchanged
cross-listed Badr source and all 12 milestones. The project now has 111
canonical entries, 333 audio mappings and 329 unique MP3s. All 48 new MP3s
completed within a conservative generation reservation of **US$0.40725 before
tax**. Existing source files, 285 audio mappings, 281 MP3s and the Release 2.0
ledger remain unchanged. No segmentation or additional resources were needed.

## Release 2.2.1: Dedication and gratitude

Approved by the user: wording, once-per-tab-session behavior and publication.

- Add a gentle English/Urdu welcome popup in the existing manuscript style,
  with a short fade that respects reduced motion. Show it once per browser-tab
  session, not on every navigation or reload after dismissal.
- Put dedication to Allah first, then love and reverence for Prophet Muhammad
  (S.A.W.W.), followed by thanks for the continuing support of the user's mother,
  Farkhanda Abid, and father, Abid Mahmood. This is a personal dedication, not a
  narration or religious quotation.
- Provide an immediate close button, Escape dismissal, an Enter the project
  action, and a permanent Dedication link in the footer. Direct narration links
  must remain uninterrupted; the welcome must not compete with the reader.
- Preserve language selection, RTL, keyboard focus, themes, motion preferences,
  reading data, all source records and existing audio. Do not start playback.
  Use only a separate session-scoped dismissal flag, with graceful and visible
  handling if remembering dismissal is unavailable.
- No Azure calls, audio regeneration, new dependencies or additional agents.
  Check the new popup lifecycle and existing reader/navigation behavior, then
  publish the approved small release through the existing Pages workflow.

Proposed English wording:

> For the pleasure of Allah, and in love and reverence for Prophet Muhammad
> (S.A.W.W.).
>
> With heartfelt gratitude to my mother, Farkhanda Abid, and my father,
> Abid Mahmood, who continue to support me in this project.

The Urdu edition will carry the same dedication and present-tense gratitude,
using the names shown to the user for approval. No memorial language is used.

## Release 2.3: Illuminated motion and narrated stories

Status: approved for implementation and publication, with a fresh US$20
before-tax Azure-only bulk allowance. The user also selected newly written continuous
story narration for all three collections, with natural Urdu and correct
pronunciation of the salutation as an explicit requirement. The earlier
animation-only scope is superseded by this proposal.

- Focal moment: a manuscript-inspired ornamental aperture opens into each new
  Story chapter. Use a bounded 500-800 ms sequence inside the existing shared
  stage, rather than adding page-wide transitions or retaining duplicate
  headers. Keep the current source and passage immediately readable.
- Depth: on fine-pointer desktop devices, let decorative frame layers respond
  gently to pointer position, with a restrained rose-toned light treatment.
  Controls, text, calligraphy and geographic labels stay stationary. Touch
  devices use the simpler non-pointer presentation; no device permissions.
- Welcome: add a short, one-shot ink-drawing flourish to the home ornament and
  dedication medallion. Do not delay reading or dismissal, split Urdu letters,
  animate sacred names or alter the approved dedication wording and order.
- Feedback: give chapter/source controls brief ink-edge hover/focus feedback
  and clear pressed states without moving their hit targets or obscuring focus.

Preserve the manuscript palette, typography, English/Urdu parity, all three
collections, source evidence, listening behavior, private data and old links.
Life's locator remains schematic; add no invented routes or historical claims.
Do not add sound effects, autoplay, fake waveforms or new narration.

Use existing CSS/SVG and motion helpers, with no new dependencies, WebGL,
video backgrounds or particle systems. Keep motion work bounded: no per-frame
React renders; cancel pending work on unmount; stop when hidden, offscreen or
behind a reader/dedication dialog. Paused and reduced-motion modes render a
complete static alternative. Native scrolling and focus behavior stay intact.

Implementation is direct, without additional agents. Use the existing motion
and navigation tests, including interrupted/repeated transitions and mobile
reading space. Perform one combined desktop/mobile visual review and, if
needed, one correction/confirmation round; do not run open-ended polishing.
Publish only the approved scope through the existing Pages workflow.

### Narrated-story scope

- Write original connected English and Urdu narration for Appearance,
  Character and Life, retaining their existing 16, 8 and 12 chapter structures.
  Appearance and Character remain thematic; only Life uses the reviewed
  chronology. Use the audited corpus, with no invented dialogue, motives,
  scenes, historical dates or reconstructed voices.
- Present these as editorial stories, never as newly authenticated hadith or
  full translations. Provide exact spoken transcripts and the supporting
  sources; retain the existing Arabic report recordings separately.
- Add a minimal listen-only view with continuous chapter playback, explicit
  Play, pause/skip/seek, saved position and access to the current evidence.
  No page-load autoplay; background/lock-screen behavior is platform-dependent.
- New recordings are generated once and saved as MP3s. Existing source text,
  report audio and personal data remain intact. Storage/backup compatibility
  must be explicit; story scripts must not be disguised as narration records.

### Urdu pronunciation gate and proposed audition

Correct, natural pronunciation of the full salutation, "Sallallahu alayhi wa
sallam", is a go/no-go criterion. Do not send the letters S.A.W.W. or an
unexpanded symbol as the intended spoken wording. Use the full Arabic/Urdu
phrase and only pronunciation controls supported by the chosen voice. Do not
promise that spelling or SSML alone guarantees pronunciation quality.

First seek separate approval for a small audition: at most three short Urdu
samples using supported Azure voices/settings on the existing Speech resource,
with the salutation in ordinary sentences and natural pauses. Label them
synthetic. The user must approve pronunciation and voice quality before any
full story recording. If no candidate meets the requirement, stop and discuss
human narration or another separately approved approach; do not mass-produce
unacceptable audio.

Proposed audition-only allowance: a fresh **US$1 maximum before tax**, including
all sample attempts and corrections. This does not reuse an older allowance
or authorize bulk narration, new cloud resources or publication. The current
standard S1 neural retail meter is US$15 per million characters; measure the
actual sample inputs before sending them. Preserve a separate private ledger
and all previous ledgers. Any different meter needs a new estimate.

After the voice is selected, present the complete story scripts and the
revised full-release scope/budget for approval before bulk generation. Motion
itself requires no Azure calls. Normal Copilot usage is separate from the Azure
allowance; the audition limit is not a cap on AI coding credits.

The user has additionally asked about Voice Live or higher-quality Foundry
audio models. Shortlist `gpt-4o-mini-tts` and Urdu-capable Azure Speech HD/Omni
voices for an audition, subject to actual language support and regional
availability. Do not assume that a voice's style or pronunciation controls
work for Urdu merely because they work for English.

Voice Live is a real-time voice interaction service, not a guarantee of better
Urdu pronunciation. For these fixed, reviewed stories, prefer expressive
text-to-speech generation followed by saved MP3 playback. Live per-visitor
generation would change the approved static architecture and require separate
authentication, hosting and usage-budget decisions. No such change is approved.

The standard S1 character rate above must not be applied to GPT audio, HD or
Voice Live without checking the specific meter. The audition allowance and
full release remain unapproved; obtain model-specific pricing and explicit
approval before deploying a model or making paid audio requests.

### Selected existing Azure OpenAI audio model

The user requested the latest Azure OpenAI audio model in the existing
Foundry resource. Read-only account/catalog discovery confirmed an existing
successful `gpt-realtime-2.1` deployment, version `2026-07-07`, on
`GlobalStandard`. This is the newest native-audio generation option found in
that resource; it supersedes the earlier candidate shortlist. No new model
deployment is required or has been created.

The catalog marks this model Preview and currently lists inference retirement
on 15 October 2026. Generate and save approved audio rather than making the
public site depend on live inference. Pin and recheck the model version for
generation; do not silently substitute a later model or different voice.

Verified Sweden Central Global retail rates, per million tokens: text input
US$4, text output US$24, and audio output US$64. The audition will use text
input only, with bounded output and conservative pre-request reservations.
These rates replace the standard Speech character rate for this candidate.

The next proposed action is a short saved Urdu pronunciation sample using this
existing deployment, within a fresh US$1 before-tax audition allowance. The
model choice is recorded; paid generation and the full release still await
explicit approval. This selection does not authorize live per-visitor calls,
bulk narration, new infrastructure, or spending from earlier release ledgers.

The user subsequently approved one short Urdu pronunciation sample on this
existing `gpt-realtime-2.1` deployment, with a fresh maximum of US$1 before tax.
This is audition-only approval. Capture the generated audio and transcript,
retain conservative per-request token reservations in a new private ledger,
then stop for the user's voice/pronunciation review. No full recordings,
application changes or release 2.3 publication are authorized by this step.

### Approved voice and full-generation request

The user approved the saved Urdu audition's voice and pronunciation, then
requested generation for all collections and emphasized speed. The selected
voice is `cedar` on the existing `gpt-realtime-2.1` deployment. Do not repeat
voice selection or generate more auditions without a specific quality issue.

The proposed complete Release 2.3 delivery is:

1. Write connected, source-linked English and Urdu story scripts for all three
   collections: Appearance (16 chapters), Character (8) and Life (12). Reuse the
   audited material, retain attribution and uncertainty, and invent no scenes
   or historical details. These are new editorial story tracks, not replacements
   for the existing 111 report recordings.
2. Generate up to 72 short chapter MP3s with the approved model/voice. Bound
   each request, retain model output and usage before local encoding, check
   transcript fidelity, and reuse completed assets rather than restart a batch.
   Process independent work efficiently within the deployment's rate limits.
3. Add continuous listen-only playback, chapter navigation, seek/resume,
   transcripts and source access using the existing player foundations. Preserve
   existing reading state, backups, individual report audio and all old links.
4. Complete the four bounded motion enhancements above without redesigning the
   application. Work directly, without additional agents or open-ended polish.
5. Run the required source/audio, lifecycle and Pages gates, then publish the
   complete approved release. Stop for material source/fidelity problems or
   an insufficient remaining allowance, not for another routine voice audition.

Approved new bulk allowance: **US$20 maximum before tax, Azure generation only**,
including all retries and corrections. This is a ceiling, not a promised bill,
and is separate from Copilot AI usage and the already-approved audition ledger.
Do not draw from old release allowances.

At the currently verified rates, reserving 8,192 input tokens and a conservative
2,048 tokens at both output rates is US$0.212992 per request. Seventy-two such
reservations total US$15.335424, leaving US$4.664576 of the proposed ceiling for
bounded retries. Recheck actual model limits, pricing and input lengths before
generation; never silently increase the ceiling, drop chapters or switch voices.

The user explicitly approved this full-release plan and fresh bulk allowance.
That approval authorizes composing and source-checking the scripts as part
of delivery, without a separate mandatory script-by-script approval round.

Implementation: 36 connected bilingual chapters and 72 transcript-matched MP3s,
approximately 35.55 minutes across the six complete trails. The approved
generation used 74 attempts, including one provider timeout and one transcript
correction, with US$15.761408 conservatively reserved. Existing report audio,
canonical source records and prior ledgers remain unchanged. The new stories
use a separate audio manifest and explicit editorial entry type.

## Release 2.3.1: Custom domain

The user confirmed purchasing `thenobleproject.org`. Proposed connection plan:

- Use `thenobleproject.org` as the primary GitHub Pages domain, with
  `www.thenobleproject.org` directed to the same site.
- Prepare the static build and audio/link resolution for a domain-root
  deployment while retaining compatibility with the old GitHub Pages address.
  Update canonical public URLs, not the repository name or source records.
- Configure the GitHub Pages custom-domain setting before pointing web DNS at
  GitHub. Use the registrar's existing authoritative DNS service; replace only
  conflicting apex/www parking or web records. Preserve mail and unrelated
  TXT/DNS records. Do not add wildcard records.
- Check domain verification and DNS, then enable enforced HTTPS once GitHub's
  certificate is available. Registration, DNS propagation and certificate
  issuance can introduce a wait outside the application's control.
- No purchases, Azure operations, audio regeneration or new hosting services.
  Verify the home page, deep links, saved audio and private-backup restoration
  behavior on the new origin.

Privacy/migration gate: browser-local data belongs to its original origin.
Notes, bookmarks and listening state do not transfer automatically to the new
domain. Before activating the domain/redirect, the user must have exported a
private backup from the old site's My reading page or confirmed no migration
is needed. Import that backup on the new site; source text and audio are not
part of the private backup. Appearance preferences may need to be selected
again. Never publish a private backup in the repository or site assets.

Approved by the user, who confirmed the private backup is saved or not needed.
Registration is with GoDaddy using its existing DomainControl nameservers.
The user elected to add the DNS records personally; the assistant configures
the application and GitHub Pages, then checks DNS and HTTPS readiness.

## Release 2.5: Monthly Series

Approved explicitly by the user on 13 September 2026: build and publish the
Monthly Series section, initially showing "First episode in preparation".
Add bilingual navigation, homepage and audiobook-library entrances, a separate
series landing/archive and support for approved episode pages with English/Urdu
audio, transcripts, source references, chapter controls and saved position.
Preserve the existing manuscript identity, bounded motion and shared player.

This release publishes the section and infrastructure only. It does not publish
the monthly automation's drafts, invent a release date or duration, generate
audio, call external APIs, or authorize Azure spending. The first planned
subject is the period before the Prophet's birth, subject to source review.
Monthly scripts and audio budgets/releases require separate explicit approval.

Monthly publications have a dedicated, initially empty strict catalog and
audio manifest. Only published entries with complete bilingual recordings
are admitted. Chapters reuse the existing editorial-story engine and private
backup format, remain separate from canonical narrations and the 36 existing
short story chapters, and cannot be mixed across monthly episodes in a queue.

## Release 2.4: Audiobook entrance

Approved by the user for the full audiobook entrance and player experience.
Make the existing narrated stories feel like a
deliberate audiobook experience, rather than build another audio system.

- Give the home page two clear entry actions: Read and explore, and Listen as
  an audiobook. Keep the dedication unchanged; do not add another welcome popup.
- Present Appearance, Character and Life as three audiobook titles with
  original ornamental cover designs, English/Urdu selection, actual total
  duration, chapter count and Start/Continue listening actions.
- Refine the existing listening view into a book-focused player: clear current
  title/chapter, chapter list with durations, saved position, playback speed,
  and 15-second back/forward controls. Reuse the same media engine and MP3s.
  Do not invent listening completion or automatically mark reports read.
- Keep transcripts and evidence available without dominating the listening
  screen. Preserve Story/Reading alternatives and existing listen URLs.

Use the established manuscript design, not Audible branding or copied artwork.
No subscriptions, checkout, accounts, new recordings, Azure calls, external
assets, additional agents or new frontend dependencies. Normal Copilot usage
still applies. Existing sources, audio identities and private-backup formats
remain unchanged.

Check accurate durations for the selected audio language, chapter/time resume,
one-stream playback, keyboard/RTL/mobile layouts and reduced motion. Use one
bounded visual review, then the existing Pages release gates. Work on this
frontend independently of certificate provisioning, but do not claim secure
custom-domain audio is ready until HTTPS is actually available.
