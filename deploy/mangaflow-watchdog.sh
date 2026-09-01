#!/usr/bin/env bash
set -u

alerts=()

root_used=$(df -P / | awk 'NR==2 {gsub("%", "", $5); print $5}')
if [[ -z "$root_used" || "$root_used" -ge 80 ]]; then
  alerts+=("disco raiz em ${root_used:-desconhecido}%")
fi

for container in deploy-api-1 deploy-worker-1 mangaflow-web-1 freellmapi-freellmapi-1; do
  state=$(sudo -n docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || true)
  if [[ "$state" != "running" ]]; then
    alerts+=("container $container: ${state:-ausente}")
  fi
done

if ! curl --fail --silent --show-error --max-time 15 \
  https://manga.vexclaud.site/api/v1/ready >/dev/null; then
  alerts+=("MangaFlow ready indisponivel")
fi

latest_backup=$(sudo -n find /data/coolify/backups/system -mindepth 1 -maxdepth 1 \
  -type d -name '20??????-??????' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -n 1)
latest_epoch=${latest_backup%% *}
latest_epoch=${latest_epoch%.*}
if [[ -z "$latest_epoch" ]]; then
  alerts+=("nenhum backup local encontrado")
elif (( $(date +%s) - latest_epoch > 108000 )); then
  alerts+=("backup local com mais de 30 horas")
fi

offsite_status=/var/lib/vexclaud-backup/offsite-last-success
offsite_epoch=$(sudo -n stat -c %Y "$offsite_status" 2>/dev/null || true)
if [[ -z "$offsite_epoch" ]]; then
  alerts+=("nenhum backup externo confirmado")
elif (( $(date +%s) - offsite_epoch > 129600 )); then
  alerts+=("backup externo com mais de 36 horas")
fi

if [[ $(systemctl is-failed vexclaud-offsite-backup.service 2>/dev/null || true) == failed ]]; then
  alerts+=("servico de backup externo em falha")
fi

if ((${#alerts[@]})); then
  printf 'ALERTA VEXCLAUD ORACLE\n'
  printf -- '- %s\n' "${alerts[@]}"
fi
