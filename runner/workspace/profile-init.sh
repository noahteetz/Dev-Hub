#!/bin/bash
set -euo pipefail
umask 077
provider="$1"
profile_id="$2"
case "$provider" in claude|codex) ;; *) exit 1;; esac
[[ "$profile_id" =~ ^[0-9a-f-]{36}$ ]] || exit 1
test ! -L /profiles
test ! -L "/profiles/$provider"
mkdir -p -- "/profiles/$provider"
test ! -L "/profiles/$provider/$profile_id"
mkdir -p -- "/profiles/$provider/$profile_id"
chmod 0700 "/profiles/$provider" "/profiles/$provider/$profile_id"
