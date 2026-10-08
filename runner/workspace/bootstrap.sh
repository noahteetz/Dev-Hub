#!/bin/bash
set -euo pipefail
umask 077
repo_url="$1.git"
branch="$2"
create_branch="$3"
commit_name="$4"
commit_email="$5"
initialize="$6"
directory="${7:-repo}"
[[ "$directory" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$ ]] || exit 1
checkout="/workspace/$directory"
git config --global credential.helper /usr/local/bin/devhub-git-credential
git config --global credential.useHttpPath true
git config --global http.followRedirects false
git config --global core.hooksPath /dev/null
git config --global user.name "$commit_name"
git config --global user.email "$commit_email"
if [ "$initialize" = "true" ]; then
    # No terminal is exposed until this succeeds; a failed initial clone may be retried.
    if [ -e "$checkout" ] || [ -L "$checkout" ]; then rm -rf -- "$checkout"; fi
    git clone -- "$repo_url" "$checkout"
    cd "$checkout"
    if [ "$create_branch" = "true" ]; then
        git check-ref-format --branch "$branch" >/dev/null
        git switch -c "$branch"
    elif [ -n "$branch" ]; then
        git switch -- "$branch"
    fi
fi
test ! -L "$checkout"
test -d "$checkout/.git"
