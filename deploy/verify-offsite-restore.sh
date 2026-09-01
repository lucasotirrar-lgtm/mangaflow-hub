#!/usr/bin/env bash
set -Eeuo pipefail

base=/data/coolify/backups/system
remote='trabalho:VEXCLAUD/backups/system'
config=/home/opc/.config/rclone/rclone.conf
stamp=${1:-}

if [[ -z "$stamp" ]]; then
  latest=$(find "$base" -mindepth 1 -maxdepth 1 -type d -name '20??????-??????' -printf '%T@ %f\n' \
    | sort -nr | head -n 1)
  stamp=${latest#* }
fi

[[ "$stamp" =~ ^20[0-9]{6}-[0-9]{6}$ ]]
test -s "$base/$stamp/SHA256SUMS"

restored=$(mktemp /tmp/mangaflow-restore-test.XXXXXX.db)
cleanup() {
  [[ "$restored" == /tmp/mangaflow-restore-test.*.db ]] && rm -f -- "$restored"
}
trap cleanup EXIT

rclone copyto "$remote/$stamp/mangaflow.db" "$restored" --config "$config" \
  --checkers 2 --transfers 1 --timeout 60s

expected=$(awk '$2 == "mangaflow.db" {print $1}' "$base/$stamp/SHA256SUMS")
actual=$(sha256sum "$restored" | awk '{print $1}')
test -n "$expected"
test "$actual" = "$expected"
test "$(sqlite3 "$restored" 'PRAGMA integrity_check;')" = ok

printf 'RESTORE_SHA256=ok\n'
printf 'RESTORE_SQLITE=ok\n'
sqlite3 "$restored" \
  'SELECT "works=" || count(*) FROM works; SELECT "chapters=" || count(*) FROM chapters;'
