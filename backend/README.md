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
   - If using Hostinger environment variables instead of a literal token, set `AMW_GITHUB_TOKEN`; `review-submission.php` ignores a blank local `github_token` so the environment token can still be used.
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

The endpoint requires at least one public source link or uploaded source document. It stores each submission as JSONL with `reviewStatus: pending`. It does not publish a GitHub issue until a reviewer marks the submission relevant.

### Private queue

```http
GET /admin-submissions.php
Authorization: Bearer <admin_token>
```

Returns queued submissions for the nightly Codex audit.

The response includes `reviewStatus`, the latest review record for each submission, `pendingCount`, and `reviewCounts`. Submissions are never deleted; review decisions are stored as separate append-only JSONL records.

### Private review

```http
POST /review-submission.php
Authorization: Bearer <admin_token>
```

Accepts form or JSON fields:

- `submissionId`
- `decision`: `relevant`, `not_relevant`, or `needs_context`
- `reason`
- `reviewer`

When `decision` is `relevant`, the endpoint publishes a reviewed `[Evidence] ...` GitHub issue if one has not already been published for that submission. `not_relevant` records the decision without publishing; this is the correct handling for backend tests and submissions outside the Alberta Music Watch audit scope.

## Notes

- Do not submit confidential or personal records.
- Uploaded documents are stored privately and listed by filename, size, and SHA-256 in the GitHub issue.
- If the backend is unavailable, the frontend asks the submitter to try again rather than bypassing review.
