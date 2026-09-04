#!/usr/bin/env bash
set -euo pipefail

dry_run=0
if [[ "${1:-}" == "--dry-run" ]]; then
  dry_run=1
elif [[ "${1:-}" != "" ]]; then
  echo "Usage: $0 [--dry-run]" >&2
  exit 2
fi

git_dir="$(git rev-parse --absolute-git-dir)"
refs_dir="${git_dir}/refs"

if [[ ! -d "$refs_dir" ]]; then
  echo "Git refs directory not found: $refs_dir" >&2
  exit 1
fi

non_zero_found=0
while IFS= read -r -d '' path; do
  printf 'Ref artifact is not zero bytes; leaving untouched: %q\n' "$path" >&2
  non_zero_found=1
done < <(find "$refs_dir" -name $'Icon\r' -type f ! -size 0 -print0)

removed=0
while IFS= read -r -d '' path; do
  if [[ "$dry_run" == "1" ]]; then
    printf 'Would remove zero-byte bad ref artifact: %q\n' "$path"
  else
    if [[ -L "$path" || ! -f "$path" || -s "$path" ]]; then
      printf 'Ref artifact changed during inspection; leaving untouched: %q\n' "$path" >&2
      non_zero_found=1
      continue
    fi
    rm -- "$path"
    printf 'Removed zero-byte bad ref artifact: %q\n' "$path"
  fi
  removed=$((removed + 1))
done < <(find "$refs_dir" -name $'Icon\r' -type f -size 0 -print0)

if [[ "$removed" == "0" ]]; then
  echo "No zero-byte Icon CR Git ref artifacts found."
fi

if [[ "$non_zero_found" == "1" ]]; then
  exit 1
fi
