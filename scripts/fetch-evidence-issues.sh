#!/usr/bin/env bash
set -euo pipefail

output_file="${1:-/private/tmp/amw-open-issues.json}"
url="https://api.github.com/repos/DJNxDx/alberta-music-watch/issues?state=open&per_page=100"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$repo_root/scripts/lib/node-runtime.sh"

curl -fsS -L --max-time 20 "$url" -o "$output_file"

"$NODE_BIN" - "$output_file" <<'NODE'
const fs = require("fs");
const path = process.argv[2];
const issues = JSON.parse(fs.readFileSync(path, "utf8"));
if (!Array.isArray(issues)) {
  throw new Error("GitHub issues response was not an array.");
}
const evidenceIssues = issues.filter((issue) => issue.title?.startsWith("[Evidence]"));
console.log(`GitHub evidence issues fetched: ${evidenceIssues.length} open evidence issues.`);
NODE
