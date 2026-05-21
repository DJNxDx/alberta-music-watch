# Evidence Intake Backend

Small PHP backend for the Alberta Music Watch evidence form.

## Target deployment

Host this folder as a PHP site or subdomain, ideally:

```text
https://api.albertamusic.live/
```

The public form posts to:

```text
https://api.albertamusic.live/submit-evidence.php
```

## Hostinger setup

1. In Hostinger hPanel, create `api.albertamusic.live` as an independent PHP/HTML website or subdomain.
2. Upload the contents of this `backend/` folder to the subdomain web root.
3. Copy `config.example.php` to `config.local.php`.
4. In `config.local.php`, set:
   - `github_token`: a fine-grained GitHub token with Issues read/write access to `DJNxDx/alberta-music-watch`.
   - `admin_token`: a long random secret for reading the private queue.
   - `allowed_origins`: keep `https://watch.albertamusic.live`.
   - If using Hostinger environment variables instead of a literal token, set `AMW_GITHUB_TOKEN`; `submit-evidence.php` ignores a blank local `github_token` so the environment token can still be used.
5. Confirm the `private/` folder is not web-readable. The included `.htaccess` denies direct access on Apache-compatible hosting.

## API

### Public submit

```http
POST /submit-evidence.php
```

Accepts multipart form fields:

- `title`
- `links` or `documents[]`
- `claim`
- `relevance`
- `weight`
- `submitter`
- `publicRecord`
- `website` honeypot field, must be blank

The endpoint requires at least one public source link or uploaded source document. It stores each submission as JSONL and, when `github_token` is configured, creates a GitHub issue titled `[Evidence] ...`.

### Private queue

```http
GET /admin-submissions.php
Authorization: Bearer <admin_token>
```

Returns queued submissions for the nightly Codex audit.

## Notes

- Do not submit confidential or personal records.
- Uploaded documents are stored privately and listed by filename, size, and SHA-256 in the GitHub issue.
- If the backend is unavailable, the frontend falls back to opening a GitHub issue for link-only submissions.
