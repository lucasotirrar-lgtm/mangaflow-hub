"use strict";

const NEGATIVE_KEYWORDS = [
  "gaiden",
  "spinoff",
  "spin-off",
  "side story",
  "anthology",
  "doujinshi",
  "tribute",
  "reboot",
  "part 2",
  "part ii",
  "season 2",
  "2nd season",
  "after story",
  "prequel",
  "sequel",
];

function normalize(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(the|a|an|o|a|os|as|um|uma)\b/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(text) {
  const norm = normalize(text);
  return norm ? norm.split(/\s+/).filter(Boolean) : [];
}

function diceCoefficient(tokensA, tokensB) {
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  return (2 * intersection) / (setA.size + setB.size);
}

function levenshteinDistance(s1, s2) {
  const a = s1;
  const b = s2;
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

function similarityScore(strA, strB) {
  const normA = normalize(strA);
  const normB = normalize(strB);
  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const tokensA = tokenize(normA);
  const tokensB = tokenize(normB);
  const dice = diceCoefficient(tokensA, tokensB);

  const maxLen = Math.max(normA.length, normB.length);
  const dist = levenshteinDistance(normA, normB);
  const levRatio = 1.0 - dist / maxLen;

  // Weighted combo: 60% Dice on words, 40% Levenshtein ratio on chars
  return 0.6 * dice + 0.4 * levRatio;
}

function hasNegativeEvidence(sourceTitle, candidateTitle) {
  const normSource = normalize(sourceTitle);
  const normCand = normalize(candidateTitle);

  for (const kw of NEGATIVE_KEYWORDS) {
    const kwNorm = normalize(kw);
    // If candidate has negative keyword but source does NOT, flag it as negative evidence
    if (normCand.includes(kwNorm) && !normSource.includes(kwNorm)) {
      return { found: true, keyword: kw };
    }
  }
  return { found: false, keyword: null };
}

/**
 * Match a target work against a candidate from an external provider.
 *
 * @param {Object} sourceWork - Canonical work in MangaFlow DB
 * @param {string} sourceWork.title - Canonical title
 * @param {string} [sourceWork.alternative_title] - Known alternative title
 * @param {Array<string>} [sourceWork.aliases] - All known aliases
 * @param {number} [sourceWork.year] - Release year
 * @param {string} [sourceWork.kind] - Kind ('manga', 'manhwa', etc.)
 *
 * @param {Object} candidate - Candidate work from external provider
 * @param {string} candidate.title - Candidate title
 * @param {Array<string>} [candidate.alternative_titles] - Candidate aliases
 * @param {number} [candidate.year] - Candidate year
 * @param {string} [candidate.kind] - Candidate kind
 *
 * @returns {Object} result - { matched: boolean, status: 'approved'|'candidate'|'rejected', score: number, reason: string }
 */
function evaluateMatch(sourceWork, candidate) {
  // Check negative evidence first (spinoff / sequel / gaiden / side story)
  const neg = hasNegativeEvidence(sourceWork.title, candidate.title);
  if (neg.found) {
    return {
      matched: false,
      status: "rejected",
      score: 0.2,
      reason: `Rejeitado por evidência negativa: candidato contém '${neg.keyword}' ausente na obra canônica`,
    };
  }

  // Gather all titles for comparison
  const sourceTitles = [
    sourceWork.title,
    sourceWork.alternative_title,
    ...(sourceWork.aliases || []),
  ].filter(Boolean);
  const candTitles = [candidate.title, ...(candidate.alternative_titles || [])].filter(Boolean);

  let bestScore = 0.0;
  let bestPair = null;

  for (const sTitle of sourceTitles) {
    for (const cTitle of candTitles) {
      const score = similarityScore(sTitle, cTitle);
      if (score > bestScore) {
        bestScore = score;
        bestPair = { source: sTitle, candidate: cTitle };
      }
    }
  }

  // Year check if both have valid year
  const bothHaveYear = Number.isInteger(sourceWork.year) && Number.isInteger(candidate.year);
  const yearDiff = bothHaveYear ? Math.abs(sourceWork.year - candidate.year) : null;
  const yearMatches = yearDiff !== null && yearDiff <= 1;
  const yearConflict = yearDiff !== null && yearDiff > 2;

  // Severe year conflict downgrades score
  if (yearConflict) {
    return {
      matched: false,
      status: "rejected",
      score: bestScore * 0.5,
      reason: `Rejeitado por divergência de ano (origem: ${sourceWork.year}, candidato: ${candidate.year})`,
    };
  }

  // High confidence exact/alias match
  if (bestScore >= 0.9) {
    return {
      matched: true,
      status: "approved",
      score: Number(bestScore.toFixed(3)),
      reason: `Correspondência de alta confiança (${(bestScore * 100).toFixed(1)}%) entre "${bestPair?.source}" e "${bestPair?.candidate}"`,
    };
  }

  // Good match backed by identical year
  if (bestScore >= 0.8 && yearMatches) {
    return {
      matched: true,
      status: "approved",
      score: Number(bestScore.toFixed(3)),
      reason: `Correspondência confirmada por título (${(bestScore * 100).toFixed(1)}%) e ano idêntico (${sourceWork.year})`,
    };
  }

  // Ambiguous match -> Quarantine as candidate (NEVER auto-import)
  if (bestScore >= 0.7) {
    return {
      matched: false,
      status: "candidate",
      score: Number(bestScore.toFixed(3)),
      reason: `Similaridade moderada (${(bestScore * 100).toFixed(1)}%), mantido em quarentena para aprovação manual`,
    };
  }

  // Low score -> Rejected
  return {
    matched: false,
    status: "rejected",
    score: Number(bestScore.toFixed(3)),
    reason: `Similaridade insuficiente (${(bestScore * 100).toFixed(1)}% < 70%)`,
  };
}

/**
 * Tokenize and normalize chapter representation.
 * Prevents floating point errors and distinguishes extras/prologues/omakes.
 */
function parseChapterNumber(rawInput) {
  if (rawInput === null || rawInput === undefined) {
    return { raw: "", normalized: "", numericValue: null, isSpecial: false };
  }
  const str = String(rawInput).trim();
  if (!str) {
    return { raw: "", normalized: "", numericValue: null, isSpecial: false };
  }

  // Check for common special tokens (prologue, oneshot, extra, omake)
  const lower = str.toLowerCase();
  if (lower.includes("prologo") || lower.includes("prologue")) {
    return { raw: str, normalized: "prologue", numericValue: 0.0, isSpecial: true };
  }
  if (lower.includes("oneshot") || lower.includes("one-shot")) {
    return { raw: str, normalized: "oneshot", numericValue: 0.0, isSpecial: true };
  }
  if (lower.includes("extra") || lower.includes("omake") || lower.includes("especial")) {
    return {
      raw: str,
      normalized: `extra:${lower.replace(/[^0-9.]/g, "") || "1"}`,
      numericValue: null,
      isSpecial: true,
    };
  }

  // Extract clean decimal (e.g. "Capítulo 12.5" -> "12.5")
  const match = str.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return { raw: str, normalized: lower, numericValue: null, isSpecial: true };
  }

  const numPart = match[1];
  // Parse exact numeric value without float corruption
  const numVal = parseFloat(numPart);
  // Normalized string format: remove leading zeros in integer part, preserve decimal part
  const parts = numPart.split(".");
  const integerPart = String(parseInt(parts[0], 10));
  const normalizedStr = parts[1] !== undefined ? `${integerPart}.${parts[1]}` : integerPart;

  return {
    raw: str,
    normalized: normalizedStr,
    numericValue: Number.isFinite(numVal) ? numVal : null,
    isSpecial: false,
  };
}

module.exports = {
  evaluateMatch,
  hasNegativeEvidence,
  normalize,
  parseChapterNumber,
  similarityScore,
  tokenize,
};
