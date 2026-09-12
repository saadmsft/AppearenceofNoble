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

No release after 2.1 has been approved.
