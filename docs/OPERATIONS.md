# MangaFlow Hub — operação, backup e handoff

Manual de continuidade do MangaFlow Hub para operação humana ou por outra IA.
Segredos nunca devem entrar neste arquivo, em commits ou em mensagens.

## Identidade e publicação

- Repositório privado: lucasotirrar-lgtm/mangaflow-hub.
- Branch padrão: main; branch desta entrega: agent/mangaflow-real-catalog.
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
- POST /api/v1/admin/sync-chapters?limit=5 — capítulos.

O painel também exige usuário autenticado e papel administrativo em
user_roles. O token fica no servidor e não chega ao navegador.

## Banco, catálogo e importação

backend/database.cjs cria works, chapters, assets, sync_runs, sync_cursors,
work_sync_state, provider_health e o índice FTS5. SQLite usa WAL,
synchronous=NORMAL, busy_timeout=5000 e chaves estrangeiras.
O catálogo é paginado em 48 itens e is_adult=1 só aparece no filtro adulto.
O provedor público informa cerca de 11.949 obras e a janela atual chega a
aproximadamente 10 mil posições; ainda é pendência particionar por data/gênero
ou outra estratégia para garantir o restante. O provedor adulto informa 1.934.

## Agendamento

Worker: incremental público a cada 15 min, adulto a cada 60 min e capítulos a
cada 5 min (dez obras vencidas por lote). A reconciliação completa roda
semanalmente. Não há execuções sobrepostas; 429/503 aplicam backoff e circuito.

## Snapshot validado em 14/08/2026

É um retrato; o dashboard é a fonte atualizada em tempo real.

| Métrica                    |                              Valor |
| -------------------------- | ---------------------------------: |
| Obras no banco             |                             11.939 |
| Visíveis no catálogo comum |                             10.005 |
| Adultas ocultas            |                              1.934 |
| Capítulos                  |                            133.202 |
| Banco + assets             | aproximadamente 2,35 GB (2,19 GiB) |
| Espaço livre               |           aproximadamente 87,54 GB |
| Provedor público/adulto    |                     11.949 / 1.934 |
| Falhas nas últimas 24 h    |                                  0 |

Homepage, /auth, health e catálogos responderam 200; dashboard sem token
respondeu 401; API, worker e web estavam saudáveis.

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
    git add README.md docs/ backend/ deploy/
    git commit -m "documenta operacao e backup do MangaFlow"
    git push -u origin agent/mangaflow-real-catalog
    gh api repos/lucasotirrar-lgtm/mangaflow-hub --jq "{private,default_branch,full_name}"

Nunca adicionar .env, tokens, chaves, dumps ou credenciais. Avaliar
.continue/, .playwright-cli/ e .agent.md separadamente antes de versionar.
Para outra IA: ler AGENTS.md, README e este manual; conferir branch/remoto;
validar site antes de mutar; fazer backup; alterar o menor serviço; testar;
registrar commit, rollback e pendências. Não reescrever histórico Lovable.

As reconciliações completas são separadas por classificação de conteúdo para
não atingir a janela de aproximadamente 10 mil posições do MangaDex.
