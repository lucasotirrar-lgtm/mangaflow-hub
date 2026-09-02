# Plano completo para finalizar o MangaFlow Hub

Data: 2026-09-02.
Escopo deste arquivo: plano, auditoria e registro das entregas executadas.

## Execucao iniciada em 2026-09-02

- Cadastro publico e Google OAuth removidos da rota `/auth`; a tela agora aceita
  somente login administrativo por e-mail/senha previamente provisionado.
- Removida a acao `claimFirstAdmin`; nenhum usuario pode se promover pelo site.
  A funcao admin precisa ser atribuida por convite/role no Supabase.
- Capitulos sem numero agora aparecem como "Capitulo disponivel" no card, no
  destaque da obra e na lista de capitulos, preservando o acesso ao leitor.
- Datas de lancamento da obra foram normalizadas para formato local pt-BR.
- Cards do catalogo foram transformados em links semanticos reais.
- O leitor recebeu preferencias locais de largura, espacamento e fundo.
- Validacoes executadas: `npm run lint`, `npm run typecheck` e `npm run build`.

As fases restantes abaixo continuam planejadas e nao foram consideradas
concluidas apenas por esta primeira entrega.

## Objetivo

Levar o MangaFlow Hub a um estado completo como site privado/publicavel de
leitura e catalogo PT-BR, com:

- front consistente, leve e navegavel;
- backend confiavel, observavel e economico na Oracle Always Free;
- painel apenas para administracao;
- cadastro publico removido ou desabilitado;
- maior cobertura possivel de catalogo PT-BR real;
- documentacao suficiente para outra pessoa continuar sem depender da conversa.

## Estado verificado

### Producao

- Site: `https://manga.vexclaud.site`.
- API: `deploy-api-1`, saudavel.
- Worker: `deploy-worker-1`, ativo.
- Web: container web ativo.
- Banco: SQLite em `/data/mangaflow.db`, `integrity_check=ok`.
- Obras vivas no banco: 12.259.
- Obras publicas/adultas no banco: 10.305 / 1.954.
- Capitulos no banco: 224.860.
- Obras com capitulos: 9.565.
- Capitulos sem numero: 1.860.
- Capitulos com `page_count = 0`: 0 no momento da consulta.
- Catalogo publico navegavel: 8.689 obras.
- Lista adulta navegavel quando a preferencia local esta ligada: 873 obras.

### Browser integrado

Rotas visitadas sem erro de console:

- `/`
- `/descobrir?limit=48&page=1`
- `/buscar?q=blue&page=1`
- `/configuracoes`
- `/auth`
- `/admin`

Fluxos observados:

- Home mostra novidades, destaques, continuar lendo quando existe historico e
  lista adulta quando a preferencia local esta ligada.
- Descobrir mostra 48 cards por pagina e filtros de formato, faixa etaria,
  status e quantidade por pagina.
- Busca por `blue` retornou 63 resultados e paginacao.
- Configuracoes mostra o toggle local de conteudo adulto.
- `/auth` ainda mostra login por email/senha, Google OAuth e botao de cadastro.
- `/admin`, com usuario comum logado, mostra botao "Tornar-me administrador".
  Isso deve ser removido se a decisao for manter somente admin controlado.

### Fontes externas comparadas

MangaDex:

- `GET /manga?availableTranslatedLanguage[]=pt-br...` retornou total aproximado
  de 13.957 obras com idioma PT-BR disponivel.
- `GET /chapter?translatedLanguage[]=pt-br...` retornou total aproximado de
  240.589 capitulos PT-BR.
- E a unica fonte atual testada que fornece capitulo/pagina PT-BR diretamente
  em API publica adequada ao leitor.

AniList:

- GraphQL respondeu para manga e oferece metadados amplos.
- Bom para popularidade, titulos, sinonimos, datas, generos e deduplicacao.
- Nao fornece paginas/capitulos traduzidos em PT-BR para leitura.

Kitsu:

- API publica respondeu para manga e traz metadados, rankings e imagens.
- Bom para enriquecer descoberta e metadados.
- Nao substitui fonte de capitulos PT-BR.

Jikan/MyAnimeList:

- Documentacao v4 acessivel, mas a chamada de teste retornou 504 por falha
  momentanea com MyAnimeList.
- Deve ser tratado como fonte auxiliar instavel/cacheada, nunca como dependencia
  critica de leitura.

## Diagnostico por area

### Frontend publico

O que esta bom:

- Identidade visual consistente.
- Catalogo real conectado a API Express.
- Home leve com filas de novidades e destaques.
- Lista adulta condicionada por preferencia local.
- Leitor carrega paginas e registra "continuar lendo" local.
- Filtros e paginacao basicos ja existem.

O que falta para ficar completo:

1. Transformar cards em links semanticos reais para `/obra/:slug`.
   Hoje eles aparecem principalmente como botoes. O clique funciona, mas isso
   enfraquece acessibilidade, SEO e automacao.

2. Padronizar datas em PT-BR.
   Capitulos aparecem como ISO bruto, por exemplo
   `2024-02-21T23:00:31+00:00`.

3. Melhorar cards sem numero de capitulo.
   Existem 1.860 capitulos sem numero no banco. O card deve exibir
   "Capitulo disponivel" ou uma etiqueta equivalente quando `latestChapter`
   nao for numerico, em vez de parecer incompleto.

4. Melhorar busca.
   A busca tem paginacao simples, mas falta filtro por formato/status/faixa,
   ordenacao, debounce opcional, destaque do termo e melhor estado para busca
   curta.

5. Melhorar descoberta.
   Adicionar ordenacao explicita: recentes, titulo A-Z, mais capitulos,
   atualizado recentemente e possivelmente populares por metadados externos.

6. Melhorar leitor.
   O botao de preferencias ainda e placeholder. Implementar modo vertical,
   largura de pagina, espacamento, tema, persistencia local e atalhos simples.

7. Melhorar historico e biblioteca.
   Hoje sao locais. Para um site so admin, isso pode continuar local. Se houver
   login de leitor no futuro, migrar para conta exige outro plano.

8. Revisar responsividade final.
   Testar mobile, tablet e desktop com cards longos, titulos extensos, leitor e
   paginas de erro.

9. Melhorar SEO basico.
   Rotas de obra deveriam ter titulo/description por obra quando possivel,
   canonical e dados estruturados simples sem expor fonte indevida.

10. Remover textos que prometem sincronizacao de conta enquanto isso nao existe.

### Autenticacao e cadastro

Estado atual:

- `/auth` permite alternar para cadastro.
- Login com Google OAuth aparece.
- Admin possui `claimFirstAdmin`, que permite o primeiro usuario virar admin
  quando ainda nao ha admin.
- O usuario atual visto no navegador estava logado, mas sem papel admin.

Plano recomendado se a decisao for tirar cadastro:

1. Remover modo `cadastro` da tela `/auth`.
2. Remover botao "Nao tenho conta - criar agora".
3. Decidir se Google continua para admin ou se sera apenas email/senha.
4. Remover ou travar `claimFirstAdmin` em producao.
5. Criar allowlist server-side de emails administradores, por env ou tabela
   protegida, e negar todo o resto.
6. Ajustar Supabase para impedir signup publico no painel do projeto.
7. Trocar copy da tela para "Acesso administrativo".
8. Remover links publicos de "Entrar" se o site nao tera conta de leitor.
9. Manter logout e limpeza de cache client-side.
10. Validar: usuario sem admin ve negacao clara; admin real acessa painel;
    cadastro publico nao aparece e nao funciona.

Opcao mais segura:

- Manter Supabase Auth apenas para administradores.
- Administradores sao criados manualmente no Supabase ou por convite controlado.
- O site publico usa somente localStorage para biblioteca, historico e adulto.

### Painel administrativo

O que esta bom:

- Dashboard operacional real consulta a API interna com token server-side.
- O token `MANGAFLOW_ADMIN_TOKEN` nao aparece no navegador.
- Cards mostram catalogo, capitulos, assets, disco, sync e saude.

Problemas:

1. Painel mistura operacao real da VPS com CMS antigo do Supabase.
   As abas "Mangas", "Destaques", "Noticias" e "Generos" editam tabelas CMS
   que nao sao a fonte canonica do catalogo real.

2. Falta controle operacional seguro no painel.
   O admin deveria ver status dos timers, ultimos backups, ultimos syncs,
   incidentes do Telegram/Hermes e espaco em disco.

3. Falta acao segura de sync manual com confirmacao.
   Sincronizar catalogo/capitulos deve existir no painel, mas com limites,
   single-flight, estado de progresso e protecao contra spam.

4. Falta pagina de logs resumidos.
   Mostrar ultimas execucoes, falhas, backoff MangaDex e eventos de backup sem
   expor segredos.

5. Falta painel de cobertura.
   Mostrar total MangaDex PT-BR conhecido, total salvo, obras sem capitulo,
   obras com capitulo sem paginas, capitulos sem numero e lanes full pendentes.

6. Falta curadoria conectada ao catalogo real.
   Destaques deveriam apontar para `work_id` ou `slug` real, nao duplicar dados
   em CMS paralelo.

7. Falta controle adulto administrativo.
   O admin precisa ver quantas obras adultas existem, quantas sao navegaveis e
   se a sync adulta esta em dia; o usuario comum continua controlando visibilidade
   local.

Plano de painel completo:

1. Renomear abas:
   `Visao geral`, `Catalogo real`, `Sync`, `Backups`, `Curadoria`, `Sistema`.

2. Transformar CMS legado:
   - manter noticias/generos somente se forem usados no site;
   - migrar destaques para referencias de obras reais;
   - esconder ou remover "Mangás" manual se ele nao afeta o catalogo principal.

3. Criar endpoints administrativos server-side:
   - status dos timers systemd;
   - ultimos backups;
   - ultimos syncs;
   - disparo controlado de sync;
   - cobertura de catalogo;
   - saude do provider.

4. Exigir papel admin em tudo.

5. Nao expor `.env`, token, rclone config, cookies, logs sensiveis ou IPs
   privados desnecessarios.

### Backend e banco

O que esta bom:

- API Express simples e rapida.
- SQLite com WAL e indices adequados para o tamanho atual.
- FTS5 para busca.
- Single-flight para syncs.
- Backoff e circuito para provider.
- Rota `/api/v1/home` otimizada para Always Free.

O que falta:

1. Completar lanes full publicas.
   `public-safe` ainda estava em offset 3000/9415 e sem `last_full_at`.
   `public-suggestive` nao apareceu no cursor consultado. Nao declarar cobertura
   total ate esses ciclos fecharem.

2. Separar melhor "obra com idioma PT-BR" de "obra legivel".
   MangaDex informou mais obras/capitulos PT-BR do que o banco atual. Parte pode
   ser chapter externo oficial, indisponivel, duplicado ou sem paginas. O sistema
   deve classificar isso explicitamente.

3. Guardar metadados de disponibilidade de pagina.
   Incluir campos/estado para chapter `externalUrl`, `isUnavailable`, `pages`,
   `readableAt`, `publishAt` e motivo de exclusao.

4. Criar tabela de provider coverage.
   Registrar totais observados por query/lane/fonte para comparar lacunas ao
   longo do tempo.

5. Melhorar deduplicacao entre fontes.
   Usar links do MangaDex para MAL/AniList/MangaUpdates quando existirem e
   normalizacao de titulo/ano.

6. Expor rota de sitemap/feed.
   Gerar sitemap de obras publicas com capitulo e feed de lancamentos.

7. Melhorar observabilidade.
   Separar metricas de catalogo, capitulos, paginas, assets, backoff, backup e
   custo em uma rota admin sem segredo.

8. Revisar headers.
   API tem CSP `default-src 'none'` adequado para JSON, mas SSR/public precisa
   checagem propria de CSP/cache.

9. Criar testes automatizados.
   Cobrir catalog filters, search, adult gating, home queues, chapters/pages,
   admin auth e sync state.

### Catalogo PT-BR e outras APIs

Regra central:

- Nao adicionar fonte que so tem metadados como se fosse obra legivel.
- Para aparecer no site como leitura, a obra precisa ter capitulos PT-BR com
  paginas serviveis ou link oficial tratado conscientemente.

Prioridade de fontes:

1. MangaDex: fonte primaria para leitura PT-BR.
   A diferenca atual estimada e de aproximadamente 1.698 obras com idioma PT-BR
   disponivel e 15.729 capitulos PT-BR em relacao aos totais retornados pela API.
   Antes de buscar outras fontes, completar/reconciliar essa lacuna.

2. AniList: metadata, popularidade, sinonimos, formatos e score.
   Usar para enriquecer obras ja legiveis e para descobrir obras populares que
   faltam no MangaDex local.

3. Kitsu: metadata, popularidade e imagens alternativas.
   Usar como complemento de descoberta, nao como leitor.

4. Jikan/MyAnimeList: metadata auxiliar.
   Usar com cache agressivo e tolerancia a 504/instabilidade.

5. MangaUpdates: muito util para links cruzados, status, scanlation e nomes
   alternativos, mas precisa avaliar API/autorizacao/limites antes de integrar.

6. Fontes oficiais com PT-BR externo, como Comikey quando aparecer via MangaDex:
   tratar separadamente, pois podem ter `externalUrl` e `pages=0`. Decidir se o
   site vai abrir link externo, ocultar, ou exibir como "ler na fonte oficial".

Fontes a evitar como base primaria:

- Scraping de sites sem API/termos claros.
- Fontes inglesas como se fossem PT-BR.
- APIs que so retornam anime ou metadados sem chapters.
- Qualquer fonte que force armazenar conteudo pesado ou burlar paywall.

Plano de expansao de catalogo:

1. Implementar auditoria MangaDex:
   - total por `availableTranslatedLanguage[]=pt-br`;
   - total por `translatedLanguage[]=pt-br`;
   - total por contentRating;
   - total de capitulos com `externalUrl`;
   - total de capitulos com `pages > 0`;
   - diferenca por obra entre provider e SQLite.

2. Finalizar sync full publica em lanes menores.
   Particionar por rating, status, createdAt/updatedAt ou tags para contornar
   limites de janela sem sobrecarregar a Oracle.

3. Criar fila de reconciliacao de capitulos.
   Priorizar obras populares, obras com chapterCount divergente e obras com
   atualizacao recente.

4. Criar enriquecimento metadata-only.
   Resolver AniList/Kitsu/Jikan/MangaUpdates por links oficiais primeiro, titulo
   e ano depois.

5. Exibir badges de fonte:
   `Legivel aqui`, `Link oficial`, `So metadados`, `Sem PT-BR`.

6. Manter custo baixo:
   cache no SQLite, lotes pequenos controlados, backoff, sem servicos pagos e sem
   novos recursos Oracle.

### Infra, backup e custo

Manter prioridade absoluta:

- Oracle Always Free.
- Nao criar recurso OCI novo.
- Nao aumentar volume, OCPU, RAM, load balancer ou banco gerenciado.
- Nao armazenar videos/episodios.
- Caches de imagens devem obedecer limites e limpeza segura.

Pendencias:

1. Migrar `rclone` do client_id compartilhado para client_id proprio gratuito da
   conta Google Drive Trabalho.
2. Adicionar status de backup no painel admin.
3. Adicionar alerta de cobertura/sync travado no Telegram.
4. Criar script de deploy seguro para a topologia dividida:
   `release-router` para API/worker e `release-vercel-fix` para web.
5. Documentar rollback por componente dentro do painel/runbook.

## Plano de execucao recomendado

### Fase 1 - Admin-only e seguranca de acesso

Entregas:

- Remover cadastro publico da UI.
- Desativar signup publico no Supabase.
- Remover `claimFirstAdmin` ou limitar por env/admin bootstrap temporario.
- Criar allowlist de admin.
- Ajustar navegação pública removendo promessa de conta de leitor.

Criterios de aceite:

- `/auth` mostra apenas login admin.
- Botao de cadastro nao existe.
- Usuario comum nao consegue virar admin.
- Admin autorizado acessa painel.
- Nao ha token/admin secret no browser.

### Fase 2 - Painel admin real

Entregas:

- Separar dashboard operacional de curadoria.
- Adicionar status de backups, timers e ultimos syncs.
- Adicionar cobertura de catalogo e lacunas.
- Adicionar acoes de sync manual com confirmacao e limites.
- Migrar destaques para obras reais por slug/work_id.

Criterios de aceite:

- Admin entende o estado da VPS em uma tela.
- Acoes sensiveis exigem admin e mostram resultado.
- CMS legado nao confunde com catalogo vivo.
- Logs sao redigidos e sem segredos.

### Fase 3 - Completar cobertura MangaDex PT-BR

Entregas:

- Auditoria de diferencas provider vs SQLite.
- Full sync publica concluida por lanes.
- Classificacao de capitulos externos/sem paginas/sem numero.
- Reconciliacao de chapterCount e latestChapter.

Criterios de aceite:

- Painel mostra total provider, total salvo e lacuna restante.
- Obras sem capitulo legivel nao aparecem como se fossem leitura normal.
- Capitulos PT-BR com paginas aparecem no leitor.
- Lacunas justificadas ficam com motivo auditavel.

### Fase 4 - Enriquecimento por outras APIs

Entregas:

- Resolver IDs externos via links MangaDex, AniList, MAL/Jikan, Kitsu e
  MangaUpdates quando seguro.
- Enriquecer score, popularidade, sinonimos, demografia, autores e imagens.
- Criar ranking/descoberta melhor sem depender dessas APIs em tempo real.

Criterios de aceite:

- O site continua funcionando se AniList/Kitsu/Jikan falharem.
- Nenhum item metadata-only aparece como legivel sem capitulo.
- Cache evita chamadas repetidas e respeita rate limits.

### Fase 5 - Front completo

Entregas:

- Cards como links semanticos.
- Datas PT-BR.
- Busca com filtros e ordenacao.
- Descoberta com ordenacao.
- Leitor com preferencias reais.
- Melhor responsividade e estados vazios.
- SEO de obras e sitemap.

Criterios de aceite:

- Fluxos desktop/mobile passam no navegador.
- Busca, filtros, paginacao e leitor nao geram erro de console.
- A pagina fica leve e sem regressao de bundle relevante.

### Fase 6 - Operacao e backup no painel

Entregas:

- Status de backup local/offsite.
- Ultimo backup validado no Drive Trabalho.
- Botao de teste de restore somente leitura.
- Alertas Telegram para sync parado, backup velho, disco alto e API indisponivel.
- Plano de migracao rclone client_id proprio.

Criterios de aceite:

- Admin sabe se o backup diario rodou.
- Restore testado sem tocar no banco vivo.
- Alertas chegam sem depender de modelo pago.

## Testes obrigatorios antes de qualquer deploy

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- API: `/api/v1/health`, `/api/v1/ready`, `/api/v1/home`, catalogo, busca,
  obra, capitulos e paginas.
- Browser: home, descobrir, buscar, obra, leitor, configuracoes, auth e admin.
- Admin: sem usuario, usuario comum e admin real.
- VPS: containers, healthcheck, logs recentes, disco.
- Backup: timers, ultimo offsite, `rclone check` ou restore isolado.

## Riscos e controles

| Risco | Controle |
| --- | --- |
| Estourar Always Free | nao criar recursos, medir disco/egress, cache controlado |
| Expor segredo | nunca commitar `.env`, token, rclone, cookie ou dump |
| Fonte externa instavel | cache, backoff, circuit breaker e fallback |
| Catalogo inflado sem leitura | separar `legivel`, `link oficial` e `metadata-only` |
| Admin aberto demais | remover cadastro, allowlist e papel admin server-side |
| Deploy errado pela topologia dividida | script idempotente e checklist por componente |
| Perder historico Lovable | sem force push, rebase, amend ou squash publicado |

## Referencias tecnicas consultadas

- MangaDex API: `https://api.mangadex.org/docs/`
- AniList API: `https://docs.anilist.co/`
- Kitsu API: `https://kitsu.docs.apiary.io/`
- Jikan API v4: `https://docs.api.jikan.moe/`

## Ordem recomendada de implementacao

1. Admin-only.
2. Painel operacional real.
3. Auditoria e fechamento MangaDex PT-BR.
4. Tratamento de capitulos externos/sem numero.
5. Enriquecimento metadata-only por outras APIs.
6. Melhorias de front/leitor/SEO.
7. Backup/rclone/alertas no painel.

Nao inverter a ordem: primeiro proteger e clarear administracao, depois aumentar
catalogo, depois polir descoberta. Assim o projeto cresce sem virar uma mistura
de dados reais, CMS antigo e fonte externa instavel.
