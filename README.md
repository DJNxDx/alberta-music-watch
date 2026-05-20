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
- Live domain: http://watch.albertamusic.live/

The custom domain is set by `CNAME`, and Hostinger DNS points `watch.albertamusic.live` to `djnxdx.github.io`.

## Update workflow

Edit `data.js` to add daily updates, new sources, new funding records, promise status changes, and public reactions.

Recommended daily review list:

- Alberta Music Commission page
- Government job posting and archived posting state
- Ministry news releases
- Alberta Foundation for the Arts news and grant data
- Alberta Media Fund program pages
- Legislative Assembly transcripts and committee records
- West Anthem, Alberta Music, and National Music Centre updates
- Public statements from elected officials and sector organizations

## Editorial standard

Facts should be sourced to public records, direct documents, or bundled source files. Analysis should remain clearly separated from evidence. Unknowns should remain labelled as unknown until documentation supports a stronger finding.
