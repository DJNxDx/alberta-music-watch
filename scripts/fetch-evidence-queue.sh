#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
token_file="$repo_root/.deploy/amw-evidence-admin-token"
output_file="${1:-/private/tmp/amw-admin-submissions.json}"
endpoint="https://api.albertamusic.live/admin-submissions.php"

if [[ ! -s "$token_file" ]]; then
  echo "Evidence queue token file is missing or empty: $token_file" >&2
  exit 1
fi

token="$(tr -d '\r\n' < "$token_file")"

curl -fsS --max-time 20 \
  -H "Authorization: Bearer ${token}" \
  "$endpoint" \
  -o "$output_file"

node - "$output_file" <<'NODE'
const fs = require("fs");
const path = process.argv[2];
const payload = JSON.parse(fs.readFileSync(path, "utf8"));
if (!payload.ok || !Array.isArray(payload.submissions)) {
  throw new Error("Evidence queue response was not in the expected format.");
}
console.log(`Evidence queue fetched: ${payload.submissions.length} submissions.`);
NODE
