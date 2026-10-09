#!/bin/bash
set -euo pipefail
# gh uses the same broker credential as git for this workspace's GitHub origin; the token is never stored on disk.
if [ -z "${GH_TOKEN:-}" ] && [ -z "${GITHUB_TOKEN:-}" ]; then
    origin="$(git remote get-url origin 2>/dev/null || git -C /workspace/repo remote get-url origin 2>/dev/null || true)"
    if [[ "$origin" =~ ^https://github\.com/([^?#]+)$ ]]; then
        token="$(printf 'protocol=https\nhost=github.com\npath=%s\n\n' "${BASH_REMATCH[1]}" \
            | NODE_NO_WARNINGS=1 /usr/local/bin/devhub-git-credential get | sed -n 's/^password=//p')" || true
        if [ -n "$token" ]; then export GH_TOKEN="$token"; fi
    fi
fi
export GH_NO_UPDATE_NOTIFIER=1
exec /usr/bin/gh "$@"
