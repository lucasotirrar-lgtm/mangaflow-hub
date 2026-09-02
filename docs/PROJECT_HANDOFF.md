# Handoff completo — MangaFlow Hub / Oracle principal

Atualizado em 01/09/2026 UTC, com auditoria complementar em 02/09/2026 UTC.
Este documento descreve o estado observado e validado, não um desenho futuro.
Leia também `AGENTS.md`, `README.md`, `docs/OPERATIONS.md`,
`docs/BACKEND_ARCHITECTURE.md` e `docs/FINAL_AUDIT_2026-09-02.md` antes de
alterar produção.

## 1. Resumo executivo

O MangaFlow Hub é um catálogo e leitor de mangás PT-BR. O frontend usa React,
TanStack Start e Vite; a API é Express; catálogo, capítulos e assets persistem
em SQLite na Oracle; o MangaDex é a fonte ativa. Supabase continua responsável
por autenticação e CMS, mas não é o banco ativo do catálogo da Oracle.

Produção está saudável em `https://manga.vexclaud.site`:

| Item | Estado validado |
| --- | --- |
| API/ready | HTTP 200 |
| Obras | 12.254 |
| Obras públicas / +18 | 10.300 / 1.954 |
| Capítulos PT-BR | 224.683 |
| Obras com capítulos | 9.555 |
| Assets disponíveis | 4.148 |
| SQLite | `integrity_check=ok`, sem violações de FK |
| API / worker / web | ativos; API saudável |
| FreeLLMAPI | contêiner ativo e saudável |
| Backup local | diário, validado |
| Backup Google Drive | diário, validado, conta `Trabalho` |
| Restauração real | SHA-256 e SQLite validados |
| Telegram | Oracle Sentinel recebendo alertas sem LLM |
| GitHub | `main` e `agent/mangaflow-real-catalog` sincronizadas |
| OCI | gasto atual e previsto US$ 0 no orçamento verificado |

O código de aplicação implantado nesta manutenção corresponde ao commit
`e8462be`; scripts operacionais e backup correspondem a `7dd4a47`. Commits de
documentação posteriores não exigem rebuild. Confirme sempre com
`git rev-parse HEAD` e `git ls-remote` em vez de assumir que este retrato ainda
é o mais recente.

## 2. Repositório, branches e regras de Git

- Repositório privado: `lucasotirrar-lgtm/mangaflow-hub`.
- Remoto: `origin` no GitHub.
- Branch padrão/publicável: `main`.
- Branch de trabalho mantida em paralelo: `agent/mangaflow-real-catalog`.
- Em 01/09/2026, ambas apontavam para `7dd4a47200a2e0b75230425ea44170c08b01f3f5`.
- O projeto é ligado ao Lovable. Nunca usar `push --force`, rebase, amend ou
  squash em histórico já publicado.
- Toda publicação deve ser fast-forward e deixar `main` implantável.
- Nunca versionar `.env`, tokens, cookies, sessões, dumps, chaves SSH ou a
  configuração real do `rclone`.

Arquivos locais não rastreados encontrados e deliberadamente preservados:

- `.agent.md`
- `.continue/`
- `.playwright-cli/`
- `deploy/docker-compose.amd.yml`
- `deploy/nginx.amd.conf`

Eles não fazem parte do estado canônico. Não adicionar, apagar ou substituir
sem revisão explícita do proprietário.

## 3. O que existe em cada área do repositório

| Caminho | Responsabilidade |
| --- | --- |
| `backend/database.cjs` | inicialização e migração incremental do SQLite |
| `backend/mangadex-client.cjs` | fila serial, rate limit, backoff e circuito MangaDex |
| `backend/server.cjs` | API pública, mídia, ingestão e dashboard administrativo |
| `backend/worker.cjs` | laços de sincronização pública, adulta, capítulos e full |
| `src/routes/` | rotas TanStack do site e painel |
| `src/services/catalog-service.ts` | cliente do catálogo da API Express |
| `src/integrations/supabase/` | auth, sessão e clientes Supabase |
| `src/lib/admin.functions.ts` | proteção e agregação do painel administrativo |
| `supabase/migrations/` | CMS/auth e um domínio provider-agnostic ainda não canônico |
| `deploy/docker-compose.yml` | stack unificada de referência: web, API e worker |
| `deploy/coolify-local-backup.*` | backup local verificável e timer diário |
| `deploy/vexclaud-offsite-backup.*` | cópia Google Drive e timer diário |
| `deploy/verify-offsite-restore.sh` | restauração isolada e validação do banco |
| `deploy/mangaflow-watchdog.sh` | monitor sem IA entregue ao Telegram |
| `Dockerfile` | imagens multi-stage web/API/worker, compatíveis com ARM |

`src/data/manga.ts` contém dados visuais/fallback; não é o catálogo vivo. As
migrações Supabase da fase provider-agnostic representam uma direção futura e
não substituem o SQLite ativo sem uma migração planejada e testada.

## 4. Topologia real da Oracle

O acesso administrativo usa o alias SSH `coolify-main`. Não grave endereço,
senha ou chave no Git. A VPS principal é `coolify-arm-free`.

| Função | Caminho ou recurso em produção |
| --- | --- |
| API/worker source | `/opt/mangaflow-hub/release-router` |
| Frontend source | `/opt/mangaflow-hub/release-vercel-fix` |
| Variáveis reais | `/opt/mangaflow-hub/.env` |
| Compose API/worker | `release-router/deploy/docker-compose.yml` |
| Compose frontend | `release-vercel-fix/deploy/docker-compose.yml` |
| API | `deploy-api-1`, porta interna 3100 |
| Worker | `deploy-worker-1` |
| Frontend SSR | `mangaflow-web-1`, porta interna 3000 |
| Proxy/TLS | `dokploy-traefik`, rede `dokploy-network` |
| Volume persistente | `deploy_mangaflow_data` |
| Banco | `/data/mangaflow.db` dentro do volume |
| Assets | `/data/assets` dentro do volume |
| Cursores legados | `/data/sync_offset.json`, `/data/sync_adult_offset.json` |

A árvore de produção está dividida entre dois releases, apesar de o repositório
ser unificado. Não presuma que copiar o repositório inteiro sobre um dos
releases é seguro. API/worker e frontend devem ser reconciliados separadamente.

## 5. Oracle Always Free — limite absoluto

Esta é a prioridade operacional máxima. Estado OCI validado:

| Recurso | Alocação observada |
| --- | --- |
| ARM principal | `VM.Standard.A1.Flex`, 2 OCPU, 12 GB RAM |
| AMD auxiliar | `VM.Standard.E2.1.Micro`, 1 OCPU, 1 GB RAM |
| Boot volumes | 153 GB + 47 GB = 200 GB |
| Block volumes adicionais | nenhum |
| Load Balancer flexível | mínimo 10 Mbps, máximo 10 Mbps |
| Budget | `Always-Free-Guardrail`, limite US$ 5 |
| Gasto/forecast observado | US$ 0 / US$ 0 |

Regras obrigatórias:

1. Não criar, aumentar ou duplicar instância, volume, balanceador, IP pago,
   banco gerenciado ou serviço OCI sem conferir Limits/Quotas/Usage e custo.
2. Os 200 GB de block storage já estão totalmente alocados; tratar como teto.
3. Não aumentar o Load Balancer acima de 10 Mbps.
4. O backup diário de aproximadamente 4,9 GB equivale a cerca de 152 GB/mês,
   muito abaixo dos 10 TB/mês de saída incluídos no Always Free.
5. Builds e backups rodam na máquina existente; nenhum recurso temporário OCI
   deve ser criado para acelerar tarefas.
6. Conferir budget e forecast antes e depois de qualquer alteração de infra.

## 6. Containers e dependências compartilhadas

Além do MangaFlow, a Oracle contém serviços que o backup e o monitor conhecem:

- `freellmapi-freellmapi-1`: FreeLLMAPI, saudável; usado pelo agente quando IA
  é realmente necessária, mas não pelo watchdog.
- Dokploy e `dokploy-postgres`: plataforma e banco do painel.
- Open WebUI no volume `ai-stack_open-webui-data`.
- OtakuStream no volume `otakustream_sqlite_data`.
- Traefik/Dokploy publica os domínios e certificados.

Não remover volumes “não usados” apenas porque não pertencem ao MangaFlow. Eles
fazem parte do backup VEXCLAUD e de outros projetos da VPS.

## 7. Modelo de dados SQLite ativo

Pragmas aplicados: WAL, `synchronous=NORMAL`, `busy_timeout=5000` e foreign
keys habilitadas.

| Tabela | Uso |
| --- | --- |
| `works` | obra canônica local, classificação, idiomas, metadata e slug |
| `chapters` | releases PT-BR; duplicatas por volume/número podem coexistir |
| `assets` | capas e páginas baixadas, hash, tamanho e estado |
| `sync_runs` | auditoria de execuções com métricas; retenção de 30 dias |
| `sync_cursors` | offset/high-water por provider, lane e modo |
| `work_sync_state` | próxima checagem e falhas por obra |
| `provider_health` | backoff e circuit breaker do MangaDex |
| `works_fts` | FTS5 de título e título alternativo |

Índices cobrem título, atualização do provider, capítulos por obra, agenda e
execuções. Triggers mantêm o FTS sincronizado. O banco é criado/migrado pelo
próprio `initialize()`; não há ferramenta externa de migrations para SQLite.

Snapshot vivo detalhado em 01/09/2026 01:51 UTC:

- 12.254 obras: 10.300 comuns e 1.954 classificadas +18;
- 8.696 completas, 3.249 em andamento e 309 em hiato;
- 224.683 capítulos, todos marcados `pt-BR`;
- 9.555 obras com capítulos;
- 2.699 obras sem capítulo PT-BR na última checagem;
- 2.879 capas e 1.269 páginas disponíveis;
- aproximadamente 4,03 GB em assets registrados;
- nenhuma obra vencida para checagem naquele instante;
- próxima checagem de capítulos: 01/09/2026 02:23 UTC;
- MangaDex com zero falhas consecutivas e circuito fechado.

## 8. API Express

Rotas públicas:

| Método/rota | Observação |
| --- | --- |
| `GET /api/v1/health` | contagens de obras, capítulos e assets |
| `GET /api/v1/ready` | consulta simples ao SQLite |
| `GET /api/v1/catalog` | `page`, `limit` máximo 48, `adult=true/false` |
| `GET /api/v1/search` | `q` mínimo 2, FTS5, até 24 resultados |
| `GET /api/v1/works/:slug` | detalhe da obra |
| `GET /api/v1/works/:slug/chapters` | página, limite máximo 100 |
| `GET /api/v1/chapters/:id` | metadados do capítulo |
| `GET /api/v1/chapters/:id/pages` | URLs internas das páginas |
| `GET /api/v1/media/cover/:workId` | cache permanente por SHA |
| `GET /api/v1/media/chapter/:id/:index` | baixa e serve a página sob demanda |

Rotas administrativas exigem `x-admin-token` igual a
`MANGAFLOW_ADMIN_TOKEN`:

- `GET /api/v1/admin/dashboard`
- `POST /api/v1/admin/sync`
- `POST /api/v1/admin/sync?mode=full`
- `POST /api/v1/admin/sync-adult`
- `POST /api/v1/admin/sync-adult?mode=full`
- `POST /api/v1/admin/sync-chapters?limit=100`

Sem token, o dashboard deve retornar 401. Nunca colocar o token no navegador,
logs, Git ou exemplos de comando salvos.

## 9. Sincronização MangaDex

O cliente serializa requisições com intervalo mínimo padrão de 300 ms. Em
429/503/5xx, aplica backoff de 1, 5, 15 e 60 minutos; após cinco falhas abre o
circuito por 15 minutos. O cabeçalho `Retry-After` é respeitado.

Loops do worker:

| Loop | Intervalo nominal | Comportamento |
| --- | --- | --- |
| catálogo comum incremental | 15 min | até encontrar high-water |
| catálogo +18 incremental | 60 min | lane separada |
| capítulos | 1 s com fila | até 100 obras por lote |
| full comum | 7 dias | lanes `safe` e `suggestive` |
| full +18 | 7 dias | lanes `erotica` e `pornographic` |

Quando não há capítulo vencido, a API não cria `sync_runs`; retorna
`nextCheckAt` e `retryAfterMs`, e o worker espera entre 30 s e 15 min. Isso
eliminou gravações vazias contínuas. Quando há trabalho, cada obra importa toda
a paginação PT-BR disponível. Obras completas ou sem PT-BR voltam em sete dias;
obras ativas, em seis horas. Falhas por obra aguardam 15 min, 1 h, 6 h ou 1 dia.

Estado dos cursores no snapshot:

- incremental público: provider total 11.990;
- incremental +18: provider total 1.952;
- full `adult-erotica`: concluído, total 1.012;
- full `adult-pornographic`: concluído, total 939;
- full `public-safe`: offset 3.000 de 9.415, ainda não concluído;
- `public-suggestive` ainda não aparecia no cursor.

Portanto o catálogo é grande e funcional, mas a reconciliação full pública não
está comprovadamente completa. Não declarar 100% de cobertura até os dois
lanes públicos terem `last_full_at` e offset zero.

## 10. Frontend, autenticação e CMS

Rotas principais: `/`, `/mangas`, `/descobrir`, `/buscar`, `/generos`,
`/obra/:slug`, `/ler/:slug/:chapter`, `/auth`, `/onboarding`, páginas de conta e
`/admin` autenticado.

TanStack Start entrega SSR. `catalog-service.ts` chama a API Express. Supabase
fornece sessão, perfis, papéis e CMS. O painel exige sessão e papel `admin`; a
função server-side lê o token administrativo somente no servidor.

A migração `20260806010000_backend_domain_phase1.sql` cria um domínio amplo em
PostgreSQL/Supabase (works, chapters, providers, jobs, biblioteca e RLS). Esse
domínio não é o catálogo canônico de produção. Não execute uma “migração para
Supabase” assumindo que já há paridade com o SQLite.

### Limitação de segurança +18

O frontend mostra `age-gate`, mas a API Express permite `adult=true` em catálogo
e busca e permite detalhe por `slug` sem validar sessão. As RLS do Supabase não
protegem o SQLite. Se o requisito for restrição real por idade, implementar e
testar autenticação server-side na API antes de afirmar que conteúdo +18 está
protegido. Até lá, o filtro é de produto/interface, não um controle de segurança.

## 11. Variáveis e segredos

Variáveis públicas de build:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_CATALOG_API_URL` quando a API não é same-origin

Variáveis somente servidor:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MANGAFLOW_ADMIN_TOKEN`
- `MANGAFLOW_DATA_DIR`
- `MANGAFLOW_ASSET_LIMIT_BYTES`
- `MANGAFLOW_MAX_ASSET_BYTES`
- `MANGAFLOW_MINIMUM_FREE_BYTES`
- `MANGAFLOW_WARNING_FREE_BYTES`
- `MANGAFLOW_MANGADEX_MIN_INTERVAL_MS`
- intervalos/endpoints internos `MANGAFLOW_*_SYNC_*`

Localização e regra:

- produção: `/opt/mangaflow-hub/.env`, fora do Git;
- Drive: `/home/opc/.config/rclone/rclone.conf`, permissão 600;
- Hermes: configuração sob `/home/opc/.hermes`, fora do Git;
- Git contém somente nomes e placeholders em `.env.example` e
  `deploy/.env.example`.

## 12. Desenvolvimento local

Pré-requisito: Node.js 24 e npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Validação obrigatória antes de commit:

```sh
npm run check
npm audit --omit=dev --audit-level=high
git diff --check
git status --short --branch
```

Última validação: lint, TypeScript, build e audit passaram; zero
vulnerabilidades de produção conhecidas. Avisos não bloqueantes:

- bundle principal de aproximadamente 567,84 kB, acima do aviso de 500 kB;
- `vite-tsconfig-paths` sinalizado como redundante pelo Vite 8, mas o plugin é
  fornecido pelo preset Lovable; não remover cegamente.

## 13. Build e deploy seguro

O Dockerfile tem três targets: `web`, `api` e `worker`. API/worker compilam
`sqlite3` 6 a partir do source em ARM e removem toolchain depois. O smoke test
ARM com SQLite em memória passou.

Fluxo API/worker:

```sh
ssh coolify-main
cd /opt/mangaflow-hub/release-router/deploy
sudo docker compose --project-name deploy \
  --env-file /opt/mangaflow-hub/.env build api worker
sudo docker compose --project-name deploy \
  --env-file /opt/mangaflow-hub/.env up -d --no-deps api worker
```

Fluxo frontend:

```sh
cd /opt/mangaflow-hub/release-vercel-fix/deploy
sudo docker compose --project-name mangaflow \
  --env-file /opt/mangaflow-hub/.env build web
sudo docker compose --project-name mangaflow \
  --env-file /opt/mangaflow-hub/.env up -d --no-deps web
```

Antes de substituir qualquer arquivo, copie a versão atual para o diretório de
backup datado. Backup de código desta manutenção:
`/opt/mangaflow-hub/backups/code-20260831-222843`.

Depois do deploy validar:

1. `docker ps` e health da API;
2. `/api/v1/ready` e `/api/v1/health`;
3. catálogo, detalhe, lista de capítulos e uma página de leitura;
4. dashboard sem token retorna 401;
5. logs da API/worker sem loop de erro;
6. contagem do banco não regrediu;
7. imagem/contêiner realmente recriados, não apenas source copiado.

O antigo endpoint Vercel retornava 404 no último teste; produção canônica é a
Oracle. Não usar sucesso de build Vercel como prova do site vivo.

## 14. Backup local

Timer: `coolify-local-backup.timer`, diariamente às 02:15 UTC com atraso
aleatório de até 10 minutos e `Persistent=true`.

O script versionado em `deploy/coolify-local-backup.sh`:

- usa lock para impedir sobreposição;
- confere Docker e espaço para fontes + reserva de 2 GB;
- gera `pg_dump -Fc` do Dokploy e valida com `pg_restore -l`;
- usa `.backup` e `PRAGMA quick_check` para SQLite;
- inclui Open WebUI DB/Chroma/arquivos;
- inclui MangaFlow DB/assets;
- inclui OtakuStream DB/arquivos;
- inclui configuração de roteamento, excluindo `acme.json`;
- cria e revalida `SHA256SUMS`;
- publica atomicamente após concluir;
- retém snapshots locais por três dias;
- remove parciais antigos.

Destino local: `/data/coolify/backups/system/<AAAAMMDD-HHMMSS>`.

Instalação/reconciliação dos arquivos versionados:

```sh
sudo install -o root -g root -m 0750 deploy/coolify-local-backup.sh \
  /usr/local/sbin/coolify-local-backup
sudo install -o root -g root -m 0644 deploy/coolify-local-backup.service \
  deploy/coolify-local-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now coolify-local-backup.timer
```

## 15. Backup externo Google Drive

Remoto permitido: somente `trabalho:`. Destino:
`trabalho:VEXCLAUD/backups/system/<timestamp>`. Não usar o remoto legado
`gdrive:` e nunca autorizar uma conta pessoal Lucas.

Timer: `vexclaud-offsite-backup.timer`, diariamente entre 03:00 e 03:10 UTC.
O upload só começa depois de validar os hashes locais, usa duas transferências,
executa `rclone check --one-way`, registra sucesso e notifica o Telegram. Falha
também gera mensagem direta sem modelo de IA.

O serviço usa `ProtectHome=read-only`, com a exceção mínima
`ReadWritePaths=/home/opc/.config/rclone`, necessária para o `rclone` persistir
refresh tokens sem liberar escrita no restante da home. Se esse caminho for
removido, o upload pode aparentar sucesso enquanto o token renovado não é salvo.

Instalação/reconciliação:

```sh
sudo install -o root -g root -m 0750 deploy/vexclaud-offsite-backup.sh \
  /usr/local/sbin/vexclaud-offsite-backup
sudo install -o root -g root -m 0750 deploy/verify-offsite-restore.sh \
  /usr/local/sbin/verify-vexclaud-offsite-restore
sudo install -o root -g root -m 0644 deploy/vexclaud-offsite-backup.service \
  deploy/vexclaud-offsite-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vexclaud-offsite-backup.timer
```

Primeira execução validada:

- snapshot `20260831-022121`;
- tamanho local aproximado 4,9 GB;
- 11 arquivos;
- `rclone check`: zero diferenças, 11 correspondências;
- Drive Trabalho: aproximadamente 5,4 TB livres;
- sucesso registrado em `2026-09-01T01:48:16Z`;
- confirmação recebida no Telegram Oracle Sentinel.

Execução diária seguinte também validada:

- snapshot `20260901-022219`;
- `rclone check`: zero diferenças e 11 arquivos correspondentes;
- sucesso mais recente registrado em `2026-09-01T22:48:40Z`;
- após corrigir a permissão de refresh do OAuth, não houve mais erro de
  `read-only file system`.

Restauração real executada a partir do Drive:

```sh
sudo /usr/local/sbin/verify-vexclaud-offsite-restore 20260831-022121
```

Resultado: SHA-256 idêntico, `PRAGMA integrity_check=ok`, 12.006 obras e
221.979 capítulos no snapshot. O arquivo temporário foi isolado em `/tmp` e
removido; o banco vivo não foi alterado.

### Pendência obrigatória do rclone

O remoto funciona, mas ainda usa o client ID compartilhado do `rclone`, que
será aposentado durante 2026. Criar um OAuth Desktop client próprio e gratuito
no Google Cloud da conta Trabalho, preencher `client_id/client_secret` e então
executar `rclone config reconnect trabalho:`. Interromper qualquer `rclone`
durante a troca e testar `rclone about`, upload e restauração. Não publicar as
credenciais. Até essa migração, os alertas detectam backup ausente ou falha.

## 16. Monitoramento e Telegram

O bot é `VexClaud Oracle Sentinel`. O chat emparelhado está configurado como
home channel do Hermes. O gateway roda como serviço de usuário
`hermes-gateway.service`.

Cron ativo:

- ID `954f937f70cf`;
- nome `mangaflow-watchdog`;
- frequência 15 min;
- modo `no-agent`;
- entrega Telegram;
- silencioso quando saudável.

O script alerta quando:

- disco raiz atinge 80%;
- API, worker, web ou FreeLLMAPI param;
- `/api/v1/ready` falha;
- backup local passa de 30 horas;
- backup externo inexiste ou passa de 36 horas;
- serviço de backup externo fica em estado failed.

O monitor não consome tokens de IA. FreeLLMAPI permanece disponível para
conversas/diagnóstico do agente, mas não participa dos checks periódicos.

Comandos úteis:

```sh
systemctl --user status hermes-gateway.service
/home/opc/.hermes/hermes-agent/venv/bin/python -m hermes_cli.main cron list
/home/opc/.hermes/hermes-agent/venv/bin/python -m hermes_cli.main cron incidents
/home/opc/.hermes/scripts/mangaflow-watchdog.sh
```

## 17. Estado atual dos timers

Validado em 01/09/2026:

- `coolify-local-backup.timer`: active/waiting, último resultado success;
- `vexclaud-offsite-backup.timer`: active/waiting;
- `vexclaud-offsite-backup.service`: inactive/dead após resultado success;
- watchdog: último run completed/ok e próxima execução agendada.

## 18. Recuperação e incidentes

### Site retorna 502/404

1. conferir `docker ps` e logs de `deploy-api-1`/`mangaflow-web-1`;
2. conferir `dokploy-traefik` e a `dokploy-network`;
3. testar internamente `http://127.0.0.1:3100/api/v1/ready` quando aplicável;
4. confirmar que o compose correto e o mesmo project name foram usados;
5. reverter somente o componente alterado a partir do backup datado.

### Worker falha ou é limitado

1. ler logs do worker e `provider_health`;
2. respeitar `Retry-After`; não reduzir intervalo abaixo de 300 ms;
3. não executar sync manual concorrente;
4. verificar circuit breaker e aguardar o horário de retry;
5. confirmar que o token administrativo não foi removido.

### Disco cresce

1. verificar `/data/assets`, backups e `docker system df` sem apagar;
2. o app deixa de baixar assets abaixo de 25 GB livres e alerta abaixo de 35 GB;
3. não aumentar volume OCI: os 200 GB Always Free já estão alocados;
4. limpar somente caches/artefatos comprovadamente regeneráveis e com backup.

### Backup falha

1. `systemctl status` e `journalctl -u` dos dois serviços;
2. confirmar snapshot local e `SHA256SUMS`;
3. `rclone about trabalho:` e espaço da conta Trabalho;
4. testar OAuth próprio/refresh token sem mostrar a configuração;
5. não excluir o snapshot local até haver cópia externa validada.

## 19. Pendências priorizadas

### P0 — continuidade

1. Migrar o `rclone` do client ID compartilhado para client ID próprio gratuito
   da conta Trabalho antes da retirada em 2026.
2. Manter Oracle em Always Free; nenhum aumento de storage ou LB.

### P1 — segurança e consistência

1. Decidir e implementar política server-side para conteúdo +18; hoje o
   `age-gate` não é barreira de segurança.
2. Concluir e comprovar a full sync pública (`public-safe` e
   `public-suggestive`) sem ultrapassar limites do MangaDex.
3. Reconciliar as duas árvores de release da VPS com o repositório canônico e
   registrar o hash implantado por componente.
4. Atualizar o runtime SQLite usado internamente pelo Hermes; ele detectou a
   biblioteca 3.34.1 e usa `journal_mode=DELETE` como mitigação segura. Avaliar
   `hermes doctor/update` em janela com rollback, sem afetar o bot atual.

### P2 — desempenho e manutenção

1. Dividir o bundle principal de 567,84 kB com imports dinâmicos.
2. Avaliar migração do preset Lovable para resolução nativa de tsconfig paths
   somente após teste completo.
3. Adicionar healthcheck explícito ao worker e ao web no Compose.
4. Automatizar registro do commit/image digest implantado.
5. Executar restauração de amostra periodicamente, não apenas upload/check.

### Roadmap, não implantado

PostgreSQL como catálogo canônico, Redis, múltiplos providers (Consumet,
Suwayomi/AniList), filas distribuídas e domínio Supabase provider-agnostic são
possibilidades. Não descrevê-los como estado atual.

## 20. Checklist para a próxima pessoa

1. Ler os quatro documentos principais e `AGENTS.md`.
2. `git fetch --all --prune`, conferir branch e nunca reescrever histórico.
3. Verificar `git status`; preservar os arquivos locais não rastreados.
4. Testar produção antes de qualquer mudança e salvar as métricas iniciais.
5. Confirmar budget/forecast OCI = zero e limites Always Free.
6. Fazer backup local e confirmar a cópia Drive Trabalho.
7. Alterar o menor conjunto possível de serviços.
8. Executar `npm run check`, audit, smoke tests e validação visual.
9. Comparar o estado final com o inicial, inclusive banco e imagens servidas.
10. Commitar somente arquivos intencionais, push fast-forward para `main` e
    verificar o hash remoto.
11. Atualizar este handoff com data, commit, deploy, rollback e novas pendências.

## 21. Critério de “concluído”

Uma mudança só está concluída quando código, estado implantado e resultado
externo concordam. HTTP 200 de um comando de deploy, build de imagem, upload
sem `rclone check` ou commit sem comparar o ref remoto não são evidência
suficiente. Para este projeto, sempre validar aplicação, banco, backup,
Telegram, GitHub e custo OCI separadamente.
