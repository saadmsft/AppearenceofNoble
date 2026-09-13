# The Noble Life: monthly production plan

Approved production policy: 13 September 2026.

## Starting point and schedule

Episode 1, **Before His Birth: Makkah and the Sacred House**, was published on
13 September 2026 as `monthly-life-001`. English is an explicitly abridged
9:58 edition; Urdu is 11:47. Its packet directory was labelled `2026-10` during
planning, but that directory is not its publication month. Do not repeat it.
The published catalog in `web/src/data/monthly-series.json` is authoritative.

Prepare one next episode on the **first day of each month at 09:00 UTC+03:00**,
starting **1 October 2026 with Episode 2**. The existing scheduler interprets
`0 9 1 * *` in its local UTC+03:00 timezone; the verified next instant is
`2026-10-01T06:00:00Z`. Recheck if the host timezone changes.

These are editorial production slots, not promises of public release dates.
If an earlier episode is awaiting publication approval, preserve its packet and
report that approval is pending rather than generating duplicates or silently
moving to another episode. Following slots shift when necessary.

## Twelve-month editorial roadmap

| Production slot | Episode | Working title and focus | Starting evidence and boundaries |
| --- | --- | --- | --- |
| October 2026 | 2 | **Birth, family and early childhood** | Compare hadith evidence with critically assessed early sirah accounts. Distinguish the reported weekday from disputed exact dates. Do not repeat Episode 1's Sacred House narrative or add unverified birth signs. |
| November 2026 | 3 | **Growing up: work, responsibility and trust** | Early work and family circumstances, using established reports and attributed biographical context. Do not invent ages, commercial journeys or childhood conversations. |
| December 2026 | 4 | **Khadijah and the household before revelation** | Source-supported family context and the relationship's role in the opening revelation account. Identify uncertainty in popular marriage details rather than treating a familiar retelling as evidence. |
| January 2027 | 5 | **The first revelation** | The opening revelation account, Qur'anic context and qualified commentary. Preserve differences between reports; do not reconstruct an imagined inner monologue. |
| February 2027 | 6 | **The early call in Makkah** | The call, early responses and the experiences of early believers, with each episode of the narrative separately sourced. Avoid composite dialogue and unverified conversion chronology. |
| March 2027 | 7 | **Steadfastness through hardship** | Selected Makkan hardships, patience and support. Assess sirah reports about persecution, migration to Abyssinia and boycott individually before deciding the episode's final scope. |
| April 2027 | 8 | **Loss, Ta'if and mercy** | Established Ta'if testimony, with separately sourced context for personal losses. Do not merge different events or introduce unsupported violence, dialogue or an exact itinerary. |
| May 2027 | 9 | **The Hijrah** | Qur'anic context, authenticated migration reports and carefully attributed chronology. Exclude familiar cave embellishments unless individually verified and accurately qualified. |
| June 2027 | 10 | **Building a community in Madinah** | The mosque, hospitality, brotherhood and community responsibilities. Distinguish established reports from later documentary reconstructions and broad political claims. |
| July 2027 | 11 | **Badr and Uhud: responsibility and lessons** | Selected, source-supported events and conduct, with Qur'anic context. Keep the narrative non-graphic and do not turn two battles into a fictional continuous scene or invent strategy and motives. |
| August 2027 | 12 | **Hudaybiyyah and the return to Makkah** | Treaty reports, their context and the later return. Preserve the intervening time and differences between accounts rather than implying immediate succession. |
| September 2027 | 13 | **The Farewell Pilgrimage and final days** | Individually identified farewell reports and final-days accounts. Do not create a composite popular sermon, an invented final speech or an unsupported "last" moment. |

Titles and subject divisions are provisional, not factual clearance. Narrow an
episode or split a broad topic if the evidence or 15-minute format requires it;
record the change. Material changes to the series purpose require user approval.
This introductory season is not an exhaustive biography or a claim to resolve
all historical disagreements.

## Multiple-source research standard

Use at least two relevant, distinct source works for each episode where the
evidence supports that scope. Two websites repeating one report are not
independent corroboration. Do not force extra sources or claims to reach a quota.

- **Qur'an:** verify relevant Arabic verses and context, using Quran.com or
  another identified, reputable edition. Do not mislabel scripture as hadith
  or use commentary as though it were the verse itself.
- **Hadith collections:** consult Bukhari, Muslim and other relevant collections.
  Sunnah.com is an access/reference option, not the only authorized website.
  Preserve chains, transmitter alternatives and attributed assessments.
- **Early sirah and biographical works:** Ibn Hisham's transmission of Ibn
  Ishaq, Ibn Sa'd and al-Tabari are research candidates, not automatically
  authenticated evidence. Use identifiable editions via reputable libraries
  or lawful scans; record work, author, edition, volume/page or chapter and URL.
  Clearly distinguish historical reports from authenticated Prophetic speech.
- **Commentary and scholarly analysis:** use identified hadith commentaries,
  critical scholarship and reputable academic/reference publications to assess
  chronology and disagreements. Separate their interpretations from primary
  testimony. Search snippets, social posts, anonymous blogs and AI answers are
  discovery leads, not final evidence.

Every factual narrative section needs an evidence map. Record Arabic checks,
source type, exact reference, attribution/assessment, uncertainty and the
claim supported. No requirement that every statement have two independent
witnesses; accurately describe where a claim rests on one source.

Original English and Urdu exposition is preferred. Do not copy substantial
copyrighted translations or infer reproduction/audio-adaptation rights from
free API access or public availability. Respect access controls and site rules;
no bulk scraping or credential disclosure. Official Sunnah.com API access
remains conditional on an actual grant, not the existence of request
`sunnah-com/api#3839`.

## Automated production and standing budget

The user explicitly authorized **automatic research, scripts and English/Urdu
audio generation within US$25 per calendar month before tax**, with approval
still required before publication. This standing policy applies from the next
scheduled production month, October 2026. September's completed Episode 1
retains its separate one-off ledger; do not re-open or refund those reservations.

The monthly limit is shared across both languages, synthesis, retries and paid
quality checks. It is not US$25 per language, episode, attempt or workflow run.
Copilot drafting/automation credits are separate and are not covered by this
Azure ceiling. Unused monthly allowance does not roll over.

Use a durable private ledger shared across worktrees under the resolved Git
common directory: `noble-monthly-audio/YYYY-MM/ledger.json`, with artifacts in
the same month's private directory. Determine the budget month in UTC+03:00.
Do not place credentials, provider responses or private budget records in the
public repository. A fresh worktree or manual rerun must load the same ledger.

Before any paid request:

1. Discover and validate the shared ledger and existing job/audio identities.
   Reuse completed recordings. Missing or inconsistent prior accounting is a
   blocker, not permission to start another allowance.
2. Recheck the actual deployed model's availability, version, current meter
   prices and request limits. Use the approved Cedar voice and an available
   approved profile. The previously used preview deployment listed retirement
   on 15 October 2026; do not assume it remains usable for later months.
   If unavailable, request approval for a replacement rather than silently
   deploying or selecting a different model.
3. Use an exclusive lock and atomic ledger writes. Reserve a conservative
   upper bound for the request before sending it; refuse it if cumulative
   reservations would exceed US$25. Keep failed/uncertain charges reserved.
   All workers and later runs must share this gate.
4. Save provider output, usage and transcripts before local encoding. Retain
   original bytes and hashes. Do not bypass provider filters; stop and explain
   the blocker without retries or rephrasing designed to evade it.

Resume unfinished work before advancing. At a month boundary, retain old
ledgers and carry any unresolved reservation into the remaining job's accounting
conservatively; do not reset a failed run to obtain a second episode allowance.
Do not provision resources, paid tiers or new deployments under this approval.
The workflow prompt governs future executions; this document is not itself a
provider-side spending enforcement mechanism.

## Writing, timing and quality

Create connected, respectful original narrative in English and natural Urdu,
normally covering the same supported facts. Correctly speak the full salutation
**صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ**. No invented dialogue, motives, thoughts,
weather, dates, itineraries, miracles, rewards, obligations or historical sound
effects. No impersonation of sacred or historical persons.

Target roughly **15 minutes per language at normal playback speed**, ideally
14-16 minutes after measurement. Calibrate script length from actual saved
Cedar timings, not the estimates that produced Episode 1's shorter files.
Record word-count assumptions, then measure the final recordings. Do not pad,
stretch or silently claim 15 minutes. If evidence, generation limits or budget
prevent reaching the target, disclose the actual result for approval.

Use meaningful, language-specific chapter markers and a transcript matching
each exact recording. Verify complete decoding, duration, sample format, hashes,
script/transcript agreement and salient pronunciation. Automated transcription
is evidence, not certified pronunciation or a substitute for final user review.
Bound retries and quality passes. Do not silently shorten only one language;
request approval for a materially different edition.

## Review and publication gate

Each monthly run produces a private, durable approval packet: episode identity,
both scripts, source companion, qualifications, audio files, exact spoken
transcripts, chapter timestamps, duration/quality results, ledger totals and a
concise proposed release plan. Include playable local review links where
available and artifact paths.

**Stop before publication.** Ask the user to approve the episode's recordings
and release plan. Do not update the live catalog, put unapproved media in
`web/public`, push, merge or deploy. The standing budget is not publication
authorization. Do not rerun completed generation while awaiting approval.

After approval, integrate only that episode, preserve its edition disclosures
and source notes, run existing integrity/player/RTL checks, publish, verify the
live assets and record its status. A later approved source companion may require
an explicit reviewed extension of the website's source-URL allowlist, which
currently accepts Sunnah.com and Quran.com; never strip other legitimate
citations or bypass validation to fit the existing schema.
