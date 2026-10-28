# MangaFlow / Yae Manga House: guia para o Antigravity

Atualizado em 28/10/2026. Este documento permite continuar o projeto com segurança,
principalmente em alterações visuais. Dados operacionais são um retrato da última
verificação informada, não uma garantia de estado atual. As instruções atuais do
proprietário prevalecem; este documento não é autorização para publicar ou alterar
infraestrutura por conta própria.

## Comece por aqui

- Pasta para abrir: `C:/Users/lkssi/OneDrive/Documentos/Programa particular de edição/mang-hub-brasil-main`.
- Site: https://manga.vexclaud.site. Repositório: https://github.com/lucasotirrar-lgtm/mangaflow-hub.git.
- Leia `AGENTS.md`, este guia, `README.md` e o trecho relevante de `docs/OPERATIONS.md` antes de executar mudanças. Leia `src/routes/README.md` se alterar rotas.
- Antes de editar, rode `git status --short --branch` e leia o diff. Havia mudanças não commitadas e arquivos não rastreados antes deste guia: `backend/server.cjs`, `backend/chapter-manifest*`, `.agent.md`, `.continue/`, `.playwright-cli/`, `deploy/docker-compose.amd.yml`, `deploy/nginx.amd.conf` e `ops/`. São trabalho existente; não apague, reverta, sobrescreva ou inclua tudo automaticamente em um commit.
- A branch observada era `agent/mangaflow-real-catalog`. Não suponha que o checkout, GitHub e produção sejam idênticos. Compare os commits e releases antes de qualquer deploy. O Lovable sincroniza commits enviados para a branch conectada: nunca force push nem reescreva histórico já publicado.
- Para ajustes simples de interface, trabalhe em `src/`, teste localmente e entregue o resultado. Não faça deploy, migração, restart, alteração de DNS, banco, backup ou configuração de servidor sem que o pedido inclua isso. Não crie nem altere arquivos `.env` reais, credenciais, tokens ou dados privados.

## Objetivo do produto

Catálogo e leitor de mangás com navegação em português brasileiro. O proprietário
quer evoluir a apresentação visual e a experiência de uso, preservando a leitura,
o catálogo real, capas, capítulos, preferências e dados. Prefere soluções simples,
responsivas e compreensíveis para usuários leigos. Ele pode solicitar mudanças
visuais específicas: siga o pedido, sem inventar uma reformulação completa.

Existe o objetivo futuro de construir uma API própria que possa atender vários
sites e usar o conteúdo já arquivado. **Essa API independente ainda não foi
implementada**: não anuncie que o arquivo do Drive já é uma API ou que todos os
capítulos estão disponíveis nele. Uma cópia técnica não concede direitos de
distribuição; respeite direitos, atribuição, licenças e pedidos de retirada.

## Mapa técnico

- React 19, TypeScript, TanStack Start/Router, Vite, Tailwind CSS 4 e componentes Radix. Rotas são por arquivo em `src/routes/`; não aplicar convenções Next.js. `src/routeTree.gen.ts` é gerado: não editar manualmente.
- Entrada e estrutura comuns: `src/routes/__root.tsx`, `src/router.tsx`, `src/styles.css`, `src/components/site-header.tsx`, `site-footer.tsx` e `product-states.tsx`.
- Início e descoberta: `src/routes/index.tsx`, `descobrir.tsx`, `mangas.tsx`, `generos.tsx`, `buscar.tsx`; listagens/cartões: `src/components/catalog-page.tsx` e `manga-card.tsx`.
- Obra e leitor: `src/routes/obra.$slug.tsx` e `src/routes/ler.$slug.$chapter.tsx`. Manter URLs, IDs, sequência de páginas, seleção de capítulo e tratamento de carregamento/erro.
- Biblioteca, favoritos, histórico e configurações: respectivas rotas em `src/routes/`; persistência local relevante em `src/lib/local-library.ts` e `reading-history.ts`. Preserve dados salvos e compatibilidade dos formatos.
- Serviços de catálogo: `src/services/catalog-service.ts`, `src/lib/catalog.functions.ts`, `src/lib/catalog-providers.server.ts` e `src/types/content.ts`. O front usa rotas `/api/v1/...`, incluindo catálogo, busca, obras, capítulos e páginas. Não troque dados reais por mocks no produto.
- Backend Node/Express/SQLite em `backend/`, separado do front. Autenticação e Supabase/Lovable aparecem em `src/integrations/` e `src/hooks/use-auth.ts`; não presumir que toda funcionalidade de conta esteja validada sem testar.
- Dependências e scripts de referência estão em `package.json`. O README indica Node 24, `npm ci`, `npm run dev`, `npm run check` e `git diff --check`. Consulte `.env.example` apenas para nomes e significado das variáveis; não exponha valores de configuração privada. Evite `npm run format` global para uma pequena mudança, pois reescreve arquivos fora do escopo.

## Estado operacional registrado, não uma verificação atual

Em 28/10/2026 às 05:19 em São Paulo, o domínio respondeu HTTP 200, a API estava
`healthy`, web e worker estavam em execução e o arquivador estava ativo. Havia
5.436 capítulos verificados e 92,4 GB no arquivo; 51 trabalhos aguardavam nova
tentativa (16 contagem de páginas inválida, 6 HTTP 404 da origem e 29 imagem
inesperada). Nessa consulta não houve teste de leitura pelo navegador nem
restauração do backup. As contagens mudam; nunca as apresente como atuais sem
nova consulta. O catálogo geral contém itens que ainda não estão arquivados.

Historicamente, o frontend e API/worker usam releases diferentes na Oracle ARM:
web em `/opt/mangaflow-hub/release-vercel-fix/deploy`, API/worker em
`/opt/mangaflow-hub/release-router/deploy`; volume de dados
`deploy_mangaflow_data`. Revalidar caminhos, SHA, compose, redes e dependências
antes de qualquer implantação. Saúde do container e HTTP 200 não provam que a
leitura inteira funciona. Não reinicie ou recrie tudo como solução genérica.

## Arquivo Drive, coleta e backups

`ops/drive_archive/README.md` descreve formato de índice, CBZ, manifesto e
limites. Atenção: esse README foi escrito antes da troca para OAuth dedicado;
o alias `trabalho:` ali é histórico para o arquivador. Em 24/10 foi verificada
a conta `zatchbellbackup@gmail.com` e o arquivador passou a usar o alias
`mangaflow_drive:` com configuração protegida em
`/var/lib/mangaflow-drive-archive/rclone.conf`. O remoto `trabalho` original
continua servindo aos backups: não sobrescreva, substitua nem divulgue seus
segredos. O projeto Google OAuth está em modo Testing; a autorização pode expirar
após sete dias. O usuário aceitou manter Testing, portanto não publique o app
Google nem modifique cobrança por iniciativa própria.

Na última configuração conhecida, o worker usa
`/etc/mangaflow-drive-archive.json`, estado em
`/var/lib/mangaflow-drive-archive/` e serviço
`mangaflow-drive-archive.service`. O índice SQLite é um snapshot; não se deve
usá-lo diretamente no Drive como banco aberto. Capítulos concluídos são CBZ com
manifesto e hashes; a coleta não é cópia integral do catálogo. O escopo atual
do arquivador exclui `is_adult=1`, enquanto o site possui rota e controles de
conteúdo adulto: não confunda as duas coisas nem altere filtros silenciosamente.

Os limites conhecidos do arquivador incluem quatro páginas paralelas, espaçamento
de manifesto de 2,5 segundos, upload limitado a 6 MiB/s, reserva de espaço e teto
próprio de tráfego. Esses tetos não medem o uso total da conta Oracle. Preserve
backoff da origem, cotas do Drive e Always Free; não contorne rate limits, não
crie recursos pagos nem aumente concorrência sem medir efeitos no site. A coleta
de arquivo e os backups diários são processos distintos. Um backup pode cobrir
apenas páginas em cache; saúde da cópia exige verificação de execução e, quando
necessário, restauração isolada e conferência dos arquivos.

## Roteiro de melhorias: propostas, não defeitos comprovados

Investigue cada item na interface e no código antes de implementá-lo. Priorize o
pedido do proprietário e apresente opções quando houver decisão visual relevante.

1. **Identidade e navegação:** unificar tipografia, cores, espaçamentos e estados dos componentes; tornar busca, descoberta, biblioteca e continuar lendo fáceis de encontrar, sobretudo no celular. Não mudar a marca sem solicitação.
2. **Página inicial e catálogo:** melhorar hierarquia de seções, legibilidade dos cards e informações úteis (título, capa e atualização); incluir estados claros de carregamento, vazio e erro, sem substituir dados reais.
3. **Busca e filtros:** avaliar clareza de pesquisa, gêneros, ordenação, paginação, retorno sem resultados e manutenção dos filtros ao navegar. Não assumir disponibilidade de campos que a API não expõe.
4. **Página da obra:** conferir capa, título, sinopse, gêneros, informações de origem, ordenação de capítulos e botão para retomar leitura. Tratar capa ausente e capítulo indisponível com orientação clara.
5. **Leitor:** conferir ordem e proporção das páginas, carregamento progressivo, falha individual com tentativa segura, controles acessíveis, navegação entre capítulos, posição e histórico. Testar conexão lenta e telas pequenas. Nunca gerar um pedido à origem por página se um manifesto por capítulo puder ser reutilizado; respeitar o backoff existente e verificar se o módulo local está implantado antes de atribuir comportamento à produção.
6. **Biblioteca e conta:** validar favoritos, histórico, preferências, login e área administrativa conforme permissões reais. Não prometer sincronização entre dispositivos se só houver armazenamento local.
7. **Acessibilidade e desempenho:** contraste, teclado, foco, rótulos de ícones, texto alternativo útil, alvos de toque, responsividade, dimensões estáveis de capa e imagens carregadas sob demanda. Evitar layout quebrado, requisições duplicadas e arquivos pesados.
8. **API própria futura:** projetar separadamente endpoints versionados para obras, capítulos e páginas efetivamente arquivados, paginação, busca, chaves por aplicação, limites, observabilidade, cache, revogação e tratamento de remoção. Avaliar a expiração OAuth, cotas e custos antes de servir vários sites. Validar um CBZ, manifesto, hashes e recuperação antes de anunciar disponibilidade. Não armazenar chaves no front nem abrir o Drive ao público.
9. **Operação:** investigar os itens `retry` por causa e testar amostras antes de qualquer correção ou reprocessamento; avaliar segurança dos backups e plano de recuperação. Não remover dados nem forçar download em massa.

## Verificação para cada alteração de front

1. Registrar o escopo, ler os componentes envolvidos e conferir o diff anterior.
2. Executar `npm ci` apenas se as dependências precisarem ser instaladas; preservar lockfile e configurações existentes. Não substituir `.env` do proprietário.
3. Fazer a menor alteração que atende ao pedido, reutilizando componentes e contratos existentes. Evitar dependência nova quando não for necessária.
4. Executar verificações adequadas: `npm run lint`, `npm run typecheck`, `npm run build`, ou `npm run check` para as três, e `git diff --check`. Distinguir falhas anteriores das introduzidas; informar se ambiente/dependências impediram execução.
5. Abrir o site local no navegador, testar desktop e celular nas telas modificadas e um caminho completo pertinente: busca → obra → capítulo → páginas, sem inferir sucesso apenas do build. Verificar loading, vazio, erro, teclado e texto/capa quebrados. Se depender de backend não disponível localmente, dizer exatamente o que não foi testado.
6. Conferir que histórico, biblioteca, links, controles de conteúdo adulto e dados não foram prejudicados quando afetados pelo escopo. Não usar dados pessoais reais em testes desnecessários.
7. Informar arquivos, mudanças, testes e limitações. Publicação requer reconciliação da versão implantada, escopo autorizado, verificação de saúde e fluxo funcional após o deploy; não usar força em Git nem apagar volumes.

## Fontes e observações

- `docs/PROJECT_HANDOFF.md`, `docs/OPERATIONS.md` e `docs/BACKEND_ARCHITECTURE.md` são úteis, mas podem ser anteriores ao arquivador e às alterações locais.
- No computador do proprietário, a ficha operacional e evidências estão em `C:/Users/lkssi/.codex/project-registry/`; não existem necessariamente em outros computadores e não contêm autorização implícita.
- Este documento não inclui senhas, chaves privadas, tokens nem sessões. Se faltar acesso, solicite apenas a ação necessária e mantenha credenciais fora da conversa.
