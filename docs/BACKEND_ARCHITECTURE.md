# Backend Yae House

## Arquitetura em produção

Supabase permanece responsável por identidade e CMS. O catálogo e o leitor usam
SQLite persistente na Oracle, API Express e worker interno. O navegador não recebe
credenciais do MangaDex nem executa ingestão.

```text
Front TanStack -> API Express -> SQLite WAL -> storage local
                              -> MangaDex PT-BR
```

`works`, `chapters`, `assets` e `sync_runs` guardam o catálogo. `sync_cursors`
mantém os cursores incrementais e `work_sync_state` agenda capítulos por obra.
Capítulos com o mesmo volume/número são preservados como releases alternativos.

## Limites e riscos

- Capítulos e páginas são aceitos somente com filtro MangaDex `pt-br`.
- Busca e detalhes consultam apenas o SQLite; ingestão exige rota administrativa.
- Chamadas MangaDex são serializadas, limitadas e protegidas por backoff/circuito.
- Assets param de crescer abaixo de 25 GiB livres e geram alerta abaixo de 35 GiB.

## Fora do estado atual

PostgreSQL para catálogo, Redis, Consumet, Suwayomi, AniList e múltiplas fontes são
roadmap. Não devem ser documentados como serviços implantados.

## Contrato de acesso +18

O catálogo geral pode ser consultado normalmente. Para uma obra `18+`, a API exige sessão válida, perfil com `age_verified_at` e consentimento vigente. Administradores continuam sujeitos à auditoria. O banco impede leitura direta autenticada sem verificação.
