# Backend Yae House

## Decisão arquitetural

O projeto continuará usando PostgreSQL/Supabase para dados e identidade. A API interna e os workers serão executados no servidor próprio e usarão `service_role`; o navegador não recebe credenciais de providers nem executa ingestão.

```text
Front TanStack -> API interna -> aplicação/domínio -> PostgreSQL
                                  |              -> Redis/fila
                                  |              -> storage local
                                  +-> adapters MangaDex / Consumet / Suwayomi / AniList
```

Uma obra é um registro canônico em `works`. Manga, manhwa e light novel são valores de `work_type`, não tabelas duplicadas. Cada representação externa fica em `source_mappings`, com score de confiança e dados brutos auditáveis. Capítulos seguem a mesma regra: `chapters` é o registro canônico e `chapter_sources` contém as alternativas.

## Limites e riscos

- Confirmação de idade no front é UX, não autorização. A API verifica `profiles.age_verified_at` e a política de acesso.
- Assets completos só podem ser persistidos quando o provider e a configuração permitirem. `image_assets.asset_kind` e `storage_policy` separam capa, thumbnail e página.
- Matching apenas por título produz falsos positivos. O reconciliador usará aliases, ano, autores, formato e score mínimo.
- Providers têm limites e instabilidade. Toda chamada passa por rate limit, retry com jitter e circuit breaker registrado em `provider_health`.
- Dados legados em `mangas`, `destaques`, `generos` e `noticias` ficam preservados durante a migração gradual.

## Fases

1. Domínio e políticas: migration `20260806010000_backend_domain_phase1.sql`.
2. API interna tipada, autenticação de serviço e endpoints de catálogo.
3. Adapters MangaDex, Consumet, Suwayomi e AniList.
4. Redis, workers, retry, deduplicação e observabilidade.
5. Cache local de assets permitido, hashes e URLs internas.
6. Integração do front e remoção progressiva dos mocks.

## Contrato de acesso +18

O catálogo geral pode ser consultado normalmente. Para uma obra `18+`, a API exige sessão válida, perfil com `age_verified_at` e consentimento vigente. Administradores continuam sujeitos à auditoria. O banco impede leitura direta autenticada sem verificação.
