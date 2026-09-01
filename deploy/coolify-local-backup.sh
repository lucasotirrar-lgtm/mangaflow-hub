#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

base=/data/coolify/backups/system
stamp=$(date -u +%Y%m%d-%H%M%S)
partial="$base/.partial-$stamp"
destination="$base/$stamp"
retention_days=3

cleanup() {
  status=$?
  if ((status != 0)); then
    if [[ "$partial" == "$base/.partial-$stamp" && -d "$partial" ]]; then
      rm -rf -- "$partial"
    fi
  fi
  exit "$status"
}
trap cleanup EXIT

exec 9>/run/vexclaud-local-backup.lock
flock -n 9 || { echo "backup already running" >&2; exit 1; }

install -d -m 700 "$base" "$partial"
docker info >/dev/null

required_volumes=(dokploy-postgres ai-stack_open-webui-data deploy_mangaflow_data otakustream_sqlite_data)
source_bytes=0
for volume in "${required_volumes[@]}"; do
  mountpoint=$(docker volume inspect -f '{{.Mountpoint}}' "$volume")
  source_bytes=$((source_bytes + $(du -sb "$mountpoint" | awk '{print $1}')))
done
available_bytes=$(df -PB1 "$base" | awk 'NR == 2 {print $4}')
reserve_bytes=$((2 * 1024 * 1024 * 1024))
if ((available_bytes < source_bytes + reserve_bytes)); then
  echo "insufficient disk space for a safe backup" >&2
  exit 1
fi

pg_container=$(docker ps --filter name=dokploy-postgres --format '{{.Names}}' | head -n 1)
test -n "$pg_container"
docker exec "$pg_container" sh -lc 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  >"$partial/dokploy-postgres.dump"
test -s "$partial/dokploy-postgres.dump"
docker exec -i "$pg_container" sh -lc 'exec pg_restore -l' \
  <"$partial/dokploy-postgres.dump" >/dev/null

sqlite_snapshot() {
  local volume=$1 relative=$2 output=$3 mountpoint source
  mountpoint=$(docker volume inspect -f '{{.Mountpoint}}' "$volume")
  source="$mountpoint/$relative"
  test -s "$source"
  sqlite3 "$source" ".timeout 30000" ".backup '$partial/$output'"
  test -s "$partial/$output"
  test "$(sqlite3 "$partial/$output" 'PRAGMA quick_check;')" = ok
}

sqlite_snapshot ai-stack_open-webui-data webui.db open-webui-webui.db
sqlite_snapshot ai-stack_open-webui-data vector_db/chroma.sqlite3 open-webui-chroma.sqlite3
sqlite_snapshot deploy_mangaflow_data mangaflow.db mangaflow.db
sqlite_snapshot otakustream_sqlite_data anime_manga.db otakustream.db

archive_volume_without_databases() {
  local volume=$1 output=$2 mountpoint file_list
  mountpoint=$(docker volume inspect -f '{{.Mountpoint}}' "$volume")
  file_list=$(mktemp)
  (
    cd "$mountpoint"
    find . -xdev -type f \
      ! -name '*.db' ! -name '*.db-wal' ! -name '*.db-shm' \
      ! -name '*.sqlite3' ! -name '*.sqlite3-wal' ! -name '*.sqlite3-shm' \
      ! -name 'sync_offset.json' ! -name 'sync_adult_offset.json' -print0
  ) >"$file_list"
  tar --null --no-recursion -C "$mountpoint" -czf "$partial/$output" -T "$file_list"
  rm -f -- "$file_list"
  tar -tzf "$partial/$output" >/dev/null
}

archive_volume_without_databases ai-stack_open-webui-data open-webui-files.tar.gz
archive_volume_without_databases deploy_mangaflow_data mangaflow-files.tar.gz
archive_volume_without_databases otakustream_sqlite_data otakustream-files.tar.gz

tar --one-file-system --exclude='acme.json' -C / -czf "$partial/dokploy-routing-config.tar.gz" \
  etc/dokploy/traefik etc/systemd/system/coolify-local-backup.service \
  etc/systemd/system/coolify-local-backup.timer
tar -tzf "$partial/dokploy-routing-config.tar.gz" >/dev/null

(
  cd "$partial"
  sha256sum -- * >SHA256SUMS
  sha256sum -c SHA256SUMS >/dev/null
)

printf 'created_utc=%s\nhost=%s\nsource_bytes=%s\navailable_bytes_before=%s\n' \
  "$(date -u +%FT%TZ)" "$(hostname)" "$source_bytes" "$available_bytes" \
  >"$partial/backup.meta"
chmod 600 "$partial"/*
mv -- "$partial" "$destination"

find "$base" -mindepth 1 -maxdepth 1 -type d -name '20??????-??????' \
  -mtime +"$retention_days" -exec rm -rf -- {} +
find "$base" -mindepth 1 -maxdepth 1 -type d -name '.partial-*' \
  -mtime +1 -exec rm -rf -- {} +

echo "backup complete: $destination"
du -sh "$destination"
