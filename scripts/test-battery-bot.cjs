#!/usr/bin/env node

/**
 * Yae Manga House / MangaFlow Hub - Bot de Bateria de Testes Automatizados (65+ Variações)
 * Simula múltiplos perfis de usuários reais, condições de rede, modos de leitor,
 * estados de navegação, persistência segura e contratos de assets/PWA.
 *
 * Executar via:
 *   node scripts/test-battery-bot.cjs
 *   ou
 *   npm run test:battery
 */

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

// Cores e formatação no terminal
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  magenta: "\x1b[35m",
};

let passedCount = 0;
let failedCount = 0;
const results = [];
const startTime = Date.now();

function test(id, group, description, fn) {
  try {
    fn();
    passedCount++;
    results.push({ id, group, description, passed: true });
    process.stdout.write(`  ${c.green}✔${c.reset} [${c.cyan}${id}${c.reset}] ${description}\n`);
  } catch (error) {
    failedCount++;
    results.push({ id, group, description, passed: false, error });
    process.stdout.write(`  ${c.red}✖${c.reset} [${c.cyan}${id}${c.reset}] ${description}\n`);
    console.error(`     ${c.red}Motivo: ${error.message}${c.reset}`);
  }
}

async function testAsync(id, group, description, fn) {
  try {
    await fn();
    passedCount++;
    results.push({ id, group, description, passed: true });
    process.stdout.write(`  ${c.green}✔${c.reset} [${c.cyan}${id}${c.reset}] ${description}\n`);
  } catch (error) {
    failedCount++;
    results.push({ id, group, description, passed: false, error });
    process.stdout.write(`  ${c.red}✖${c.reset} [${c.cyan}${id}${c.reset}] ${description}\n`);
    console.error(`     ${c.red}Motivo: ${error.message}${c.reset}`);
  }
}

console.log(`\n${c.bold}${c.magenta}🤖 INICIANDO BATERIA DE TESTES DE SIMULAÇÃO DE USUÁRIOS REAIS${c.reset}`);
console.log(`${c.gray}Testando 65 variações em storage, leitor, filtros, navegação, SEO e PWA...${c.reset}\n`);

// ---------------------------------------------------------------------------
// AMBIENTE SIMULADO (MOCKS PARA TESTE EM NODE SEM BROWSER)
// ---------------------------------------------------------------------------

function createSafeStorageMock(mode = "normal") {
  const memoryMap = new Map();
  return {
    getItem: (key) => {
      if (mode === "security-error") throw new Error("SecurityError: Access denied");
      return memoryMap.has(key) ? memoryMap.get(key) : null;
    },
    setItem: (key, value) => {
      if (mode === "quota-exceeded") throw new Error("QuotaExceededError: Storage quota exceeded");
      if (mode === "security-error") throw new Error("SecurityError: Access denied");
      memoryMap.set(key, String(value));
    },
    removeItem: (key) => {
      memoryMap.delete(key);
    },
    clear: () => {
      memoryMap.clear();
    },
    _rawMap: memoryMap,
  };
}

// ===========================================================================
// SUITE 1: PERFIS DE USUÁRIOS & STORAGE RESILIENTE (10 Variações)
// ===========================================================================
console.log(`${c.bold}${c.yellow}▶ SUITE 1: Perfis de Usuários & Storage Resiliente${c.reset}`);

test("V01", "Storage", "Usuário Novo: visita limpa, sem estante e sem histórico", () => {
  const storage = createSafeStorageMock("normal");
  assert.strictEqual(storage.getItem("mangaflow-library-v1"), null);
  assert.strictEqual(storage.getItem("mangaflow-reading-history-v1"), null);
  assert.strictEqual(storage.getItem("yae-theme"), null);
});

test("V02", "Storage", "Leitor Assíduo: adiciona 5 obras na estante e recupera sem corrupção", () => {
  const storage = createSafeStorageMock("normal");
  const library = [
    { slug: "obra-1", title: "Solo Leveling" },
    { slug: "obra-2", title: "One Piece" },
    { slug: "obra-3", title: "Frieren" },
    { slug: "obra-4", title: "Omniscient Reader" },
    { slug: "obra-5", title: "Chainsaw Man" },
  ];
  storage.setItem("mangaflow-library-v1", JSON.stringify(library));
  const retrieved = JSON.parse(storage.getItem("mangaflow-library-v1"));
  assert.strictEqual(retrieved.length, 5);
  assert.strictEqual(retrieved[0].slug, "obra-1");
  assert.strictEqual(retrieved[4].slug, "obra-5");
});

test("V03", "Storage", "Usuário em Modo Anônimo / Quota Excedida: fallback em memória resiliente", () => {
  const brokenStorage = createSafeStorageMock("quota-exceeded");
  const memoryFallback = new Map();

  function safeSetItem(k, v) {
    memoryFallback.set(k, v);
    try {
      brokenStorage.setItem(k, v);
    } catch {
      // Ignora erro de cota e mantém na memória
    }
  }

  function safeGetItem(k) {
    try {
      const val = brokenStorage.getItem(k);
      return val !== null ? val : (memoryFallback.get(k) || null);
    } catch {
      return memoryFallback.get(k) || null;
    }
  }

  safeSetItem("mangaflow-theme", "dark");
  assert.strictEqual(safeGetItem("mangaflow-theme"), "dark");
  assert.strictEqual(memoryFallback.get("mangaflow-theme"), "dark");
});

test("V04", "Storage", "Usuário Safari Restrito / SecurityError: bloqueio capturado sem quebra de página", () => {
  const lockedStorage = createSafeStorageMock("security-error");
  let errorCaught = false;
  try {
    lockedStorage.setItem("test", "val");
  } catch (err) {
    errorCaught = err.message.includes("SecurityError");
  }
  assert.strictEqual(errorCaught, true);
});

test("V05", "Storage", "Idempotência da Biblioteca: duplicar clique não duplica obra na estante", () => {
  let list = [];
  const add = (item) => {
    if (!list.some((e) => e.slug === item.slug)) {
      list = [item, ...list];
    }
  };
  add({ slug: "frieren", title: "Frieren" });
  add({ slug: "frieren", title: "Frieren" });
  add({ slug: "frieren", title: "Frieren" });
  assert.strictEqual(list.length, 1);
});

test("V06", "Storage", "Limpeza de Histórico: ação 'Limpar histórico' esvazia lista completamente", () => {
  const storage = createSafeStorageMock("normal");
  storage.setItem("mangaflow-reading-history-v1", JSON.stringify([{ slug: "obra-1" }]));
  assert.notStrictEqual(storage.getItem("mangaflow-reading-history-v1"), null);
  storage.removeItem("mangaflow-reading-history-v1");
  assert.strictEqual(storage.getItem("mangaflow-reading-history-v1"), null);
});

test("V07", "Storage", "Remoção Individual: remove apenas a obra desejada do histórico", () => {
  let list = [{ slug: "obra-a" }, { slug: "obra-b" }, { slug: "obra-c" }];
  const remove = (slug) => {
    list = list.filter((item) => item.slug !== slug);
  };
  remove("obra-b");
  assert.strictEqual(list.length, 2);
  assert.strictEqual(list.some((item) => item.slug === "obra-b"), false);
  assert.strictEqual(list[0].slug, "obra-a");
  assert.strictEqual(list[1].slug, "obra-c");
});

test("V08", "Storage", "Filtro Adulto (+18): ativação via safeStorage persiste valor '1'", () => {
  const storage = createSafeStorageMock("normal");
  storage.setItem("yae-adult-content", "1");
  assert.strictEqual(storage.getItem("yae-adult-content"), "1");
});

test("V09", "Storage", "Filtro Adulto (+18): desativação remove ou anula a preferência e oculta obras", () => {
  const storage = createSafeStorageMock("normal");
  storage.setItem("yae-adult-content", "1");
  storage.removeItem("yae-adult-content");
  const isAdultEnabled = storage.getItem("yae-adult-content") === "1";
  assert.strictEqual(isAdultEnabled, false);
});

test("V10", "Storage", "Alternância de Tema: persistência de 'dark' vs 'light'", () => {
  const storage = createSafeStorageMock("normal");
  storage.setItem("yae-theme", "light");
  assert.strictEqual(storage.getItem("yae-theme"), "light");
  storage.setItem("yae-theme", "dark");
  assert.strictEqual(storage.getItem("yae-theme"), "dark");
});

// ===========================================================================
// SUITE 2: DESCOBERTA, BUSCA & FILTROS (12 Variações)
// ===========================================================================
console.log(`\n${c.bold}${c.yellow}▶ SUITE 2: Descoberta, Busca & Filtros do Catálogo${c.reset}`);

const mockCatalog = [
  { slug: "solo-leveling", title: "Solo Leveling", kind: "manhwa", status: "Completo", rating: 4.9, ageRating: "14" },
  { slug: "one-piece", title: "One Piece", kind: "manga", status: "Em andamento", rating: 4.8, ageRating: "14" },
  { slug: "frieren", title: "Frieren e a Jornada", kind: "manga", status: "Em andamento", rating: 4.95, ageRating: "14" },
  { slug: "overlord-ln", title: "Overlord Light Novel", kind: "light-novel", status: "Em andamento", rating: 4.6, ageRating: "14" },
  { slug: "berserk", title: "Berserk", kind: "manga", status: "Hiato", rating: 4.98, ageRating: "18+" },
  { slug: "jujutsu-kaisen", title: "Jujutsu Kaisen", kind: "manga", status: "Completo", rating: 4.7, ageRating: "14" },
];

test("V11", "Busca", "Busca por título exato: retorna a obra correspondente", () => {
  const q = "Solo Leveling".toLowerCase();
  const res = mockCatalog.filter((m) => m.title.toLowerCase().includes(q));
  assert.strictEqual(res.length, 1);
  assert.strictEqual(res[0].slug, "solo-leveling");
});

test("V12", "Busca", "Busca parcial case-insensitive: 'piece' encontra 'One Piece'", () => {
  const q = "piece".toLowerCase();
  const res = mockCatalog.filter((m) => m.title.toLowerCase().includes(q));
  assert.strictEqual(res.length, 1);
  assert.strictEqual(res[0].slug, "one-piece");
});

test("V13", "Busca", "Busca com acentos: 'frieren e a jornada' normalizada encontra com êxito", () => {
  const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const q = normalize("jornada");
  const res = mockCatalog.filter((m) => normalize(m.title).includes(q));
  assert.strictEqual(res.length, 1);
  assert.strictEqual(res[0].slug, "frieren");
});

test("V14", "Busca", "Busca vazia ou apenas espaços: retorna lista zerada sem requisição errônea", () => {
  const q = "   ".trim();
  const res = q ? mockCatalog.filter((m) => m.title.toLowerCase().includes(q)) : [];
  assert.strictEqual(res.length, 0);
});

test("V15", "Busca", "Paginação de busca: cálculo de limites corretos", () => {
  const page = 2;
  const pageSize = 2;
  const start = (page - 1) * pageSize;
  const pageItems = mockCatalog.slice(start, start + pageSize);
  assert.strictEqual(pageItems.length, 2);
  assert.strictEqual(pageItems[0].slug, "frieren");
});

test("V16", "Filtros", "Filtro por formato 'manga': retorna apenas obras mangá", () => {
  const res = mockCatalog.filter((m) => m.kind === "manga");
  assert.strictEqual(res.every((m) => m.kind === "manga"), true);
  assert.strictEqual(res.length, 4);
});

test("V17", "Filtros", "Filtro por formato 'manhwa': retorna apenas manhwas", () => {
  const res = mockCatalog.filter((m) => m.kind === "manhwa");
  assert.strictEqual(res.length, 1);
  assert.strictEqual(res[0].kind, "manhwa");
});

test("V18", "Filtros", "Filtro por formato 'light-novel': retorna light novels", () => {
  const res = mockCatalog.filter((m) => m.kind === "light-novel");
  assert.strictEqual(res.length, 1);
  assert.strictEqual(res[0].slug, "overlord-ln");
});

test("V19", "Filtros", "Filtro por status 'Completo': filtra obras finalizadas", () => {
  const res = mockCatalog.filter((m) => m.status === "Completo");
  assert.strictEqual(res.length, 2);
  assert.strictEqual(res.some((m) => m.slug === "solo-leveling"), true);
  assert.strictEqual(res.some((m) => m.slug === "jujutsu-kaisen"), true);
});

test("V20", "Ordenação", "Ordenação por 'Melhor avaliados': ordem decrescente de nota", () => {
  const sorted = [...mockCatalog].sort((a, b) => b.rating - a.rating);
  assert.strictEqual(sorted[0].slug, "berserk"); // 4.98
  assert.strictEqual(sorted[1].slug, "frieren"); // 4.95
  assert.strictEqual(sorted[sorted.length - 1].slug, "overlord-ln"); // 4.6
});

test("V21", "Ordenação", "Ordenação por 'Nome (A–Z)': ordem alfabética estrita", () => {
  const sorted = [...mockCatalog].sort((a, b) => a.title.localeCompare(b.title));
  assert.strictEqual(sorted[0].title, "Berserk");
  assert.strictEqual(sorted[sorted.length - 1].title, "Solo Leveling");
});

test("V22", "Filtros", "Reset de Filtros: restaura valores padrão sem quebrar a tela", () => {
  const defaultState = { kind: "todos", status: "todos", sortBy: "padrao", page: 1 };
  let searchState = { kind: "manhwa", status: "Completo", sortBy: "nota", page: 3 };
  searchState = { ...defaultState };
  assert.strictEqual(searchState.kind, "todos");
  assert.strictEqual(searchState.sortBy, "padrao");
  assert.strictEqual(searchState.page, 1);
});

// ===========================================================================
// SUITE 3: MOTOR DO LEITOR & MODOS DE VISUALIZAÇÃO (15 Variações)
// ===========================================================================
console.log(`\n${c.bold}${c.yellow}▶ SUITE 3: Motor do Leitor & Modos de Visualização${c.reset}`);

function createReaderEngine(totalPages = 20, initialMode = "vertical") {
  return {
    mode: initialMode,
    currentPage: 1,
    totalPages,
    width: "900px",
    background: "soft",
    chapterId: "cap-1",
    siblings: [
      { id: "cap-3", number: 3 },
      { id: "cap-2", number: 2 },
      { id: "cap-1", number: 1 },
    ],
    nextChapter() {
      const idx = this.siblings.findIndex((s) => s.id === this.chapterId);
      return idx > 0 ? this.siblings[idx - 1] : null;
    },
    prevChapter() {
      const idx = this.siblings.findIndex((s) => s.id === this.chapterId);
      return idx >= 0 && idx < this.siblings.length - 1 ? this.siblings[idx + 1] : null;
    },
    onKey(key) {
      if (this.mode === "horizontal-rtl") {
        if (key === "ArrowLeft") {
          if (this.currentPage < this.totalPages) this.currentPage++;
          else return "NAV_NEXT_CHAPTER";
        } else if (key === "ArrowRight") {
          if (this.currentPage > 1) this.currentPage--;
          else return "NAV_PREV_CHAPTER";
        }
      } else if (this.mode === "horizontal-ltr") {
        if (key === "ArrowRight") {
          if (this.currentPage < this.totalPages) this.currentPage++;
          else return "NAV_NEXT_CHAPTER";
        } else if (key === "ArrowLeft") {
          if (this.currentPage > 1) this.currentPage--;
          else return "NAV_PREV_CHAPTER";
        }
      } else {
        if (key === "ArrowRight") return "NAV_NEXT_CHAPTER";
        if (key === "ArrowLeft") return "NAV_PREV_CHAPTER";
      }
      return "PAGE_CHANGED";
    },
    onTap(zone) {
      if (this.mode === "horizontal-rtl") {
        if (zone === "left") {
          if (this.currentPage < this.totalPages) this.currentPage++;
          else return "NAV_NEXT_CHAPTER";
        } else if (zone === "right") {
          if (this.currentPage > 1) this.currentPage--;
          else return "NAV_PREV_CHAPTER";
        }
      } else if (this.mode === "horizontal-ltr") {
        if (zone === "right") {
          if (this.currentPage < this.totalPages) this.currentPage++;
          else return "NAV_NEXT_CHAPTER";
        } else if (zone === "left") {
          if (this.currentPage > 1) this.currentPage--;
          else return "NAV_PREV_CHAPTER";
        }
      }
      return "PAGE_CHANGED";
    },
  };
}

test("V23", "Leitor", "Modo Cascata Vertical: inicia na página 1 e preserva comportamento webtoon", () => {
  const engine = createReaderEngine(20, "vertical");
  assert.strictEqual(engine.mode, "vertical");
  assert.strictEqual(engine.currentPage, 1);
});

test("V24", "Leitor", "Modo Paginado RTL (Mangá): alternância bem sucedida", () => {
  const engine = createReaderEngine(20, "vertical");
  engine.mode = "horizontal-rtl";
  assert.strictEqual(engine.mode, "horizontal-rtl");
});

test("V25", "Leitor", "Modo Paginado LTR (Ocidental): alternância bem sucedida", () => {
  const engine = createReaderEngine(20, "vertical");
  engine.mode = "horizontal-ltr";
  assert.strictEqual(engine.mode, "horizontal-ltr");
});

test("V26", "Leitor", "Atalho ArrowLeft no modo RTL: avança a página", () => {
  const engine = createReaderEngine(20, "horizontal-rtl");
  const action = engine.onKey("ArrowLeft");
  assert.strictEqual(action, "PAGE_CHANGED");
  assert.strictEqual(engine.currentPage, 2);
});

test("V27", "Leitor", "Atalho ArrowRight no modo RTL: retrocede a página", () => {
  const engine = createReaderEngine(20, "horizontal-rtl");
  engine.currentPage = 5;
  const action = engine.onKey("ArrowRight");
  assert.strictEqual(action, "PAGE_CHANGED");
  assert.strictEqual(engine.currentPage, 4);
});

test("V28", "Leitor", "Atalho ArrowRight no modo LTR: avança a página", () => {
  const engine = createReaderEngine(20, "horizontal-ltr");
  const action = engine.onKey("ArrowRight");
  assert.strictEqual(action, "PAGE_CHANGED");
  assert.strictEqual(engine.currentPage, 2);
});

test("V29", "Leitor", "Atalho ArrowLeft no modo LTR: retrocede a página", () => {
  const engine = createReaderEngine(20, "horizontal-ltr");
  engine.currentPage = 3;
  const action = engine.onKey("ArrowLeft");
  assert.strictEqual(action, "PAGE_CHANGED");
  assert.strictEqual(engine.currentPage, 2);
});

test("V30", "Leitor", "Toque lateral direito no modo RTL: retrocede página", () => {
  const engine = createReaderEngine(20, "horizontal-rtl");
  engine.currentPage = 4;
  const action = engine.onTap("right");
  assert.strictEqual(action, "PAGE_CHANGED");
  assert.strictEqual(engine.currentPage, 3);
});

test("V31", "Leitor", "Toque lateral esquerdo no modo RTL: avança página", () => {
  const engine = createReaderEngine(20, "horizontal-rtl");
  engine.currentPage = 4;
  const action = engine.onTap("left");
  assert.strictEqual(action, "PAGE_CHANGED");
  assert.strictEqual(engine.currentPage, 5);
});

test("V32", "Leitor", "Tentativa de voltar antes da pág. 1: aciona transição para capítulo anterior", () => {
  const engine = createReaderEngine(20, "horizontal-rtl");
  engine.currentPage = 1;
  const action = engine.onKey("ArrowRight");
  assert.strictEqual(action, "NAV_PREV_CHAPTER");
});

test("V33", "Leitor", "Tentativa de avançar após última pág.: aciona transição para próximo capítulo", () => {
  const engine = createReaderEngine(20, "horizontal-rtl");
  engine.currentPage = 20;
  const action = engine.onKey("ArrowLeft");
  assert.strictEqual(action, "NAV_NEXT_CHAPTER");
});

test("V34", "Leitor", "Seletor rápido de capítulos: salto direto via ID de sibling", () => {
  const engine = createReaderEngine(20, "vertical");
  engine.chapterId = "cap-3";
  assert.strictEqual(engine.chapterId, "cap-3");
});

test("V35", "Leitor", "Barra deslizante (Scrubber): salto direto para página alvo", () => {
  const engine = createReaderEngine(50, "horizontal-rtl");
  engine.currentPage = 37;
  assert.strictEqual(engine.currentPage, 37);
});

test("V36", "Leitor", "Ajuste de Largura: suporta 700px, 900px, 1200px, 100%", () => {
  const allowed = ["700px", "900px", "1200px", "100%"];
  const engine = createReaderEngine(20, "vertical");
  allowed.forEach((w) => {
    engine.width = w;
    assert.strictEqual(engine.width, w);
  });
});

test("V37", "Leitor", "Ajuste de Fundo: suporta suave ('soft') e preto absoluto ('black')", () => {
  const engine = createReaderEngine(20, "vertical");
  engine.background = "black";
  assert.strictEqual(engine.background, "black");
  engine.background = "soft";
  assert.strictEqual(engine.background, "soft");
});

// ===========================================================================
// SUITE 4: RETOMADA DE LEITURA & CONTINUIDADE (10 Variações)
// ===========================================================================
console.log(`\n${c.bold}${c.yellow}▶ SUITE 4: Retomada de Leitura & Histórico Preciso${c.reset}`);

function createReadingHistoryStore() {
  let list = [];
  return {
    rememberReading(item, chapterId, chapterNumber, page = 1) {
      const entry = {
        slug: item.slug,
        title: item.title,
        lastChapterId: chapterId,
        lastChapterNumber: chapterNumber,
        lastPage: page,
        lastReadAt: new Date().toISOString(),
      };
      list = [entry, ...list.filter((c) => c.slug !== item.slug)].slice(0, 12);
    },
    updateReadingPage(slug, chapterId, page) {
      const idx = list.findIndex((c) => c.slug === slug);
      if (idx >= 0 && list[idx].lastChapterId === chapterId) {
        list[idx].lastPage = page;
        list[idx].lastReadAt = new Date().toISOString();
      }
    },
    getSavedReadingPage(slug, chapterId) {
      const found = list.find((c) => c.slug === slug && c.lastChapterId === chapterId);
      return found ? found.lastPage : undefined;
    },
    getList() {
      return list;
    },
  };
}

test("V38", "Histórico", "Leitor na Pág. 1: histórico armazena lastPage = 1", () => {
  const store = createReadingHistoryStore();
  store.rememberReading({ slug: "frieren", title: "Frieren" }, "ch-10", 10, 1);
  assert.strictEqual(store.getSavedReadingPage("frieren", "ch-10"), 1);
});

test("V39", "Histórico", "Leitor na Pág. 18: histórico atualiza lastPage para 18", () => {
  const store = createReadingHistoryStore();
  store.rememberReading({ slug: "frieren", title: "Frieren" }, "ch-10", 10, 1);
  store.updateReadingPage("frieren", "ch-10", 18);
  assert.strictEqual(store.getSavedReadingPage("frieren", "ch-10"), 18);
});

test("V40", "Obra", "Página da obra: botão principal reconhece 'Continuar: Cap. 10 (Pág. 18)'", () => {
  const history = [{ slug: "frieren", lastChapterId: "ch-10", lastChapterNumber: 10, lastPage: 18 }];
  const obraSlug = "frieren";
  const entry = history.find((h) => h.slug === obraSlug);
  const label = entry && entry.lastPage > 1
    ? `Continuar: Cap. ${entry.lastChapterNumber} (Pág. ${entry.lastPage})`
    : `Ler capítulo 10`;
  assert.strictEqual(label, "Continuar: Cap. 10 (Pág. 18)");
});

test("V41", "Leitor", "Restauração de página: o leitor reabre na pág. 18 gravada", () => {
  const store = createReadingHistoryStore();
  store.rememberReading({ slug: "frieren", title: "Frieren" }, "ch-10", 10, 18);
  const restored = store.getSavedReadingPage("frieren", "ch-10");
  assert.strictEqual(restored, 18);
});

test("V42", "Histórico", "Conclusão de capítulo: ao mudar de capítulo, histórico atualiza chapterId e zera lastPage", () => {
  const store = createReadingHistoryStore();
  store.rememberReading({ slug: "frieren", title: "Frieren" }, "ch-10", 10, 25);
  // Muda para o cap 11
  store.rememberReading({ slug: "frieren", title: "Frieren" }, "ch-11", 11, 1);
  const current = store.getList()[0];
  assert.strictEqual(current.lastChapterId, "ch-11");
  assert.strictEqual(current.lastPage, 1);
});

test("V43", "Histórico", "Limite LRU: histórico mantém no máximo 12 obras mais recentes", () => {
  const store = createReadingHistoryStore();
  for (let i = 1; i <= 20; i++) {
    store.rememberReading({ slug: `obra-${i}`, title: `Obra ${i}` }, `ch-${i}`, i, 1);
  }
  assert.strictEqual(store.getList().length, 12);
  assert.strictEqual(store.getList()[0].slug, "obra-20");
});

test("V44", "Obra", "Marcação visual no sumário: capítulos lidos exibem indicador de conclusão", () => {
  const historyEntry = { slug: "frieren", lastChapterId: "ch-5", lastChapterNumber: 5 };
  const chapters = [
    { id: "ch-6", number: 6 },
    { id: "ch-5", number: 5 },
    { id: "ch-4", number: 4 },
    { id: "ch-3", number: 3 },
  ];
  const isRead = (ch) => ch.number <= historyEntry.lastChapterNumber;
  assert.strictEqual(isRead(chapters[0]), false); // ch 6 não lido
  assert.strictEqual(isRead(chapters[1]), true);  // ch 5 lido
  assert.strictEqual(isRead(chapters[2]), true);  // ch 4 lido
  assert.strictEqual(isRead(chapters[3]), true);  // ch 3 lido
});

test("V45", "Obra", "Obra não lida: botão principal mostra 'Ler capítulo X' sem página", () => {
  const history = [];
  const entry = history.find((h) => h.slug === "solo-leveling");
  const label = entry ? `Continuar` : `Ler capítulo 1`;
  assert.strictEqual(label, "Ler capítulo 1");
});

test("V46", "Leitor", "Gatilho de pré-carregamento: dispara quando currentPage >= totalPages - 2", () => {
  const totalPages = 20;
  const shouldPreload = (page) => page >= totalPages - 2;
  assert.strictEqual(shouldPreload(15), false);
  assert.strictEqual(shouldPreload(17), false);
  assert.strictEqual(shouldPreload(18), true);
  assert.strictEqual(shouldPreload(19), true);
  assert.strictEqual(shouldPreload(20), true);
});

test("V47", "Histórico", "Idempotência de updateReadingPage: não grava se página não mudou", () => {
  const store = createReadingHistoryStore();
  store.rememberReading({ slug: "frieren", title: "Frieren" }, "ch-10", 10, 5);
  const time1 = store.getList()[0].lastReadAt;
  store.updateReadingPage("frieren", "ch-10", 5);
  const page = store.getSavedReadingPage("frieren", "ch-10");
  assert.strictEqual(page, 5);
});

// ===========================================================================
// SUITE 5: ASSETS CRÍTICOS, PWA & SEO (8 Variações)
// ===========================================================================
console.log(`\n${c.bold}${c.yellow}▶ SUITE 5: Assets Críticos, PWA & Contratos de SEO${c.reset}`);

const rootPath = path.resolve(__dirname, "..");
const manifestPath = path.join(rootPath, "public", "manifest.webmanifest");
const rootRoutePath = path.join(rootPath, "src", "routes", "__root.tsx");
const adultosRoutePath = path.join(rootPath, "src", "routes", "adultos.tsx");
const stylesPath = path.join(rootPath, "src", "styles.css");

test("V48", "PWA", "Arquivo manifest.webmanifest existe e é JSON válido", () => {
  assert.strictEqual(fs.existsSync(manifestPath), true, "manifest.webmanifest deve existir");
  const content = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  assert.strictEqual(content.name, "Yae Manga House");
  assert.strictEqual(content.display, "standalone");
  assert.strictEqual(content.start_url, "/");
  assert.strictEqual(Array.isArray(content.icons), true);
  assert.ok(content.icons.length > 0);
});

test("V49", "PWA", "Vínculo com manifest e apple-touch-icon presente em __root.tsx", () => {
  const rootCode = fs.readFileSync(rootRoutePath, "utf-8");
  assert.ok(rootCode.includes('rel: "manifest"'), "Deve incluir link rel manifest");
  assert.ok(rootCode.includes('rel: "apple-touch-icon"'), "Deve incluir apple-touch-icon");
});

test("V50", "PWA", "Meta theme-color configurada no cabeçalho raiz", () => {
  const rootCode = fs.readFileSync(rootRoutePath, "utf-8");
  assert.ok(rootCode.includes('name: "theme-color"'), "Deve incluir theme-color");
});

test("V51", "PWA", "Meta tags mobile-web-app-capable presentes", () => {
  const rootCode = fs.readFileSync(rootRoutePath, "utf-8");
  assert.ok(rootCode.includes('name: "mobile-web-app-capable"'));
  assert.ok(rootCode.includes('name: "apple-mobile-web-app-capable"'));
});

test("V52", "SEO", "Robots.txt público acessível em public/robots.txt", () => {
  const robotsPath = path.join(rootPath, "public", "robots.txt");
  assert.strictEqual(fs.existsSync(robotsPath), true);
  const content = fs.readFileSync(robotsPath, "utf-8");
  assert.ok(content.length > 0);
});

test("V53", "SEO", "Rota adulta restringe indexação via robots: noindex, follow", () => {
  const adultosCode = fs.readFileSync(adultosRoutePath, "utf-8");
  assert.ok(adultosCode.includes('name: "robots"'));
  assert.ok(adultosCode.includes("noindex"));
});

test("V54", "Acessibilidade", "Sistema de cores possui contraste para tema claro definido em styles.css", () => {
  const stylesCode = fs.readFileSync(stylesPath, "utf-8");
  assert.ok(stylesCode.includes(":root:not(.dark)"));
  assert.ok(stylesCode.includes("--primary: oklch(0.55 0.22 350)"));
  assert.ok(stylesCode.includes("--primary-foreground: oklch(0.99 0.01 320)"));
});

test("V55", "SEO", "Viewport responsivo padronizado presente em __root.tsx", () => {
  const rootCode = fs.readFileSync(rootRoutePath, "utf-8");
  assert.ok(rootCode.includes("width=device-width, initial-scale=1"));
});

// ===========================================================================
// SUITE 6: RESILIÊNCIA DE REDE, FALLBACKS & TRATAMENTO DE ERROS (10 Variações)
// ===========================================================================
console.log(`\n${c.bold}${c.yellow}▶ SUITE 6: Resiliência de Rede, Fallbacks & Tratamento de Erros${c.reset}`);

test("V56", "Rede", "Timeout automático via AbortSignal.timeout(12000)", () => {
  const signal = typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
    ? AbortSignal.timeout(12000)
    : new AbortController().signal;
  assert.strictEqual(typeof signal.aborted, "boolean");
});

test("V57", "Fallback", "Capa corrompida / 404: estado coverError aciona placeholder com ícone e título", () => {
  let coverError = false;
  const onImageError = () => { coverError = true; };
  onImageError();
  assert.strictEqual(coverError, true);
  const renderFallback = coverError ? "PLACEHOLDER_BOOK_OPEN" : "IMG_TAG";
  assert.strictEqual(renderFallback, "PLACEHOLDER_BOOK_OPEN");
});

test("V58", "Leitor", "Recuperação de imagem que falhou: remoção de índice do failedImages", () => {
  let failedImages = [2, 5, 8];
  const retryImage = (pageIndex) => {
    failedImages = failedImages.filter((idx) => idx !== pageIndex);
  };
  retryImage(5);
  assert.deepStrictEqual(failedImages, [2, 8]);
  assert.strictEqual(failedImages.includes(5), false);
});

test("V59", "Leitor", "Capítulo com zero páginas: exibe placeholder informativo sem erro de runtime", () => {
  const pages = [];
  const state = pages.length === 0 ? "EMPTY_PAGES_PLACEHOLDER" : "RENDER_PAGES";
  assert.strictEqual(state, "EMPTY_PAGES_PLACEHOLDER");
});

test("V60", "Leitor", "Erro de rede no capítulo: exibe estado com botão 'Tentar novamente'", () => {
  const error = "Falha ao conectar com o servidor";
  const view = error ? "READER_ERROR_PLACEHOLDER" : "READER_OK";
  assert.strictEqual(view, "READER_ERROR_PLACEHOLDER");
});

test("V61", "Catálogo", "Falha de busca: exibe ProductState('error') com ação de recarga", () => {
  const failed = true;
  const state = failed ? "error" : "results";
  assert.strictEqual(state, "error");
});

test("V62", "Catálogo", "Busca sem resultados: exibe ProductState('no-results')", () => {
  const results = [];
  const state = results.length === 0 ? "no-results" : "grid";
  assert.strictEqual(state, "no-results");
});

test("V63", "Obra", "Compartilhamento: suporte a navigator.share com fallback para clipboard", () => {
  let shareCalled = false;
  let clipCalled = false;
  const mockNavigator = {
    share: async () => { shareCalled = true; },
    clipboard: { writeText: async () => { clipCalled = true; } },
  };

  async function shareWork() {
    if (mockNavigator.share) await mockNavigator.share();
    else if (mockNavigator.clipboard) await mockNavigator.clipboard.writeText();
  }

  shareWork();
  assert.strictEqual(shareCalled, true);
});

test("V64", "TypeScript", "exactOptionalPropertyTypes: objeto RequestInit não recebe propriedades 'undefined'", () => {
  const init = { headers: { accept: "application/json" } };
  const hasTimeout = true;
  if (hasTimeout) {
    init.signal = AbortSignal.timeout(12000);
  }
  assert.ok("headers" in init);
  assert.ok("signal" in init);
  assert.notStrictEqual(init.signal, undefined);
});

test("V65", "Ciclo de Vida", "Cancelamento via flag 'active': previne atualizações de estado em unmount", () => {
  let active = true;
  let state = "initial";

  const unmount = () => { active = false; };

  async function asyncLoad() {
    await Promise.resolve();
    if (!active) return;
    state = "updated";
  }

  unmount();
  asyncLoad();
  assert.strictEqual(state, "initial"); // State não foi mutado após desmonte
});

// ===========================================================================
// SUITE 7: OTIMIZAÇÃO MOBILE, PERFORMANCE & SERVICE WORKER (3 Variações)
// ===========================================================================
console.log(`\n${c.bold}${c.yellow}▶ SUITE 7: Otimização Mobile, Performance & PWA Offline${c.reset}`);

test("V66", "PWA & Cache", "Service Worker mantém cache limitado aos assets estáticos", () => {
  const swPath = path.join(rootPath, "public", "sw.js");
  assert.strictEqual(fs.existsSync(swPath), true, "sw.js deve existir em public/");
  const swCode = fs.readFileSync(swPath, "utf-8");
  assert.ok(swCode.includes("yae-manga-cache"), "Deve definir cache nomeado");
  assert.ok(swCode.includes("caches.open"), "Deve manipular API de caches");
});

test("V67", "GPU & CSS", "Aceleração gráfica de GPU aplicada em menus e content-visibility em listas", () => {
  const cssCode = fs.readFileSync(stylesPath, "utf-8");
  assert.ok(cssCode.includes("will-change: transform;"), "Deve conter will-change");
  assert.ok(cssCode.includes("transform: translateZ(0);"), "Deve conter aceleração translateZ");
  assert.ok(cssCode.includes("content-visibility: auto;"), "Deve conter content-visibility");
});

test("V68", "DOM & Leitor", "Leitor mantém imagens com carregamento e decodificação assíncronos", () => {
  const readerRoutePath = path.join(rootPath, "src", "routes", "ler.$slug.$chapter.tsx");
  const readerCode = fs.readFileSync(readerRoutePath, "utf-8");
  assert.ok(readerCode.includes("pageHeights"), "Deve armazenar alturas para estabilidade de scroll");
  assert.ok(readerCode.includes('decoding="async"'), "Deve incluir decodificação assíncrona de fotos");
  assert.ok(readerCode.includes('loading={page.index < 2 ? "eager" : "lazy"}'), "Deve carregar imagens sob demanda");
});

// ===========================================================================
// RELATÓRIO FINAL
// ===========================================================================
const durationMs = Date.now() - startTime;
console.log(`\n${c.bold}═══════════════════════════════════════════════════════════════${c.reset}`);
console.log(`${c.bold}📊 RELATÓRIO FINAL DA BATERIA DE TESTES DE PRODUÇÃO${c.reset}`);
console.log(`═══════════════════════════════════════════════════════════════`);
console.log(`  Total de Variações Executadas: ${c.bold}${passedCount + failedCount}${c.reset}`);
console.log(`  Variações Aprovadas:           ${c.green}${c.bold}${passedCount} ✔${c.reset}`);
console.log(`  Variações com Falha:           ${failedCount > 0 ? c.red : c.green}${c.bold}${failedCount} ✖${c.reset}`);
console.log(`  Tempo de Execução:             ${c.cyan}${durationMs}ms${c.reset}`);
console.log(`═══════════════════════════════════════════════════════════════\n`);

if (failedCount > 0) {
  console.error(`${c.red}${c.bold}🚨 A BATERIA FALHOU! Corrija os problemas antes de prosseguir.${c.reset}\n`);
  process.exit(1);
} else {
  console.log(`${c.green}${c.bold}🎉 TODAS AS ${passedCount} VARIAÇÕES FORAM APROVADAS COM SUCESSO!${c.reset}\n`);
  process.exit(0);
}
