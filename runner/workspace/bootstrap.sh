#!/bin/bash
set -euo pipefail
umask 077
repo_url="$1.git"
branch="$2"
create_branch="$3"
commit_name="$4"
commit_email="$5"
initialize="$6"
git config --global credential.helper /usr/local/bin/devhub-git-credential
git config --global credential.useHttpPath true
git config --global http.followRedirects false
git config --global core.hooksPath /dev/null
git config --global user.name "$commit_name"
git config --global user.email "$commit_email"
if [ "$initialize" = "true" ]; then
    # No terminal is exposed until this succeeds; a failed initial clone may be retried.
    if [ -e /workspace/repo ]; then rm -rf -- /workspace/repo; fi
    git clone -- "$repo_url" /workspace/repo
    cd /workspace/repo
    if [ "$create_branch" = "true" ]; then
        git check-ref-format --branch "$branch" >/dev/null
        git switch -c "$branch"
    else
        git switch -- "$branch"
    fi
fi
test -d /workspace/repo/.git
