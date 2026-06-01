# Alberta Music Watch Nightly Audit Runbook

Last updated: June 1, 2026

This document keeps the operating memory for Alberta Music Watch inside the project folder. The nightly automation should treat this file, `README.md`, `backend/README.md`, and the repository scripts as the durable source of project procedure.

## Project Location

- Primary local project folder: `/Users/hhmusicnichdavies/Documents/Alberta Music Watch`
- GitHub repository: `https://github.com/DJNxDx/alberta-music-watch`
- Live site: `https://watch.albertamusic.live/`
- Evidence API backend: `https://api.albertamusic.live/`
- GitHub Pages custom domain file: `CNAME`

The older Codex workspace mirror may still exist under `/Users/hhmusicnichdavies/Documents/Codex/2026-05-20/files-mentioned-by-the-user-acsw/alberta-music-watch`, but the nightly audit automation is configured to run from the primary folder above.

## Current Automation

- Automation id: `alberta-music-watch-nightly-audit`
- Automation name: `Alberta Music Watch nightly audit`
- Schedule: daily at 3:30 AM Mountain time
- Execution environment: local
- Configured working directory: `/Users/hhmusicnichdavies/Documents/Alberta Music Watch`

At the start of each run, read this runbook and the repository `README.md`.

## Nightly Workflow

1. Sync `main` from GitHub. If shell Git is blocked by DNS or local Git metadata issues, use the GitHub connector compare fallback when available.
2. Review the private Hostinger evidence queue with `scripts/fetch-evidence-queue.sh /private/tmp/amw-admin-submissions.json`.
3. Review each pending private submission with `scripts/review-evidence-submission.sh`.
4. Inspect open GitHub issues whose title begins exactly with `[Evidence]`.
5. Research new public information about the Action Plan, Commission, Commissioner hiring or appointment, Ministry of Arts, Culture and Status of Women, Tanya Fir, Joe Ceci, West Anthem, National Music Centre, Alberta Music, Alberta Foundation for the Arts, Alberta Media Fund, municipal partners, Indigenous partners, funding records, and public industry reaction.
6. Update `data-updates.js` for small reviewed daily source and brief additions. Update `data.js`, `index.html`, bundled `sources/`, and docs only when source-backed changes are warranted or when a larger cleanup is intentional.
7. Add daily brief changes as new records at the top of `briefItems` in the update layer. Do not delete older brief records unless they are factually wrong and the PR explains why.
8. Run `node scripts/validate-site-data.mjs` and `git diff --check`.
9. Confirm the runtime `window.AMW_DATA.meta.lastUpdated` produced by `data.js` plus `data-updates.js` matches the static fallback date in `index.html`.
10. Publish a normal non-draft PR, inspect the diff, merge when safe, then verify GitHub Pages and the live site.

## Evidence Intake Rules

The public site does not publish evidence submissions directly. The public form posts to `submit-evidence.php`, and the backend stores submissions in an append-only private JSONL queue.

Review statuses:

- `pending`: submitted, not reviewed yet.
- `relevant`: source-backed enough to enter the public evidence workflow. The backend publishes a reviewed `[Evidence] ...` GitHub issue.
- `not_relevant`: backend tests, spam, out-of-scope material, duplicates with no new evidence, private/confidential material, or non-substantive items.
- `needs_context`: possibly relevant, but not public/source-backed enough to publish yet.

Never delete evidence records. Irrelevant and test submissions stay in the append-only queue with a review decision.

Private token:

- The private admin token must exist at `.deploy/amw-evidence-admin-token` in the primary project folder.
- The token must never be printed, summarized, committed, or exposed.
- `.deploy/` is ignored by Git.

## How Reviewed Evidence Becomes Site Content

A `relevant` evidence submission creates or references a public GitHub issue. That issue is a reviewed evidence queue, not automatic site text.

The nightly audit should then decide whether the reviewed issue warrants a public site update:

- Add a `sources` record when the source itself is public and stable enough to cite.
- Add a `briefItems` record when the source adds a new fact, accountability test, or public context.
- Prefer `data-updates.js` for daily additions so the nightly automation can publish small, reviewable PRs.
- Keep analysis conservative. Separate what the source directly verifies from what a submitter claims.
- Do not overstate audio, video, or inaccessible source content without a transcript or accessible metadata.

## CBC Submission Status

Submission id: `20260528-160542-dfbbdb44`

Submitted source:

`https://www.cbc.ca/listen/live-radio/1-17-edmonton-am/clip/16212190-albertas-music-action-plan-aims-supercharge-local-industry`

Submitted claim:

`Interview on CBC with Minister Tanya Fir promoting the Action Plan`

Review result on June 1, 2026:

- Decision: `relevant`
- Public issue: `https://github.com/DJNxDx/alberta-music-watch/issues/17`
- Queue status after review: zero pending submissions

What was verified:

- CBC Edmonton AM metadata confirms a May 1, 2026 segment titled `Alberta's new Music Action Plan aims to supercharge the local industry`.
- The segment is relevant as public rollout context for the Action Plan.

What was not verified:

- The submitted characterization that the segment was an interview with Minister Tanya Fir was not independently verified from the accessible metadata.
- Do not use this source to prove speaker-level claims, exact statements, grant terms, partner deliverables, or policy commitments unless the audio or a transcript confirms them.

Site handling:

- Added source id `cbc-edmonton-am-may1`.
- Added a June 1, 2026 daily brief item explaining the verified and unverified parts.

## Source And Asset Inventory

Bundled source assets in `sources/` include:

- `alberta-music-action-plan.pdf`
- `83893-music-commissioner-job-description.pdf`
- `83893-music-commissioner-job-description.html`
- `open-letter-alberta-music-action-plan-nich-davies.pdf`
- `open-letter-alberta-music-action-plan-nich-davies.html`

Screenshots in `screenshots/` show the current desktop and mobile design baseline.

Public source records live in `data.js` and reviewed daily additions can live in `data-updates.js`. When the source count changes, keep the static source count in `index.html` aligned with the validated runtime count.

## Editorial Standard

Alberta Music Watch is a reality-based public-interest audit. It asks whether the Alberta Music Action Plan and Alberta Music Commission produce measurable, independent, additive benefits for artists, music businesses, venues, rights holders, and communities.

Use careful language:

- Evidence first, conclusions second.
- Source direct facts to public records or bundled source documents.
- Label unknowns as unknown.
- Identify governance, funding, and implementation gaps without treating absence of evidence as proof of bad faith.
- Preserve old daily brief records so readers can see the audit history over time.
