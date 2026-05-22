#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
token_file="$repo_root/.deploy/amw-evidence-admin-token"
endpoint="${AMW_REVIEW_ENDPOINT:-https://api.albertamusic.live/review-submission.php}"
submission_id="${1:-}"
decision="${2:-}"
reason="${3:-}"
reviewer="${4:-nightly-audit}"
output_file="${5:-/private/tmp/amw-review-submission.json}"

if [[ -z "$submission_id" || -z "$decision" || -z "$reason" ]]; then
  echo "Usage: $0 <submission-id> <relevant|not_relevant|needs_context> <reason> [reviewer] [output-file]" >&2
  exit 2
fi

if [[ ! -s "$token_file" ]]; then
  echo "Evidence queue token file is missing or empty: $token_file" >&2
  exit 1
fi

token="$(tr -d '\r\n' < "$token_file")"

curl -fsS --max-time 20 \
  -H "Authorization: Bearer ${token}" \
  --form-string "submissionId=${submission_id}" \
  --form-string "decision=${decision}" \
  --form-string "reason=${reason}" \
  --form-string "reviewer=${reviewer}" \
  "$endpoint" \
  -o "$output_file"

node - "$output_file" <<'NODE'
const fs = require("fs");
const path = process.argv[2];
const payload = JSON.parse(fs.readFileSync(path, "utf8"));
if (!payload.ok || !payload.submissionId || !payload.decision) {
  throw new Error("Review response was not in the expected format.");
}
const issue = payload.issueUrl ? ` issue: ${payload.issueUrl}` : "";
console.log(`Evidence review recorded: ${payload.submissionId} -> ${payload.decision}; publish status: ${payload.publishStatus}.${issue}`);
NODE
