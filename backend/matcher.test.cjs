"use strict";

const assert = require("node:assert");
const { evaluateMatch, parseChapterNumber, similarityScore } = require("./matcher.cjs");

console.log("Running Matcher & Chapter Normalization Test Suite...");

// 1. Exact match test
{
  const work = { title: "Sono Bisque Doll wa Koi o Suru", year: 2018 };
  const cand = { title: "Sono Bisque Doll wa Koi o Suru", year: 2018 };
  const res = evaluateMatch(work, cand);
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.status, "approved");
  assert.ok(res.score >= 0.95);
  console.log("✔ Exact canonical title match approved");
}

// 2. Alias match test (Romaji vs English)
{
  const work = {
    title: "Sono Bisque Doll wa Koi o Suru",
    alternative_title: "My Dress-Up Darling",
    year: 2018,
  };
  const cand = {
    title: "My Dress-Up Darling",
    alternative_titles: ["Sono Bisque Doll ha Koi wo Suru"],
    year: 2018,
  };
  const res = evaluateMatch(work, cand);
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.status, "approved");
  assert.ok(res.score >= 0.95);
  console.log("✔ Alias / English title match approved");
}

// 3. Spinoff negative evidence rejection test
{
  const work = { title: "Sono Bisque Doll wa Koi o Suru", year: 2018 };
  const cand = { title: "Sono Bisque Doll wa Koi o Suru - Spinoff Anthology", year: 2021 };
  const res = evaluateMatch(work, cand);
  assert.strictEqual(res.matched, false);
  assert.strictEqual(res.status, "rejected");
  assert.ok(res.reason.includes("evidência negativa"));
  console.log("✔ Spinoff / Side story rejected via negative evidence");
}

// 4. Ambiguous match quarantine test (Score between 0.70 and 0.89)
{
  const work = { title: "Blade of the Phantom Master", year: 2001 };
  const cand = { title: "Blade of the Immortal", year: 1993 };
  const res = evaluateMatch(work, cand);
  assert.strictEqual(res.matched, false);
  // Year divergence should reject or quarantine
  assert.ok(res.status === "rejected" || res.status === "candidate");
  console.log("✔ Ambiguous title correctly rejected/quarantined");
}

// 5. Chapter normalization test
{
  const c1 = parseChapterNumber("01");
  const c2 = parseChapterNumber("1");
  const c3 = parseChapterNumber("Capítulo 1.5");
  const c4 = parseChapterNumber("Prologue");
  const c5 = parseChapterNumber("Extra 2");

  assert.strictEqual(c1.normalized, "1");
  assert.strictEqual(c2.normalized, "1");
  assert.strictEqual(c1.normalized, c2.normalized, "01 e 1 devem ter a mesma string normalizada");

  assert.strictEqual(c3.normalized, "1.5");
  assert.strictEqual(c3.numericValue, 1.5);

  assert.strictEqual(c4.normalized, "prologue");
  assert.strictEqual(c4.isSpecial, true);

  assert.strictEqual(c5.normalized, "extra:2");
  assert.strictEqual(c5.isSpecial, true);

  console.log("✔ Chapter parsing and tokenized normalization verified");
}

console.log("🎉 ALL MATCHER TESTS PASSED!\n");
