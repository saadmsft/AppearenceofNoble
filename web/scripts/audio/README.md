# Static audio generation and playback

Generate once -> save MP3 -> play static. Nothing here provisions Azure, reads
keys from Azure, or generates in CI. The browser imports only the static manifest.
The published manifest contains the saved audio. Missing coverage is a release
failure, not permission to generate on demand.

## Manual gates and commands

Run from the repository root with Node 24. No additional dependencies are needed.
Do not run the paid commands until the parent has authorized the actual Speech
resource, confirmed these stock voices are available, and checked its current
S1 rate and quotas. Release 2.0 generated the original 281 cached MP3s; later
content requires its own approved scope and synthesis allowance.

First inspect the exact current content and cost, entirely offline:

```sh
node web/scripts/audio/cli.ts dry-run
node web/scripts/audio/cli.ts dry-run --scope samples
```

The default sample entry is `most-handsome-face-best-form-bara`. Use
`--entry-id ID` consistently on sample planning, sample generation and bulk if a
different sample was reviewed. Samples contain the entire short report/summary,
never a truncated or substituted transcript; each must be at most 800 codepoints.

After **parent resource/rate authorization**, create a private directory outside
every Git checkout. Supply the key securely through the parent process environment,
not as a CLI argument, committed file, or literal in shell history:

| Environment variable | Contract |
| --- | --- |
| `AZURE_SPEECH_KEY` | Opaque Azure resource key; bounded printable ASCII without whitespace or control characters. Read only in paid modes after gates/preflight. |
| `AZURE_SPEECH_REGION` | Actual resource region, e.g. `eastus`; **not** `Global`. |
| `AZURE_SPEECH_ENDPOINT` | Optional. Must exactly equal `https://<region>.tts.speech.microsoft.com/cognitiveservices/v1`. Only allowlisted public Azure regions are supported. |
| `CI` | Any nonempty value forbids sample/bulk. Never unset this to generate in CI. |

```sh
mkdir -p "$HOME/.local/state/the-noble-project-audio"
chmod 700 "$HOME/.local/state/the-noble-project-audio"

# First authorized sample run ONLY; --init-ledger refuses to replace an existing file.
node web/scripts/audio/cli.ts sample \
  --ledger "$HOME/.local/state/the-noble-project-audio/release2-ledger.json" \
  --init-ledger --resource-approved
```

**STOP: the user must listen to and approve all three samples before bulk.**
The tool cannot judge pronunciation or grant that approval. `--resource-approved`
attests the parent's authorization; `--samples-approved --bulk-approved` attest
the user's separate approvals. Flags are not an authorization service.

```sh
node web/scripts/audio/cli.ts dry-run \
  --ledger "$HOME/.local/state/the-noble-project-audio/release2-ledger.json"

# Only after the three samples are approved:
node web/scripts/audio/cli.ts bulk \
  --ledger "$HOME/.local/state/the-noble-project-audio/release2-ledger.json" \
  --resource-approved --samples-approved --bulk-approved

# Required before publication; nonzero exit means incomplete/invalid assets or mappings.
node web/scripts/audio/cli.ts dry-run --check-coverage \
  --ledger "$HOME/.local/state/the-noble-project-audio/release2-ledger.json"
```

Resume with the same command and **same ledger**, omitting `--init-ledger`.
Completed clips are verified and not regenerated. Never delete, replace, edit,
or switch ledgers to reset spending/attempts. Preserve a backup outside the repo.

A genuinely new release can have a new ledger only after explicit approval of
its new scope and allowance. Release 2.2 has that separate approval for new Life
source audio, using the previously approved stock voices and pacing. Preserve
the Release 2.0 ledger unchanged, reuse its existing cached assets, and use a
separately named private Release 2.2 ledger for every new attempt and resumption.
Do not use a new release ledger to retry failed old work or bypass attempt caps.
Reusing an unchanged, already approved voice profile does not authorize a new
voice, rendering style, cloud resource or additional spending.

## Billing, failures and cache

The fixed per-approved-release cap is **US$10 before tax**, shared across that
release's samples, retries, corrections and bulk.
The configured meter is S1 Neural TextToSpeechCharacters, Global billing label,
$15/1M characters. Costs use integer microdollars (15 per billable character).
Every attempt is durably reserved before its HTTP request; no automatic refunds,
including errors, timeouts or interrupted attempts. These are conservative
reservations, not a claim about Azure's final invoice. Stop if the verified rate
differs; the tool must be reviewed rather than silently raising the cap.

Plans print exact transcript Unicode codepoints, conservative billable counts,
per-clip/total expected cost, retry upper bounds, cached/new clip counts and all
entry mappings. Only `<speak>` and `<voice>` SSML wrappers are generated; no
billable prosody/style tags. Escaped text entities are conservatively reserved
at their serialized length, and Han codepoints count twice per Microsoft's
policy. Arabic combining marks, spaces and punctuation count individually.
There is no Unicode/whitespace normalization: only the `ﷺ` ligature expands to
a clearly spoken language-appropriate blessing. The exact resulting text is
saved in the manifest.

Requests are sequential, spaced by at least one second. `--max-attempts 1..3`
defaults to three total attempts **per cache key across all resumptions**, not
three per run. Only HTTP 429/5xx retry, with exponential delay and Retry-After.
A Retry-After over 60 seconds stops for manual later resumption. Timeouts,
transport errors, redirects, malformed responses and other HTTP errors stop;
they never produce a successful asset/manifest entry. `--timeout-ms` defaults
to 60000, includes body streaming and is capped at 120000. No provider response
bodies, credentials, causes or stacks are printed.

The SHA-256 cache identity covers exact transcript, stock voice, MP3 format and
versioned rendering profile. All `content/*.json` arrays are discovered,
including Character and Life source records. Only `id`, `arabicFull` and original
`summary.en/ur` feed the planner; private/editorial notes are not narration.
Historical milestone metadata lives outside `content/` and is not implicitly
spoken as if it were a hadith. Arabic retains the entire isnad, report and compiler remarks. Repeated Arabic
reports share one MP3 while every entry/language still has its own mapping.

Each clip is written atomically to `web/public/audio/<cacheKey>.mp3`, followed by
a same-basename `.json` recovery receipt and the atomic aggregate
`web/src/data/audio-manifest.json`. All output paths are fixed; the ledger is
the only supplied filesystem path. Cache reuse verifies exact metadata,
transcript identity, MP3 SHA-256, byte length and MPEG frames/duration.
Receipts recover completed clips after an interrupted manifest write.
An orphan MP3 without a receipt/manifest, a missing registered file or corrupt
cache **stops** instead of paying again. Restore a known-good file/receipt or
have the parent investigate; do not erase accounting to retry.

Exclusive ledger and manifest `.lock` files prevent concurrent writers.
After a crash, verify that no process owns either lock before manually removing
those exact lock files. Never remove the ledger. Atomic writes use fsync/rename.
Reports over 4500 codepoints and MP3s near the REST ten-minute truncation limit
are rejected for a separately reviewed splitting design, not silently truncated.

## Player integration and publishing

```tsx
import { AudioPlayer } from './components/AudioPlayer'

<AudioPlayer entryId={row.id} language={language} />
```

`language` is the UI language (`'en' | 'ur'`). An optional `tracks` prop accepts
validated `AudioTrack[]` for explicit integration/fixtures; omitted means the
bundled manifest. The component imports its own `audio.css`. The Reader receives it through
`audioContent`. The standalone component above remains useful for isolated
fixtures; in the application, pass the shared listening controller and mount
the compact player/media engine once above route and reader switches. Reader
controls and chapter queues must never create competing streams.

A deliberately started queue survives reader close and same-collection view
changes. Switching collections pauses it. Language changes pause and use a
language/asset-specific cursor, not percentage-based alignment between different
transcripts. Reload restores an offer to resume, not autoplay. Optional Story
following is narration-level and starts off; no word-alignment data is present.
Missing files, playback errors and failed persistence remain explicit. No
fallback voice or automatic synthesis is permitted.

The version-1 schema in `src/lib/audio.ts` includes each track's entry ID,
language, stock voice, full-report/summary kind, synthetic flag, exact transcript,
transcript hash/counts, cache key, format/rendering profile, asset path,
byte length, SHA-256 and duration. Only `audio/<64-lowercase-hex>.mp3` paths
are accepted. Playback resolves to the fixed approved public URL
`https://saadmsft.github.io/AppearenceofNoble/audio/<cacheKey>.mp3`.
Changing the hosting origin requires an explicit source change/review.
For local previews only, the player resolves the same asset path on the current
loopback origin (`localhost`, `127.0.0.1`, or `[::1]`). This permits listening to
samples before publishing. Downloaded `file:` HTML and all non-loopback origins
use the fixed public URL; arbitrary external asset paths remain rejected.

MP3s remain separate public downloads, never imported/embedded as the entire
library in the single-file offline HTML. Deploy `web/public/audio/` with the
site's static build after full coverage passes. HTML text remains offline;
audio explicitly needs internet unless the individual MP3 is saved. Cross-origin
browser rules can turn Download into Open; users can save the opened file.
English/Urdu notices, Arabic/English/Urdu selection, accessible player controls,
rate choices and plain-text transcripts are included. Standalone native media
control wording follows the OS; app controls follow the selected UI language.

Offline tests:

```sh
node --test web/tests/audio.test.ts web/tests/audio-player.test.ts
cd web
./node_modules/.bin/tsc -b --pretty false
./node_modules/.bin/tsc --ignoreConfig --noEmit --strict --skipLibCheck \
  --target es2023 --module nodenext --moduleResolution nodenext \
  --allowImportingTsExtensions --types node \
  scripts/audio/cli.ts tests/audio.test.ts tests/audio-player.test.ts
```

Provider tests inject fake fetch/storage and non-speech frame fixtures. The player
test launches its own isolated local Chromium, blocks external requests and mocks
media methods; it does not use a shared browser or claim real playback quality.
Actual resource availability, live output quality/pronunciation, user approval,
full production coverage and deployed/offline-download listening remain parent
gates. The generation tool never publishes the application itself.

Official references used for the REST/SSML/MP3 and billing implementation:
[REST text to speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech),
[billable characters](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech#pricing-note),
and Microsoft Learn's Speech code-sample search.
