# MangaFlow Hub — operação, backup e handoff

Manual de continuidade do MangaFlow Hub para operação humana ou por outra IA.
Segredos nunca devem entrar neste arquivo, em commits ou em mensagens.

## Identidade e publicação

- Repositório privado: lucasotirrar-lgtm/mangaflow-hub.
- Branch padrão e de produção: main.
- Site: https://manga.vexclaud.site.
- Stack: React/TanStack Start/Vite, Express, SQLite, Docker Compose e Traefik.
- O repositório é ligado ao Lovable. Não force push, rebase, amend ou squash
  de commits já publicados.

## Topologia da VPS

Acesso administrativo via alias SSH coolify-main. VPS 147.15.98.2, atrás do
Traefik/Dokploy.

| Função             | Caminho/contêiner                                     |
| ------------------ | ----------------------------------------------------- |
| Fonte API/worker   | /opt/mangaflow-hub/release-router                     |
| Fonte frontend     | /opt/mangaflow-hub/release-vercel-fix                 |
| Compose API/worker | release-router/deploy/docker-compose.yml              |
| Compose frontend   | release-vercel-fix/deploy/docker-compose.yml          |
| API / worker / web | deploy-api-1 / deploy-worker-1 / mangaflow-web-1      |
| Proxy e rede       | dokploy-traefik / dokploy-network                     |
| Volume persistente | deploy_mangaflow_data montado como /data              |
| Banco e imagens    | /data/mangaflow.db e /data/assets                     |
| Cursores           | /data/sync_offset.json e /data/sync_adult_offset.json |

O .env de produção fica em /opt/mangaflow-hub/.env e não é versionado. Ele
contém o token administrativo e chaves de autenticação. Nunca exibir seu
conteúdo; usar apenas --env-file nos comandos.

## Rotas e segurança

Públicas: /api/v1/ready, /api/v1/health, /api/v1/catalog?page=1&limit=48,
/api/v1/works/:slug, /api/v1/chapters/:chapterId/pages e /media/....

Administrativas (exigem x-admin-token):

- GET /api/v1/admin/dashboard — métricas do painel.
- POST /api/v1/admin/sync — lote público.
- POST /api/v1/admin/sync-adult — lote adulto oculto.
- POST /api/v1/admin/sync-chapters?limit=100 — capítulos.

O painel também exige usuário autenticado e papel administrativo em
user_roles. O token fica no servidor e não chega ao navegador.

## Banco, catálogo e importação

backend/database.cjs cria works, chapters, assets, sync_runs, sync_cursors,
work_sync_state, provider_health e o índice FTS5. SQLite usa WAL,
synchronous=NORMAL, busy_timeout=5000 e chaves estrangeiras.
O catálogo usa 48 itens por padrão e permite 24, 48 ou 60 na interface (a API
impõe teto duro de 60). `kind`, `status` e `age` são filtrados no SQLite antes
da paginação; `manga` agrega manga e manhua. Conteúdo adulto só aparece quando
o filtro adulto é solicitado.
O provedor público informa cerca de 11.949 obras e a janela atual chega a
aproximadamente 10 mil posições; ainda é pendência particionar por data/gênero
ou outra estratégia para garantir o restante. O provedor adulto informa 1.934.

`GET /api/v1/home` abastece as filas públicas de lançamentos e destaques. Ele
consulta uma janela limitada de capítulos recentes e índices SQLite, em vez de
agregar todo o histórico a cada acesso. `adult=true` só deve ser solicitado pela
interface quando a preferência local de conteúdo adulto estiver ligada.

## Agendamento

Worker: incremental público a cada 15 min, adulto a cada 60 min e uma fila
contínua de capítulos (até 100 obras vencidas por lote). Cada obra importa toda
a paginação PT-BR disponível. Quando não há obra vencida, a API informa a
próxima verificação e o worker aguarda de 30 segundos a 15 minutos; enquanto há
fila, mantém o intervalo de 1 segundo e o throughput máximo. A reconciliação
completa roda semanalmente. Não há execuções sobrepostas; 429/503 aplicam
backoff e circuito.

## Snapshot validado em 01/09/2026

É um retrato; o dashboard é a fonte atualizada em tempo real.

| Métrica                    |                  Valor |
| -------------------------- | ---------------------: |
| Obras no banco             |                 12.254 |
| Capítulos                  |                224.683 |
| Assets                     |                  4.148 |
| Banco SQLite               | aproximadamente 236 MB |
| Espaço livre               |  aproximadamente 47 GB |
| Integridade SQLite         |                     ok |
| Violações de chave externa |                      0 |

Homepage, health, ready, catálogo, obra e capítulos responderam 200; API,
worker e web estavam ativos e a API estava saudável.

## Backup e alertas

`coolify-local-backup.timer` executa diariamente às 02:15 UTC com atraso
aleatório de até dez minutos. O snapshot inclui Dokploy/PostgreSQL, Open WebUI,
MangaFlow, OtakuStream e configurações de roteamento; bancos e arquivos são
validados antes da publicação do diretório final.

Após o backup local, `vexclaud-offsite-backup.timer` aciona diariamente entre
03:00 e 03:10 UTC o `vexclaud-offsite-backup.service`, que envia o snapshot para
`trabalho:VEXCLAUD/backups/system/<timestamp>`, valida o conteúdo remoto e
notifica o Telegram. O remoto `trabalho:` deve apontar exclusivamente para a
conta Google Drive Trabalho; não usar a conta pessoal Lucas.

O Hermes Oracle Sentinel entrega alertas diretamente pelo Telegram, sem LLM:

- `mangaflow-watchdog`: a cada 15 minutos, silencioso quando saudável;
- disco raiz a partir de 80%, containers ausentes/parados, API indisponível ou
  backup local com mais de 30 horas geram alerta;
- backup externo ausente, com mais de 36 horas ou serviço em falha gera alerta;
- sucesso do backup externo gera uma confirmação curta após checksum remoto.

Na verificação de 2026-09-02, o backup local `20260901-022219` continha o banco
MangaFlow e o pacote de arquivos; o envio ao remoto
`trabalho:VEXCLAUD/backups/system/20260901-022219` verificou 11 arquivos sem
diferenças.

O remoto ainda usa temporariamente o identificador OAuth compartilhado do
`rclone`. Ele funciona hoje, mas será aposentado durante 2026. Criar um cliente
OAuth próprio e gratuito no projeto Google da conta Trabalho e executar
`rclone config reconnect trabalho:` antes dessa retirada; nunca reutilizar
credenciais das contas Lucas.

Auditar periodicamente:

    systemctl status coolify-local-backup.timer coolify-local-backup.service
    systemctl status vexclaud-offsite-backup.timer vexclaud-offsite-backup.service
    hermes cron list
    hermes cron incidents

Testar uma restauração sem tocar no banco em produção:

    sudo /usr/local/sbin/verify-vexclaud-offsite-restore

## Desenvolvimento local

    npm ci
    npm run dev
    npm run lint
    npm run typecheck
    npm run build

Antes de commit, executar esses checks e git diff --check. .env é ignorado;
.env.example lista apenas nomes de configuração, sem valores reais.

## Deploy e restauração segura

Antes de substituir arquivo, faça backup datado no mesmo caminho:

    stamp=$(date -u +%Y%m%dT%H%M%SZ)
    sudo cp /opt/mangaflow-hub/release-router/backend/server.cjs /opt/mangaflow-hub/release-router/backend/server.cjs.bak-$stamp

Copie via scp para /tmp, instale no caminho exato e remova o temporário.
Depois, no compose release-router/deploy:

    sudo docker compose --project-name deploy --env-file /opt/mangaflow-hub/.env build api worker
    sudo docker compose --project-name deploy --env-file /opt/mangaflow-hub/.env up -d --no-deps api worker

Para frontend use release-vercel-fix/deploy, build web e up -d --no-deps web.
Valide docker ps, health de deploy-api-1, /api/v1/ready, catálogo e 401 do
dashboard sem cabeçalho. 502/404 durante recriação pode ser transitório.
Backups têm sufixo .bak-AAAAMMDDTHHMMSSZ; restaure explicitamente, reconstrua
o serviço afetado e repita os checks. Não usar git reset --hard na VPS.

## GitHub e handoff

Revise e publique somente arquivos intencionais:

    git status -sb
    git diff --check
    git add README.md docs/OPERATIONS.md docs/PROJECT_HANDOFF.md \
      docs/BACKEND_ARCHITECTURE.md backend/server.cjs backend/worker.cjs \
      package.json package-lock.json deploy/mangaflow-watchdog.sh \
      deploy/coolify-local-backup.sh deploy/coolify-local-backup.service \
      deploy/coolify-local-backup.timer \
      deploy/vexclaud-offsite-backup.sh deploy/vexclaud-offsite-backup.service \
      deploy/vexclaud-offsite-backup.timer deploy/verify-offsite-restore.sh
    git commit -m "otimiza operacao e backup do MangaFlow"
    git push origin main
    gh api repos/lucasotirrar-lgtm/mangaflow-hub --jq "{private,default_branch,full_name}"

Nunca adicionar .env, tokens, chaves, dumps ou credenciais. Avaliar
.continue/, .playwright-cli/ e .agent.md separadamente antes de versionar.
Para outra IA: ler AGENTS.md, README e este manual; conferir branch/remoto;
validar site antes de mutar; fazer backup; alterar o menor serviço; testar;
registrar commit, rollback e pendências. Não reescrever histórico Lovable.

As reconciliações completas são separadas por classificação de conteúdo para
não atingir a janela de aproximadamente 10 mil posições do MangaDex.
