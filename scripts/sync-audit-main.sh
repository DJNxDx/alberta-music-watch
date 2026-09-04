#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [[ "$(git rev-parse --show-toplevel)" != "$repo_root" ]]; then
  echo "Run this script from the Alberta Music Watch repository." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain=v1)" ]]; then
  echo "Working tree has uncommitted files; preserve them before syncing main." >&2
  exit 1
fi

for operation in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply; do
  if [[ -e "$(git rev-parse --git-path "$operation")" ]]; then
    echo "Git operation in progress ($operation); finish it before syncing main." >&2
    exit 1
  fi
done

# Finder artifacts can occur anywhere under refs, including its root and tags.
# Never remove non-empty files, real refs, or files outside this exact scope.
bash scripts/clean-git-icon-refs.sh

# A failed fetch must never lead to a repair against a stale tracking ref.
git fetch origin main
git checkout main
remote_sha="$(git rev-parse origin/main)"

if ! git merge --ff-only origin/main; then
  local_sha="$(git rev-parse HEAD)"
  if [[ "$(git rev-parse HEAD^{tree})" != "$(git rev-parse origin/main^{tree})" ]]; then
    echo "Cannot fast-forward: local main $local_sha differs from origin/main $remote_sha." >&2
    echo "File trees differ; main was not reset." >&2
    exit 1
  fi
  if [[ -n "$(git status --porcelain=v1)" ]]; then
    echo "Working tree changed during sync; main was not reset." >&2
    exit 1
  fi

  # Squash merges can leave identical files with different commit histories.
  # Retain the old history before moving only clean, content-identical main.
  backup="backup/main-before-sync-$(date -u +%Y%m%dT%H%M%SZ)-$$"
  git branch "$backup" "$local_sha"
  git reset --keep "$remote_sha"
  echo "Preserved previous main at $backup ($local_sha)."
fi

if [[ "$(git rev-parse HEAD)" != "$remote_sha" ]]; then
  echo "Sync did not produce the fetched GitHub main commit; stop the audit." >&2
  exit 1
fi
echo "Audit main synchronized: $remote_sha"
