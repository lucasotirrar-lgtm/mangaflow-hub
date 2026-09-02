# MangaFlow Hub

Catálogo e leitor de mangás em português, com frontend TanStack Start, API
Express, SQLite persistente e sincronização controlada com MangaDex PT-BR.

- Produção: https://manga.vexclaud.site
- Health: https://manga.vexclaud.site/api/v1/health
- Operação e recuperação: [docs/OPERATIONS.md](docs/OPERATIONS.md)
- Arquitetura: [docs/BACKEND_ARCHITECTURE.md](docs/BACKEND_ARCHITECTURE.md)
- Handoff completo e estado atual: [docs/PROJECT_HANDOFF.md](docs/PROJECT_HANDOFF.md)
- Auditoria final e próximos ajustes: [docs/FINAL_AUDIT_2026-09-02.md](docs/FINAL_AUDIT_2026-09-02.md)

## Desenvolvimento

Requer Node.js 24 e npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Antes de publicar:

```sh
npm run check
npm audit --omit=dev --audit-level=high
git diff --check
```

## Produção

A Oracle principal executa frontend, API e worker em Docker Compose, atrás do
Traefik/Dokploy. O catálogo persistente fica no volume
`deploy_mangaflow_data`; nenhum episódio ou vídeo é armazenado.

O worker processa até 100 obras por lote enquanto há trabalho. Quando a fila
está em dia, ele espera de forma adaptativa até a próxima obra elegível para
evitar chamadas e gravações vazias.

Backups locais e externos, deploy, rollback, monitoramento e rotas estão
documentados no manual operacional. Segredos ficam somente na VPS: nunca
adicione `.env`, tokens, chaves, dumps ou sessões ao Git.

## Git e Lovable

Este repositório é conectado ao Lovable. Não use force push, rebase, amend ou
squash em commits já publicados. A branch `main` deve permanecer implantável.
