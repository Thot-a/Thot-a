#!/usr/bin/env bash
# Applies all migrations + dev seed to a throwaway database and runs SQL tests.
# Requires a local PostgreSQL (15+) reachable via psql. Uses PG* env vars if set.
set -euo pipefail
cd "$(dirname "$0")/.."

DB="dailyfit_test_$$"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

cleanup() { "${PSQL[@]}" -d postgres -c "drop database if exists ${DB};" >/dev/null 2>&1 || true; }
trap cleanup EXIT

"${PSQL[@]}" -d postgres -c "create database ${DB};" >/dev/null
"${PSQL[@]}" -d "$DB" -f supabase/tests/_auth_stub.sql >/dev/null
for f in supabase/migrations/*.sql; do
  echo "→ migration $(basename "$f")"
  "${PSQL[@]}" -d "$DB" -f "$f" >/dev/null
done
echo "→ seed.sql (dev sample data)"
"${PSQL[@]}" -d "$DB" -f supabase/seed.sql >/dev/null
for t in supabase/tests/[0-9]*.sql; do
  echo "→ test $(basename "$t")"
  out=$("${PSQL[@]}" -At -d "$DB" -f "$t" 2>&1) || { echo "$out" | grep -v '^$'; echo "✗ FAILED: $(basename "$t")"; exit 1; }
  echo "$out" | grep -v '^$' || true
done
