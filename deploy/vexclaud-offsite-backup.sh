#!/usr/bin/env bash
set -Eeuo pipefail

base=/data/coolify/backups/system
remote='trabalho:VEXCLAUD/backups/system'
config=/home/opc/.config/rclone/rclone.conf
hermes=(/home/opc/.hermes/hermes-agent/venv/bin/python -m hermes_cli.main)

notify() {
  runuser -u opc -- env HOME=/home/opc "${hermes[@]}" send --to telegram --quiet "$1" || true
}

notify_failure() {
  status=$?
  trap - ERR
  notify "❌ Backup VEXCLAUD falhou. O snapshot local foi preservado; verifique vexclaud-offsite-backup.service."
  exit "$status"
}

trap notify_failure ERR

latest=$(find "$base" -mindepth 1 -maxdepth 1 -type d -name '20??????-??????' -printf '%T@ %p\n' \
  | sort -nr | head -n 1 | cut -d' ' -f2-)
test -n "$latest"
test -s "$latest/SHA256SUMS"

(
  cd "$latest"
  sha256sum -c SHA256SUMS >/dev/null
)

stamp=$(basename "$latest")
rclone copy "$latest" "$remote/$stamp" --config "$config" --checkers 4 --transfers 2 \
  --drive-chunk-size 32M --retries 5 --low-level-retries 10 --log-level NOTICE
rclone check "$latest" "$remote/$stamp" --config "$config" --one-way --checkers 4

install -d -m 700 /var/lib/vexclaud-backup
printf '%s %s\n' "$(date -u +%FT%TZ)" "$stamp" >/var/lib/vexclaud-backup/offsite-last-success

notify "✅ Backup VEXCLAUD concluído: $stamp (local + Google Drive, checksums validados)."
