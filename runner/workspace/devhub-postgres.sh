#!/bin/bash
set -euo pipefail
# Throwaway PostgreSQL for tests, owned by the workspace user. It listens on localhost only and trusts local
# connections; the data lives in $HOME so it survives Stop/Resume, and `reset` discards it.
bin="/usr/lib/postgresql/${POSTGRES_MAJOR:?}/bin"
data="${DEVHUB_POSTGRES_DATA:-$HOME/.local/share/devhub-postgres}"
port="${DEVHUB_POSTGRES_PORT:-5432}"
usage() {
    echo "usage: devhub-postgres start [database...] | stop | status | reset | url [database]" >&2
    exit 2
}
running() { "$bin/pg_ctl" -D "$data" status >/dev/null 2>&1; }
case "${1:-}" in
start)
    shift
    if [ ! -f "$data/PG_VERSION" ]; then
        mkdir -p -- "$data"
        "$bin/initdb" -D "$data" -U postgres --auth=trust --encoding=UTF8 --locale=C.UTF-8 >/dev/null
    fi
    if ! running; then
        "$bin/pg_ctl" -D "$data" -l "$data/server.log" -w \
            -o "-c listen_addresses=localhost -p $port -k /tmp" start >/dev/null
    fi
    for database in "$@"; do
        if [ -z "$(echo "SELECT 1 FROM pg_database WHERE datname = :'name'" \
                | "$bin/psql" -h localhost -p "$port" -U postgres -At -v name="$database" postgres)" ]; then
            "$bin/createdb" -h localhost -p "$port" -U postgres -- "$database"
        fi
    done
    echo "PostgreSQL $POSTGRES_MAJOR on localhost:$port, user postgres (no password)"
    ;;
stop) if running; then "$bin/pg_ctl" -D "$data" -m fast -w stop >/dev/null; fi ;;
status) if running; then echo "running on localhost:$port"; else echo "stopped"; exit 3; fi ;;
reset)
    if running; then "$bin/pg_ctl" -D "$data" -m immediate -w stop >/dev/null; fi
    rm -rf -- "$data"
    ;;
url) echo "postgresql://postgres@localhost:$port/${2:-postgres}" ;;
*) usage ;;
esac
