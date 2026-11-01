"use strict";

const crypto = require("node:crypto");
const { all, get, run } = require("../database.cjs");
const { evaluateMatch, parseChapterNumber } = require("../matcher.cjs");
const { MangaDexProvider } = require("./mangadex.cjs");
const { ComickProvider } = require("./comick.cjs");
const { MockProvider } = require("./mock.cjs");

const providers = {
  mangadex: new MangaDexProvider(),
  comick: new ComickProvider(),
  mock_provider: new MockProvider(),
};

function getProvider(name) {
  return providers[name] || null;
}

function stableId(prefix, value) {
  const hash = crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
  return `${prefix}-${hash}`;
}

/**
 * Searches and attempts to match a canonical work with a secondary provider.
 */
async function matchWorkWithProvider(work, providerName) {
  const provider = getProvider(providerName);
  if (!provider) throw new Error(`Provedor desconhecido: ${providerName}`);

  // 1. Check existing mapping
  const existing = await get(
    "SELECT * FROM work_external_mappings WHERE work_id = ? AND provider = ?",
    [work.id, providerName],
  );
  if (existing) return existing;

  // 2. Search candidates
  const candidates = await provider.searchWorks(work.title);
  if (!candidates || candidates.length === 0) return null;

  let bestMatch = null;
  for (const candidate of candidates) {
    const evaluation = evaluateMatch(
      {
        title: work.title,
        alternativeTitles: work.alternative_title ? [work.alternative_title] : [],
        year: work.year,
      },
      {
        title: candidate.title,
        alternativeTitles: candidate.alternativeTitles || [],
        year: candidate.year,
      },
    );

    if (evaluation.status === "approved") {
      bestMatch = { candidate, evaluation };
      break;
    } else if (evaluation.status === "candidate" && !bestMatch) {
      bestMatch = { candidate, evaluation };
    }
  }

  if (!bestMatch) return null;

  const mappingId = stableId(
    "mapping",
    `${work.id}:${providerName}:${bestMatch.candidate.externalId}`,
  );
  const status = bestMatch.evaluation.status; // 'approved' or 'candidate'

  await run(
    `INSERT INTO work_external_mappings (
      id, work_id, provider, external_id, external_slug, title,
      match_confidence, match_method, status, details_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider, external_id) DO UPDATE SET
      match_confidence = excluded.match_confidence,
      status = excluded.status,
      updated_at = CURRENT_TIMESTAMP`,
    [
      mappingId,
      work.id,
      providerName,
      bestMatch.candidate.externalId,
      bestMatch.candidate.slug || null,
      bestMatch.candidate.title,
      bestMatch.evaluation.score,
      bestMatch.evaluation.reason,
      status,
      JSON.stringify(bestMatch.evaluation),
    ],
  );

  return get("SELECT * FROM work_external_mappings WHERE id = ?", [mappingId]);
}

/**
 * Syncs chapters for an approved mapping from a secondary provider.
 */
async function syncChaptersFromProvider(work, providerName) {
  const provider = getProvider(providerName);
  if (!provider) throw new Error(`Provedor desconhecido: ${providerName}`);

  const mapping = await get(
    "SELECT * FROM work_external_mappings WHERE work_id = ? AND provider = ? AND status = 'approved'",
    [work.id, providerName],
  );
  if (!mapping) return { imported: 0, skipped: 0, reason: "Nenhum mapeamento aprovado" };

  const remoteChapters = await provider.listChapters(mapping.external_id, { language: "pt-br" });
  if (!remoteChapters || remoteChapters.length === 0) {
    await run(
      `INSERT INTO provider_work_sync_state(work_id, provider, last_checked_at, next_check_at, last_status)
       VALUES (?, ?, CURRENT_TIMESTAMP, datetime('now', '+24 hours'), 'no_chapters')
       ON CONFLICT(work_id, provider) DO UPDATE SET
         last_checked_at = CURRENT_TIMESTAMP,
         next_check_at = datetime('now', '+24 hours'),
         last_status = 'no_chapters',
         updated_at = CURRENT_TIMESTAMP`,
      [work.id, providerName],
    );
    return { imported: 0, skipped: 0 };
  }

  // Get existing chapters for this work
  const existingChapters = await all(
    "SELECT id, external_id, chapter_number, normalized_number, source FROM chapters WHERE work_id = ?",
    [work.id],
  );
  const existingNormalized = new Set(
    existingChapters.map((c) => c.normalized_number || c.chapter_number).filter(Boolean),
  );

  let imported = 0;
  let skipped = 0;

  for (const rc of remoteChapters) {
    const token = parseChapterNumber(rc.chapterNumber);
    const namespacedExternalId = `${providerName}:${rc.externalId}`;

    // If already exists under primary source or with same normalized number, record as skipped or variant
    if (existingNormalized.has(token.normalized)) {
      skipped += 1;
      continue;
    }

    const chapterId = stableId("chapter", namespacedExternalId);
    await run(
      `INSERT INTO chapters (
        id, work_id, source, external_id, chapter_number, volume_number,
        title, language, published_at, scanlation_group,
        normalized_number, raw_number, source_variant
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pt-BR', ?, ?, ?, ?, ?)
      ON CONFLICT(external_id) DO UPDATE SET
        chapter_number = excluded.chapter_number,
        volume_number = excluded.volume_number,
        title = excluded.title,
        scanlation_group = excluded.scanlation_group,
        normalized_number = excluded.normalized_number,
        raw_number = excluded.raw_number,
        updated_at = CURRENT_TIMESTAMP`,
      [
        chapterId,
        work.id,
        providerName,
        namespacedExternalId,
        rc.chapterNumber || null,
        rc.volumeNumber || null,
        rc.title || `Capítulo ${rc.chapterNumber || "?"}`,
        rc.publishedAt || null,
        rc.scanlationGroup || "Grupo não informado",
        token.normalized,
        token.raw,
        rc.scanlationGroup || null,
      ],
    );

    existingNormalized.add(token.normalized);
    imported += 1;
  }

  await run(
    `INSERT INTO provider_work_sync_state(work_id, provider, last_checked_at, next_check_at, last_status)
     VALUES (?, ?, CURRENT_TIMESTAMP, datetime('now', '+7 days'), 'synced')
     ON CONFLICT(work_id, provider) DO UPDATE SET
       last_checked_at = CURRENT_TIMESTAMP,
       next_check_at = datetime('now', '+7 days'),
       last_status = 'synced',
       consecutive_failures = 0,
       last_error = NULL,
       updated_at = CURRENT_TIMESTAMP`,
    [work.id, providerName],
  );

  return { imported, skipped };
}

module.exports = {
  getProvider,
  matchWorkWithProvider,
  providers,
  syncChaptersFromProvider,
};
