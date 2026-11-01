"use strict";

const assert = require("node:assert");
const { initialize, run, get, all } = require("../database.cjs");
const { getProvider, matchWorkWithProvider, syncChaptersFromProvider } = require("./index.cjs");

async function runTests() {
  console.log("Iniciando testes da arquitetura multiprovedor...");

  await initialize();

  // 1. Verificar registros dos provedores
  const mangadex = getProvider("mangadex");
  assert.ok(mangadex, "Provedor MangaDex deve existir");

  const comick = getProvider("comick");
  assert.ok(comick, "Provedor Comick deve existir");

  const mock = getProvider("mock_provider");
  assert.ok(mock, "Provedor Mock deve existir");
  console.log("✔ Registro de provedores OK.");

  // 2. Inserir uma obra de teste representativa no banco
  const testWorkId = "test-work-sono-bisque";
  await run("DELETE FROM works WHERE id = ?", [testWorkId]);
  await run(
    `INSERT INTO works (id, source, external_id, slug, title, alternative_title, year, language)
     VALUES (?, 'mangadex', 'aa6c76f7-5f5f-46b6-a800-911145f81b9b', 'sono-bisque-doll-wa-koi-o-suru',
             'Sono Bisque Doll wa Koi o Suru', 'My Dress-Up Darling', 2018, 'pt-BR')`,
    [testWorkId],
  );

  // Inserir apenas 1 capítulo existente (como no cenário real)
  await run(
    `INSERT OR REPLACE INTO chapters (id, work_id, source, external_id, chapter_number, normalized_number, language)
     VALUES ('ch-existing-1', ?, 'mangadex', 'md-ch-115-5', '115.5', '115.5', 'pt-BR')`,
    [testWorkId],
  );

  const testWork = await get("SELECT * FROM works WHERE id = ?", [testWorkId]);
  assert.ok(testWork, "Obra de teste deve existir");

  // 3. Testar pareamento com mock_provider
  const mapping = await matchWorkWithProvider(testWork, "mock_provider");
  assert.ok(mapping, "Pareamento com mock_provider deve retornar mapeamento");
  assert.strictEqual(mapping.status, "approved", "Status do pareamento deve ser 'approved'");
  assert.strictEqual(mapping.provider, "mock_provider", "Provider deve ser mock_provider");
  assert.strictEqual(mapping.external_id, "mock-bisque-001");
  console.log("✔ Pareamento automático com múltiplos fatores aprovado.");

  // 4. Testar sincronização e preenchimento de lacunas (backfill)
  const syncResult1 = await syncChaptersFromProvider(testWork, "mock_provider");
  assert.strictEqual(syncResult1.imported, 3, "Deve importar os 3 capítulos ausentes do mock");
  console.log("✔ Backfill de capítulos ausentes concluído:", syncResult1);

  // Verificar capítulos inseridos no banco
  const chapters = await all(
    "SELECT * FROM chapters WHERE work_id = ? ORDER BY CAST(chapter_number AS REAL)",
    [testWorkId],
  );
  assert.strictEqual(chapters.length, 4, "Total deve ser 4 capítulos (1 mangadex + 3 mock)");
  assert.ok(
    chapters.some((c) => c.source === "mangadex" && c.chapter_number === "115.5"),
    "Capítulo original MangaDex deve ser preservado",
  );
  assert.ok(
    chapters.some(
      (c) => c.source === "mock_provider" && c.external_id === "mock_provider:mock-bisque-ch-1",
    ),
    "Capítulo mock deve ter external_id com namespace seguro",
  );
  assert.ok(
    chapters.some((c) => c.normalized_number === "1"),
    "Capítulo deve ter normalized_number correto",
  );

  // 5. Testar idempotência (segunda execução não deve duplicar nem sobrescrever)
  const syncResult2 = await syncChaptersFromProvider(testWork, "mock_provider");
  assert.strictEqual(syncResult2.imported, 0, "Segunda execução não deve importar nada novo");
  assert.strictEqual(syncResult2.skipped, 3, "Capítulos já existentes devem ser ignorados");
  console.log("✔ Idempotência verificada.");

  // 6. Testar resolução de páginas
  const mockChapter = chapters.find((c) => c.source === "mock_provider");
  const pages = await mock.resolvePages(mockChapter);
  assert.ok(Array.isArray(pages), "Páginas devem ser um array");
  assert.ok(pages.length > 0, "Deve conter páginas");
  console.log("✔ Resolução de páginas de provedor secundário OK:", pages);

  // Limpeza dos dados de teste
  await run("DELETE FROM works WHERE id = ?", [testWorkId]);
  console.log("TODOS OS TESTES DA ARQUITETURA MULTIPROVEDOR PASSARAM COM SUCESSO!");
}

runTests().catch((err) => {
  console.error("Falha nos testes:", err);
  process.exit(1);
});
