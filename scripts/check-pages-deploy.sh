#!/usr/bin/env bash
set -euo pipefail

expected_sha="${1:-}"
attempts="${2:-20}"
interval_seconds="${3:-15}"
output_file="/private/tmp/amw-actions-runs.json"
url="https://api.github.com/repos/DJNxDx/alberta-music-watch/actions/runs?per_page=10"

if [[ -z "$expected_sha" ]]; then
  echo "Usage: scripts/check-pages-deploy.sh <expected-merge-sha> [attempts] [interval-seconds]" >&2
  exit 2
fi

for ((attempt = 1; attempt <= attempts; attempt += 1)); do
  curl -fsS -L --max-time 20 "$url" -o "$output_file"

  set +e
  node - "$output_file" "$expected_sha" <<'NODE'
const fs = require("fs");
const path = process.argv[2];
const expectedSha = process.argv[3];
const payload = JSON.parse(fs.readFileSync(path, "utf8"));
const runs = payload.workflow_runs || [];
const run = runs.find((item) => item.head_sha === expectedSha);
if (!run) {
  console.log(`No Pages run found yet for ${expectedSha}.`);
  process.exit(3);
}
console.log(`Pages run for ${expectedSha}: ${run.status}${run.conclusion ? ` / ${run.conclusion}` : ""}`);
if (run.status === "completed" && run.conclusion === "success") process.exit(0);
if (run.status === "completed") process.exit(1);
process.exit(3);
NODE
  status=$?
  set -e

  if [[ "$status" == "0" ]]; then
    exit 0
  fi

  if [[ "$status" == "1" ]]; then
    exit 1
  fi

  if [[ "$attempt" -lt "$attempts" ]]; then
    sleep "$interval_seconds"
  fi
done

echo "Timed out waiting for GitHub Pages deployment for ${expected_sha}." >&2
exit 1
