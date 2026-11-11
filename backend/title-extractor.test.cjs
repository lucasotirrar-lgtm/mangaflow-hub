"use strict";

const assert = require("node:assert");
const { extractMangaTitles } = require("./title-extractor.cjs");

console.log("Iniciando testes de extração de títulos de mangás...");

// Caso 1: Manhwa coreano (ko-ro) com título em inglês nos altTitles (Angelica)
const angelica = {
  title: { "ko-ro": "anjelrika uri anaega dalrajossoyo" },
  altTitles: [{ ko: "안젤리카 : 우리 아내가 달라졌어요" }, { en: "Angelica: My Wife Has Changed" }],
};
const res1 = extractMangaTitles(angelica);
assert.strictEqual(
  res1.title,
  "Angelica: My Wife Has Changed",
  "Angelica deve ter o título em inglês como principal",
);
assert.strictEqual(
  res1.alternativeTitle,
  "anjelrika uri anaega dalrajossoyo",
  "Angelica deve ter o título romanizado como alternativo",
);
console.log("✔ Caso 1 (Angelica) aprovado.");

// Caso 2: Manhua chinês (zh-ro) com título em inglês nos altTitles (The Last Gravekeeper)
const gravekeeper = {
  title: { "zh-ro": "Yín Zhī Shǒu Mù Rén" },
  altTitles: [{ zh: "银之守墓人" }, { en: "The Last Gravekeeper" }],
};
const res2 = extractMangaTitles(gravekeeper);
assert.strictEqual(
  res2.title,
  "The Last Gravekeeper",
  "The Last Gravekeeper deve ter o título em inglês como principal",
);
assert.strictEqual(
  res2.alternativeTitle,
  "Yín Zhī Shǒu Mù Rén",
  "The Last Gravekeeper deve ter o título romanizado como alternativo",
);
console.log("✔ Caso 2 (The Last Gravekeeper) aprovado.");

// Caso 3: Manhwa com título romanizado ko-ro em title, sem título em inglês em altTitles (Cheese in the Trap)
const cheese = {
  title: { "ko-ro": "Cheese in the Trap" },
  altTitles: [{ ja: "チーズ・イン・ザ・トラップ" }, { ko: "치즈인더트랩" }],
};
const res3 = extractMangaTitles(cheese);
assert.strictEqual(
  res3.title,
  "Cheese in the Trap",
  "Cheese in the Trap deve usar o título ko-ro e NÃO 'Sem título'",
);
assert.ok(
  res3.alternativeTitle === "チーズ・イン・ザ・トラップ" ||
    res3.alternativeTitle === "치즈인더트랩",
  "Deve ter título alternativo nativo",
);
console.log("✔ Caso 3 (Cheese in the Trap) aprovado.");

// Caso 4: Obra com título em Português nos altTitles
const child = {
  title: { "ko-ro": "Nal Dalmeun Ai" },
  altTitles: [
    { ko: "날 닮은 아이" },
    { en: "A Child Who Looks Like Me" },
    { "pt-br": "Uma Criança Que Se Parece Comigo" },
  ],
};
const res4 = extractMangaTitles(child);
assert.strictEqual(
  res4.title,
  "Uma Criança Que Se Parece Comigo",
  "Deve priorizar título em PT-BR quando disponível",
);
assert.strictEqual(
  res4.alternativeTitle,
  "A Child Who Looks Like Me",
  "Título alternativo deve ser o em inglês",
);
console.log("✔ Caso 4 (Título em Português priorizado) aprovado.");

// Caso 5: Totalmente vazio
const empty = {};
const res5 = extractMangaTitles(empty);
assert.strictEqual(
  res5.title,
  "Sem título",
  "Deve usar 'Sem título' apenas se não houver nenhum título em nenhum idioma",
);
assert.strictEqual(res5.alternativeTitle, null);
console.log("✔ Caso 5 (Totalmente vazio) aprovado.");

console.log("TODOS OS TESTES DE title-extractor.cjs PASSARAM COM SUCESSO!");
