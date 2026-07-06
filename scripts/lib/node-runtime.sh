#!/usr/bin/env bash

if [[ -n "${AMW_NODE:-}" && -x "${AMW_NODE}" ]]; then
  NODE_BIN="${AMW_NODE}"
elif command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
else
  codex_node="${HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
  if [[ -x "$codex_node" ]]; then
    NODE_BIN="$codex_node"
  else
    echo "Node.js was not found. Set AMW_NODE or add node to PATH." >&2
    return 127 2>/dev/null || exit 127
  fi
fi

export NODE_BIN
