#!/bin/bash
set -euo pipefail
if [ "${1:-}" = "--version" ]; then printf '2\n'; exit 0; fi
case "${1:-SHELL}" in SHELL|CLAUDE|CODEX) ;; *) exit 1;; esac
umask 077
export DEVHUB_INITIAL_MODE="${1:-SHELL}"
exec bash --noprofile --rcfile /usr/local/share/devhub-bashrc -i
