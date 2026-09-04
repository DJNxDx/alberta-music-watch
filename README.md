# Alberta Music Watch

Version 1 of a source-backed public audit portal for Alberta's Music Action Plan and Alberta Music Commission.

## What is included

- Daily brief section
- Promise tracker for every Action Plan commitment
- Commission hiring and mandate watch
- Funding ledger and unanswered funding questions
- Relationship map for key institutions and public actors
- Industry reaction structure
- Source library with bundled PDFs
- Public evidence intake form with a Hostinger-friendly PHP backend and append-only review flow
- Lightweight local source pages for documents that are not stable public web pages
- Downloadable JSON data from the browser

## Run locally

Open `index.html` in a browser.

If a local server is preferred:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

## Deploy

This is a static GitHub Pages site deployed from:

- Repository: https://github.com/DJNxDx/alberta-music-watch
- Live domain: https://watch.albertamusic.live/

The custom domain is set by `CNAME`, and Hostinger DNS points `watch.albertamusic.live` to `djnxdx.github.io`.

## Evidence intake backend

The site is static on GitHub Pages, so the evidence form posts to a separate PHP backend configured in `data.js`:

```text
https://api.albertamusic.live/submit-evidence.php
```

Backend code lives in `backend/`. Deploy it to a Hostinger PHP/HTML subdomain, copy `backend/config.example.php` to `backend/config.local.php`, and add a fine-grained GitHub token with Issues read/write access. Public submissions are stored first; the nightly audit reviews them and only relevant submissions become `[Evidence]` GitHub issues. See `backend/README.md`.

## Nightly automation runbook

The durable operating memory for the daily audit lives in `docs/nightly-audit-runbook.md`. The Codex automation should run from `/Users/hhmusicnichdavies/Documents/Alberta Music Watch`, read the runbook at the start of each run, review private submissions, inspect reviewed `[Evidence]` issues, add source-backed brief records, validate the site, and publish through a normal PR.

Start with `bash scripts/sync-audit-main.sh` from a clean workspace. It removes only zero-byte `Icon\r` artifacts under Git's refs directory, fetches GitHub `main`, and verifies exact commit identity. If squash-merge history has diverged while file trees are identical, it preserves the old `main` on a backup branch before aligning it. Different file trees or uncommitted work stop the sync without a reset.

## Update workflow

Use `data.js` as the baseline dataset and `data-updates.js` for small reviewed daily additions. Add new daily brief findings as new mini-records at the top of `briefItems`; do not delete older brief records unless they are factually wrong and the PR explains why. For larger restructuring, fold the update layer back into `data.js` in a dedicated cleanup PR.

Recommended daily review list:

- Alberta Music Commission page
- Government job posting and archived posting state
- Ministry news releases
- Alberta Foundation for the Arts news and grant data
- Alberta Media Fund program pages
- Legislative Assembly transcripts and committee records
- West Anthem, Alberta Music, and National Music Centre updates
- Public statements from elected officials and sector organizations
- Pending private evidence submissions and reviewed GitHub Issues with titles beginning `[Evidence]`

Daily automation should work on a branch, verify every factual change against sources, classify pending private evidence submissions as `relevant`, `not_relevant`, or `needs_context`, publish only relevant submissions to GitHub Issues, commit updates, push the branch, self-review and fix its own PR branch, then open a normal pull request for review or auto-merge if repository settings allow it. Merging the PR deploys the update to GitHub Pages.

## Editorial standard

Facts should be sourced to public records, direct documents, or bundled source files. Analysis should remain clearly separated from evidence. Unknowns should remain labelled as unknown until documentation supports a stronger finding.
