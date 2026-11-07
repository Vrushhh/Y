#!/usr/bin/env bash
# Runs migrations + integration tests against a throwaway local Postgres 16.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
TMP=$(mktemp -d); chmod 777 "$TMP"
run() { su postgres -c "$*" 2>/dev/null || bash -c "$*"; }
run "$PGBIN/initdb -D $TMP/data -A trust -U postgres" >/dev/null
run "$PGBIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54329' -l $TMP/log start" >/dev/null
sleep 2
PSQL="psql -h $TMP -p 54329 -U postgres -v ON_ERROR_STOP=1 -q -t"
$PSQL -c "create database t"
$PSQL -d t -f "$DIR/supabase_stub.sql"
for f in "$DIR"/../migrations/*.sql; do $PSQL -d t -f "$f"; done
$PSQL -d t -f "$DIR/game_flow_test.sql" | sed '/^\s*$/d' | tee "$TMP/out"
run "$PGBIN/pg_ctl -D $TMP/data stop" >/dev/null
if grep -q ' f$' "$TMP/out"; then echo "FAILED: a check returned false"; exit 1; fi
