#!/usr/bin/env bash
set -euo pipefail

output_file="${1:-/private/tmp/amw-live-data.js}"
url="https://watch.albertamusic.live/data.js"

curl -fsS -L --max-time 20 "$url" -o "$output_file"

node - "$output_file" <<'NODE'
const fs = require("fs");
const vm = require("vm");
const path = process.argv[2];
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path, "utf8"), sandbox, { filename: "live-data.js" });
const data = sandbox.window.AMW_DATA;
if (!data || !Array.isArray(data.sources)) {
  throw new Error("Live data did not expose window.AMW_DATA.sources.");
}
console.log(`Live site data check passed: ${data.sources.length} sources.`);
NODE
