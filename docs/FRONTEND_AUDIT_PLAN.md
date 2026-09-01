# Auditoria e plano do frontend — MangaFlow

Data da auditoria: 2026-09-01  
Estado: **planejado; nenhuma correcao deste documento foi aplicada ainda**.

## Escopo e metodo

Foram revisados o frontend versionado, o contrato atual da API e os fluxos publicos em `https://manga.vexclaud.site`: inicio, catalogo, filtros, paginacao, busca, pagina de obra e leitor. A verificacao foi somente de leitura, sem alterar dados, infraestrutura ou producao.

## Resultado executivo

O catalogo base carrega e sua paginacao simples funciona, mas os filtros sao aplicados apenas nos itens da pagina que ja chegaram ao navegador. Assim, o total, o numero de paginas e os resultados apos trocar de pagina ficam incorretos. Este e o primeiro bloqueador a corrigir.

Ha tambem um bloqueador de leitura: a obra `Air Gear` lista capitulos, mas o endpoint de paginas do capitulo testado devolve HTTP 503 e o leitor mostra "Catalogo indisponivel (503)". O frontend deve tratar a falha corretamente, mas a causa operacional/API precisa ser corrigida para que as paginas possam ser lidas.

## Evidencias verificadas em producao

| Fluxo | Resultado observado |
| --- | --- |
| Catalogo publico | 10.300 obras; 48 itens por pagina; pagina 1 de 215; ultima pagina com 28 itens. |
| Filtro `Formato = manhwa` | Pagina 1 mostrou 2 itens, mas manteve `10.300 no catalogo` e `1 de 215`; na pagina 2 mostrou 13 itens e continuou `2 de 215`. O filtro e local e invalida a paginacao. |
| Largura movel 390 px | Sem overflow horizontal da pagina; a barra de filtros rola horizontalmente e a navegacao inferior aparece. |
| Busca `air gear` | Retornou 1 resultado. A interface promete pesquisar generos, mas a API atual pesquisa somente titulo/titulo alternativo. |
| Obra `Air Gear` | Carregou, mostrou os capitulos e ofereceu "Carregar mais capitulos". O botao de biblioteca esta desabilitado. |
| Leitor do capitulo 358 | Metadados do capitulo respondem 200, porem `/api/v1/chapters/{id}/pages` respondeu 503; o leitor nao exibiu paginas. |
| Limite da API | Uma solicitacao `limit=49` retornou `limit=48`; o teto e 48. |

## Problemas encontrados

### P0 — bloqueiam uso correto

1. **Filtros e paginacao incoerentes.**
   - Arquivos: `src/components/catalog-page.tsx`, `src/services/catalog-service.ts`.
   - Causa: formato, classificacao e status sao filtrados no navegador depois da API devolver somente uma pagina; o `total` e calculado antes do filtro.
   - Impacto: paginas vazias/erradas, contador enganoso e impossibilidade de percorrer todos os resultados filtrados.

2. **Leitura indisponivel para capitulos cujo endpoint de paginas retorna 503.**
   - Arquivo de interface: `src/routes/ler.$slug.$chapter.tsx`.
   - O frontend apenas reflete a indisponibilidade. A implementacao deve identificar o tipo da falha, permitir tentar novamente e nunca confundir uma pagina vazia com uma obra sem capitulos. A correcao definitiva exige investigar o backend/worker que materializa ou serve as paginas.

3. **Conteudo adulto nao esta realmente protegido.**
   - `useAgeGate` executa a acao diretamente. A tela afirma que o conteudo e protegido, mas nao ha confirmacao efetiva no cliente nem garantia do servidor. Isto deve ser tratado como requisito de produto e seguranca, nao como mero detalhe visual.

### P1 — experiencia, consistencia e recuperacao de erro

4. A paginacao nao mostra intervalo (por exemplo, 49–96 de 1.296), botoes de paginas proximas, salto direto, seletor de itens por pagina nem estado na URL. Atualizar/recarregar perde filtros e pagina.
5. A busca nao tem paginacao e nao passa a preferencia de conteudo adulto. Tambem nao mostra estado de erro se a requisicao falha.
6. O texto da busca promete generos, mas o contrato atual nao pesquisa por genero. Deve-se implementar a busca no servidor ou corrigir o texto.
7. O botao "Adicionar a biblioteca" no card parece ativo mas nao possui acao; na pagina de obra esta desabilitado. O comportamento deve ser unico: autenticar, salvar, confirmar e atualizar a interface, ou ficar claramente indisponivel ate a funcao existir.
8. A pagina de obra e o leitor silenciam falhas de "Carregar mais"; falta tentativa novamente e mensagem contextual.
9. O leitor pode manter estado antigo quando muda de capitulo e nao tem navegacao para capitulo anterior/proximo, falha de imagem por pagina ou preferencias funcionais.
10. Biblioteca, favoritos, historico, notificacoes, configuracoes e parte de perfil/admin usam contagens e dados de demonstracao/placeholder. O usuario ve telas prontas, mas as acoes nao persistem.

### P2 — qualidade e manutencao

11. O catalogo inicial da home usa somente uma pequena amostra carregada; faltam curadoria, criterio de ordenacao declarado e acesso a mais itens.
12. A classificacao `manhua` e serializada pela API como `manga`; os filtros e facetas precisam deixar a agregacao explicita. No recorte publico da auditoria havia 8.400 manga, 1.296 manhwa e 604 manhua; na interface, "Mangá" deve representar 9.004 se essa for a regra de produto.
13. Ha CSS legado de paginacao que nao e usado pelo componente atual. Remover somente depois de substituir a paginacao e cobrir o fluxo com testes.
14. Nao ha cobertura automatizada especifica para contrato de filtros, limites, restauracao por URL e leitura com falha 503.

## Plano de execucao proposto

### Fase 1 — contrato de catalogo e correcao P0/P1

1. Estender `GET /api/v1/catalog` com filtros aplicados no banco: `kind`, `status`, `age`, busca e ordenacao; retornar `results`, `page`, `limit`, `total` e facetas opcionais calculadas com o mesmo escopo.
2. Definir limites seguros de pagina no servidor. Manter 48 como padrao; oferecer somente opcoes aprovadas (24, 48 e 60, por exemplo) e um teto duro para evitar carga excessiva na Oracle Always Free.
3. Alterar `CatalogPage` para enviar todos os filtros a API, cancelar a requisicao anterior em mudanca rapida, normalizar pagina fora do intervalo e refletir estado em query string.
4. Substituir a navegacao atual por controles acessiveis: primeiro/anterior, paginas proximas, proximo/ultimo, campo ou seletor de salto, itens por pagina, intervalo exibido e reset de filtros.
5. Implementar estados de carregamento, vazio e erro coerentes sem apagar os resultados ja visiveis durante uma troca de pagina.

**Criterios de aceite:** um filtro `manhwa` deve retornar total e paginas baseados apenas em manhwa; voltar/avancar/recarregar preserva a URL; a ultima pagina tem a quantidade correta; nenhuma pagina filtrada mostra itens de outro formato.

### Fase 2 — busca, obra e leitor

1. Paginar a busca no servidor e alinhar a promessa da UI (titulo, alternativo e, se aprovado, genero). Reutilizar os mesmos filtros de idade.
2. Investigar o 503 de paginas no backend/worker com logs e a origem do capitulo; corrigir a disponibilidade antes de declarar leitura funcional.
3. No frontend, classificar 404, 429, 5xx e rede, adicionar "Tentar novamente" e registrar contexto tecnico sem dados sensiveis.
4. Fazer o leitor limpar/cancelar estado ao trocar de rota, tratar erro por imagem e incluir anterior/proximo quando os metadados permitirem.
5. Unificar "biblioteca" em todos os lugares, ligada ao usuario autenticado e com feedback de sucesso/erro.

**Criterios de aceite:** um capitulo com paginas disponiveis le todas as paginas; um 503 mostra acao de nova tentativa sem tela enganosa; a navegacao entre capitulos nao exibe imagens/titulo antigos.

### Fase 3 — conta e acabamento de produto

1. Substituir dados de demonstracao por entidades reais de biblioteca, favoritos, historico, notificacoes e preferencias, com migracao e RLS no Supabase se necessario.
2. Implementar confirmacao de idade no cliente e validacao obrigatoria no servidor; revisar a copia enquanto a protecao nao estiver pronta.
3. Melhorar descoberta/home, datas legiveis em PT-BR, acessibilidade de foco, semantica de links e responsividade visual.
4. Remover codigo/CSS obsoleto apenas apos cobertura de testes.

## Testes obrigatorios antes de publicar

- Unitarios do construtor de query e normalizacao de pagina/facetas.
- Integracao da API para cada filtro, combinacoes, limite maximo, pagina fora da faixa e conteudo adulto.
- Fluxo de navegador desktop e 390 px: catalogo sem filtro, filtro `manhwa`, troca de itens por pagina, URL compartilhavel, busca, obra e leitor.
- Regressao de erro: API 503, imagem quebrada, rede lenta e troca rapida de filtros/capitulos.
- `npm run check`, build de producao e verificacao no dominio publico apos deploy. Nenhum recurso Oracle novo sera criado; a mudanca deve caber nos servicos Always Free existentes.

## Ordem recomendada e limite de escopo

Comecar pela Fase 1. Ela resolve diretamente paginacao e quantidade de titulos por pagina sem mascarar o problema no navegador. Em seguida tratar o 503 de leitura como incidente separado, porque um ajuste visual nao pode fabricar paginas que a API nao entrega. As Fases 2 e 3 so devem entrar depois de os criterios de aceite da fase anterior estarem validados em producao.

