#!/bin/bash
set -euo pipefail
umask 077
exec bash --noprofile --rcfile /usr/local/share/devhub-bashrc -i
