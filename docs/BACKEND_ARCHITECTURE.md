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

## Estado real do acesso +18

O SQLite separa as obras com `is_adult`, e o catálogo público usa a faixa comum
por padrão. Porém, a API Express atual ainda aceita `adult=true` nas rotas de
catálogo/busca e não bloqueia o acesso direto por `slug`; o `age-gate` do
frontend é somente uma barreira de interface. As políticas RLS da migração
Supabase protegem as tabelas Supabase, mas não protegem o SQLite da Oracle.

Se a intenção do produto for restringir conteúdo +18 a usuários verificados,
isso ainda precisa ser implementado no servidor Express com sessão verificável.
Não considerar o controle atual uma proteção de segurança.
