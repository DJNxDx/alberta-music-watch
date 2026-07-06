#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$repo_root/scripts/lib/node-runtime.sh"

"$NODE_BIN" "$repo_root/scripts/validate-site-data.mjs"
