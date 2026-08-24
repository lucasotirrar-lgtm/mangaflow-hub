require("dotenv").config();
const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const express = require("express");
const { all, dataDir, get, initialize, run } = require("./database.cjs");
const { fetchMangaDex } = require("./mangadex-client.cjs");

const app = express();
const port = Number(process.env.PORT || 3100);
const adminToken = process.env.MANGAFLOW_ADMIN_TOKEN || "";
const maxAssetBytes = Number(process.env.MANGAFLOW_MAX_ASSET_BYTES || 25 * 1024 * 1024);
const assetLimitBytes = Number(process.env.MANGAFLOW_ASSET_LIMIT_BYTES || 60 * 1024 * 1024 * 1024);
const minimumFreeBytes = Number(
  process.env.MANGAFLOW_MINIMUM_FREE_BYTES || 25 * 1024 * 1024 * 1024,
);
const warningFreeBytes = Number(
  process.env.MANGAFLOW_WARNING_FREE_BYTES || 35 * 1024 * 1024 * 1024,
);
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const allowedHosts = new Set([
  "uploads.mangadex.org",
  "s4.anilist.co",
  "api.mangadex.org",
  "cdn.readdetectiveconan.com",
]);
const inFlightJobs = new Map();
const inFlightAssets = new Map();

app.disable("x-powered-by");
app.use((req, res, next) => {
  const origin = req.get("origin") || "";
  if (/^https:\/\/[^/]+\.vercel\.app$/i.test(origin) || origin === "https://manga.vexclaud.site") {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
  res.set({
    "Content-Security-Policy":
      "default-src 'none'; img-src 'self'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  });
  next();
});

const nowId = () => crypto.randomUUID();
const stableId = (source, externalId) =>
  crypto.createHash("sha256").update(`${source}:${externalId}`).digest("hex").slice(0, 32);
const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const slugFor = (source, externalId, title) =>
  `${normalize(title).slice(0, 80)}--${source}--${externalId}`.replace(/[^a-z0-9-]/g, "-");
const localizedValue = (values, languages, fallback = "") => {
  for (const language of languages) {
    if (values?.[language]) return { value: values[language], language };
  }
  return { value: fallback, language: null };
};

const genreTranslations = new Map(
  Object.entries({
    Action: "Ação",
    Adventure: "Aventura",
    Comedy: "Comédia",
    Drama: "Drama",
    Fantasy: "Fantasia",
    Horror: "Terror",
    Mystery: "Mistério",
    Romance: "Romance",
    "Sci-Fi": "Ficção científica",
    "Slice of Life": "Cotidiano",
    Sports: "Esportes",
    Supernatural: "Sobrenatural",
    Thriller: "Suspense",
    Tragedy: "Tragédia",
    Historical: "Histórico",
    Medical: "Médico",
    Military: "Militar",
    Music: "Música",
    Philosophical: "Filosófico",
    Psychological: "Psicológico",
    School: "Escolar",
    Survival: "Sobrevivência",
    Crime: "Crime",
    Cooking: "Culinária",
    "Martial Arts": "Artes marciais",
    "Boys' Love": "Boys Love",
    "Girls' Love": "Girls Love",
    Isekai: "Isekai",
    Mecha: "Mecha",
    Samurai: "Samurai",
    Ninja: "Ninja",
    Vampires: "Vampiros",
    Zombies: "Zumbis",
  }),
);

function localizedGenre(values) {
  const portuguese = localizedValue(values, ["pt-br", "pt"]);
  if (portuguese.value) return portuguese.value;
  return genreTranslations.get(values?.en) || "";
}

async function singleFlight(key, task) {
  if (inFlightJobs.has(key)) return inFlightJobs.get(key);
  const promise = Promise.resolve()
    .then(task)
    .finally(() => inFlightJobs.delete(key));
  inFlightJobs.set(key, promise);
  return promise;
}

function isAllowedSource(url) {
  try {
    const value = new URL(url);
    return (
      value.protocol === "https:" &&
      (allowedHosts.has(value.hostname) || value.hostname.endsWith(".mangadex.network"))
    );
  } catch {
    return false;
  }
}

async function diskIsSafe() {
  const [assets, stat] = await Promise.all([
    all("SELECT COALESCE(SUM(byte_size), 0) AS bytes FROM assets WHERE status = 'available'"),
    fsp.statfs(dataDir),
  ]);
  const free = Number(stat.bavail) * Number(stat.bsize);
  return Number(assets[0].bytes) < assetLimitBytes && free >= minimumFreeBytes;
}

function imageExtension(mime) {
  return (
    { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" }[mime] ||
    "bin"
  );
}

async function storeAssetOnce({
  workId = null,
  chapterId = null,
  kind,
  pageIndex = null,
  sourceUrl,
}) {
  if (!isAllowedSource(sourceUrl))
    throw Object.assign(new Error("Origem de imagem não autorizada"), { status: 400 });
  const existing = await get(
    chapterId
      ? "SELECT * FROM assets WHERE chapter_id = ? AND asset_kind = ? AND page_index = ?"
      : "SELECT * FROM assets WHERE work_id = ? AND asset_kind = ?",
    chapterId ? [chapterId, kind, pageIndex] : [workId, kind],
  );
  if (
    existing?.status === "available" &&
    existing.internal_path &&
    fs.existsSync(existing.internal_path)
  )
    return existing;
  if (!(await diskIsSafe()))
    throw Object.assign(new Error("Armazenamento de imagens atingiu o limite seguro"), {
      status: 507,
    });

  const response = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(20_000),
    headers: { "user-agent": "MangaFlow pessoal/1.0" },
  });
  if (!response.ok || !response.body)
    throw Object.assign(new Error(`Imagem indisponível (${response.status})`), { status: 502 });
  const mime = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (!allowedImageTypes.has(mime) || (contentLength && contentLength > maxAssetBytes)) {
    throw Object.assign(new Error("Formato ou tamanho de imagem inválido"), { status: 415 });
  }
  const id = existing?.id || nowId();
  const tempPath = path.join(dataDir, "assets", `${id}.tmp`);
  const handle = await fsp.open(tempPath, "w");
  const hash = crypto.createHash("sha256");
  let bytes = 0;
  try {
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > maxAssetBytes)
        throw Object.assign(new Error("Imagem excede o limite"), { status: 413 });
      hash.update(chunk);
      await handle.write(chunk);
    }
  } catch (error) {
    await fsp.unlink(tempPath).catch(() => {});
    throw error;
  } finally {
    await handle.close();
  }
  const sha = hash.digest("hex");
  const duplicate = await get("SELECT * FROM assets WHERE sha256 = ? AND status = ?", [
    sha,
    "available",
  ]);
  if (duplicate?.internal_path && fs.existsSync(duplicate.internal_path)) {
    await fsp.unlink(tempPath).catch(() => {});
    await run(
      `INSERT INTO assets (id, work_id, chapter_id, asset_kind, page_index, source_url, internal_path, mime_type, byte_size, sha256, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')
       ON CONFLICT(id) DO UPDATE SET source_url=excluded.source_url, internal_path=excluded.internal_path, mime_type=excluded.mime_type, byte_size=excluded.byte_size, sha256=excluded.sha256, status='available', updated_at=CURRENT_TIMESTAMP`,
      [
        id,
        workId,
        chapterId,
        kind,
        pageIndex,
        sourceUrl,
        duplicate.internal_path,
        duplicate.mime_type,
        duplicate.byte_size,
        // sha256 is unique in the initial schema. Keep the per-work/page mapping
        // without duplicating its physical file record.
        null,
      ],
    );
  } else {
    const finalPath = path.join(dataDir, "assets", `${sha}.${imageExtension(mime)}`);
    await fsp.rename(tempPath, finalPath);
    await run(
      `INSERT INTO assets (id, work_id, chapter_id, asset_kind, page_index, source_url, internal_path, mime_type, byte_size, sha256, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')
       ON CONFLICT(id) DO UPDATE SET source_url=excluded.source_url, internal_path=excluded.internal_path, mime_type=excluded.mime_type, byte_size=excluded.byte_size, sha256=excluded.sha256, status='available', updated_at=CURRENT_TIMESTAMP`,
      [id, workId, chapterId, kind, pageIndex, sourceUrl, finalPath, mime, bytes, sha],
    );
  }
  return get("SELECT * FROM assets WHERE id = ?", [id]);
}

async function storeAsset(options) {
  const key = options.chapterId
    ? `chapter:${options.chapterId}:${options.pageIndex}`
    : `work:${options.workId}:${options.kind}`;
  if (inFlightAssets.has(key)) return inFlightAssets.get(key);
  const promise = storeAssetOnce(options).finally(() => inFlightAssets.delete(key));
  inFlightAssets.set(key, promise);
  return promise;
}

async function upsertMangaDex(item) {
  const attrs = item.attributes || {};
  const cover = (item.relationships || []).find((relation) => relation.type === "cover_art")
    ?.attributes?.fileName;
  const id = stableId("mangadex", item.id);
  const providerUpdatedAt = attrs.updatedAt || null;
  const existing = await get("SELECT provider_updated_at FROM works WHERE id = ?", [id]);
  if (
    existing?.provider_updated_at &&
    providerUpdatedAt &&
    existing.provider_updated_at >= providerUpdatedAt
  ) {
    return { work: await get("SELECT * FROM works WHERE id = ?", [id]), changed: false };
  }
  const titleResult = localizedValue(attrs.title, ["pt-br", "pt", "en", "ja-ro"], "Sem título");
  const synopsisResult = localizedValue(
    attrs.description,
    ["pt-br", "pt"],
    "Sinopse indisponível em português.",
  );
  const title = titleResult.value;
  const adult = ["erotica", "pornographic"].includes(attrs.contentRating) ? 1 : 0;
  const kind =
    attrs.originalLanguage === "ko"
      ? "manhwa"
      : attrs.originalLanguage === "zh"
        ? "manhua"
        : "manga";
  const status =
    attrs.status === "completed"
      ? "Completo"
      : attrs.status === "hiatus"
        ? "Hiato"
        : "Em andamento";
  await run(
    `INSERT INTO works
      (id, source, external_id, slug, title, alternative_title, synopsis, cover_source_url,
       kind, status, year, language, genres_json, is_adult, provider_updated_at,
       title_language, synopsis_language)
     VALUES (?, 'mangadex', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pt-BR', ?, ?, ?, ?, ?)
     ON CONFLICT(source, external_id) DO UPDATE SET title=excluded.title,
       alternative_title=excluded.alternative_title, synopsis=excluded.synopsis,
       cover_source_url=excluded.cover_source_url, kind=excluded.kind, status=excluded.status,
       year=excluded.year, genres_json=excluded.genres_json, is_adult=excluded.is_adult,
       provider_updated_at=excluded.provider_updated_at, title_language=excluded.title_language,
       synopsis_language=excluded.synopsis_language, updated_at=CURRENT_TIMESTAMP`,
    [
      id,
      item.id,
      slugFor("mangadex", item.id, title),
      title,
      (attrs.altTitles || [])
        .map((value) => localizedValue(value, ["pt-br", "pt", "en", "ja-ro"]).value)
        .find(Boolean) || null,
      synopsisResult.value,
      cover ? `https://uploads.mangadex.org/covers/${item.id}/${cover}` : null,
      kind,
      status,
      attrs.year || null,
      JSON.stringify(
        (attrs.tags || []).map((tag) => localizedGenre(tag.attributes?.name)).filter(Boolean),
      ),
      adult,
      providerUpdatedAt,
      titleResult.language,
      synopsisResult.language,
    ],
  );
  await run(
    `INSERT OR IGNORE INTO work_sync_state(work_id, next_check_at)
     VALUES (?, CURRENT_TIMESTAMP)`,
    [id],
  );
  return { work: await get("SELECT * FROM works WHERE id = ?", [id]), changed: true };
}

async function readSyncCursor(lane, mode = "incremental") {
  return (
    (await get("SELECT * FROM sync_cursors WHERE provider='mangadex' AND lane=? AND mode=?", [
      lane,
      mode,
    ])) || {
      offset: 0,
      high_water_mark: null,
      provider_total: 0,
      last_full_at: null,
      updated_at: null,
    }
  );
}

async function writeSyncCursor({
  lane,
  mode,
  offset = 0,
  highWaterMark = null,
  providerTotal = 0,
  lastFullAt = null,
}) {
  await run(
    `INSERT INTO sync_cursors
      (provider, lane, mode, offset, high_water_mark, provider_total, last_full_at)
     VALUES ('mangadex', ?, ?, ?, ?, ?, ?)
     ON CONFLICT(provider, lane, mode) DO UPDATE SET offset=excluded.offset,
       high_water_mark=COALESCE(excluded.high_water_mark, sync_cursors.high_water_mark),
       provider_total=excluded.provider_total,
       last_full_at=COALESCE(excluded.last_full_at, sync_cursors.last_full_at),
       updated_at=CURRENT_TIMESTAMP`,
    [lane, mode, offset, highWaterMark, providerTotal, lastFullAt],
  );
}

async function finishSyncRun(runId, status, stats, error = null) {
  await run(
    `UPDATE sync_runs SET status=?, imported_count=?, examined_count=?, changed_count=?,
       request_count=?, duration_ms=?, error=?, finished_at=CURRENT_TIMESTAMP WHERE id=?`,
    [
      status,
      stats.changed,
      stats.examined,
      stats.changed,
      stats.requests,
      Date.now() - stats.startedAt,
      error ? String(error.message || error).slice(0, 1000) : null,
      runId,
    ],
  );
  await run("DELETE FROM sync_runs WHERE started_at < datetime('now', '-30 days')");
}

function catalogRatings(adult, mode) {
  if (mode === "full") {
    return adult
      ? [
          { lane: "adult-erotica", ratings: ["erotica"] },
          { lane: "adult-pornographic", ratings: ["pornographic"] },
        ]
      : [
          { lane: "public-safe", ratings: ["safe"] },
          { lane: "public-suggestive", ratings: ["suggestive"] },
        ];
  }
  return [
    {
      lane: adult ? "adult" : "public",
      ratings: adult ? ["erotica", "pornographic"] : ["safe", "suggestive"],
    },
  ];
}

async function syncCatalogUnsafe({ adult = false, mode = "incremental" } = {}) {
  const runId = nowId();
  const provider = adult ? "mangadex-adult" : "mangadex";
  const jobType = mode === "full" ? "catalog_full" : "catalog_incremental";
  const stats = { startedAt: Date.now(), examined: 0, changed: 0, requests: 0 };
  await run("INSERT INTO sync_runs (id, status, provider, job_type) VALUES (?, 'running', ?, ?)", [
    runId,
    provider,
    jobType,
  ]);
  try {
    const pageLimit = 100;
    let newestHighWaterMark = null;
    let providerTotal = 0;
    for (const laneConfig of catalogRatings(adult, mode)) {
      const cursor = await readSyncCursor(laneConfig.lane, mode);
      const previousHighWaterMark = cursor.high_water_mark;
      let offset = mode === "full" ? Number(cursor.offset || 0) : 0;
      let reachedHighWaterMark = false;
      let completed = false;
      let pages = 0;
      while (!completed && pages < (mode === "full" ? 100 : 20)) {
        const params = new URLSearchParams({
          limit: String(pageLimit),
          offset: String(offset),
          "order[updatedAt]": "desc",
        });
        params.append("includes[]", "cover_art");
        params.append("availableTranslatedLanguage[]", "pt-br");
        for (const rating of laneConfig.ratings) params.append("contentRating[]", rating);
        const response = await fetchMangaDex(`/manga?${params}`, { stats });
        const payload = await response.json();
        const items = payload.data || [];
        providerTotal += Number(payload.total || 0);
        stats.examined += items.length;
        for (const item of items) {
          const itemUpdatedAt = item.attributes?.updatedAt || null;
          if (!newestHighWaterMark || (itemUpdatedAt && itemUpdatedAt > newestHighWaterMark)) {
            newestHighWaterMark = itemUpdatedAt;
          }
          if (
            mode === "incremental" &&
            previousHighWaterMark &&
            itemUpdatedAt &&
            itemUpdatedAt <= previousHighWaterMark
          ) {
            reachedHighWaterMark = true;
            break;
          }
          const result = await upsertMangaDex(item);
          if (result.changed) stats.changed += 1;
        }
        pages += 1;
        const nextOffset = offset + items.length;
        completed =
          reachedHighWaterMark ||
          items.length < pageLimit ||
          nextOffset >= Number(payload.total || 0) ||
          nextOffset > 9_900 ||
          (mode === "incremental" && !previousHighWaterMark);
        offset = completed ? 0 : nextOffset;
        await writeSyncCursor({
          lane: laneConfig.lane,
          mode,
          offset,
          highWaterMark: newestHighWaterMark || previousHighWaterMark,
          providerTotal: Number(payload.total || 0),
          lastFullAt: mode === "full" && completed ? new Date().toISOString() : null,
        });
      }
    }
    const aggregateLane = adult ? "adult" : "public";
    const aggregateCursor = await readSyncCursor(aggregateLane, "incremental");
    await writeSyncCursor({
      lane: aggregateLane,
      mode: "incremental",
      highWaterMark: newestHighWaterMark || aggregateCursor.high_water_mark,
      providerTotal,
    });
    await finishSyncRun(runId, "succeeded", stats);
    return {
      mode,
      imported: stats.changed,
      examined: stats.examined,
      requests: stats.requests,
      total: providerTotal,
    };
  } catch (error) {
    await finishSyncRun(runId, "failed", stats, error);
    throw error;
  }
}

async function syncCatalog(options = {}) {
  const key = `catalog:${options.adult ? "adult" : "public"}`;
  return singleFlight(key, () => syncCatalogUnsafe(options));
}

async function syncChapters(work, stats = { requests: 0 }) {
  if (work.source !== "mangadex") return { chapters: [], fetchedCount: 0, changed: 0 };
  let offset = 0;
  let total = Infinity;
  let fetchedCount = 0;
  let changed = 0;
  while (offset < total) {
    const params = new URLSearchParams({
      limit: "100",
      offset: String(offset),
      "order[chapter]": "desc",
    });
    params.append("translatedLanguage[]", "pt-br");
    params.append("includes[]", "scanlation_group");
    const response = await fetchMangaDex(`/manga/${work.external_id}/feed?${params}`, { stats });
    const payload = await response.json();
    const chapters = payload.data || [];
    fetchedCount += chapters.length;
    for (const chapter of chapters) {
      const attrs = chapter.attributes || {};
      const group =
        (chapter.relationships || []).find((relation) => relation.type === "scanlation_group")
          ?.attributes?.name || "Grupo não informado";
      const result = await run(
        `INSERT INTO chapters (id, work_id, source, external_id, chapter_number, volume_number, title, language, published_at, scanlation_group)
       VALUES (?, ?, 'mangadex', ?, ?, ?, ?, 'pt-BR', ?, ?)
       ON CONFLICT(external_id) DO UPDATE SET chapter_number=excluded.chapter_number,
         volume_number=excluded.volume_number, title=excluded.title,
         published_at=excluded.published_at, scanlation_group=excluded.scanlation_group,
         updated_at=CURRENT_TIMESTAMP
       WHERE COALESCE(chapters.chapter_number, '') <> COALESCE(excluded.chapter_number, '')
          OR COALESCE(chapters.volume_number, '') <> COALESCE(excluded.volume_number, '')
          OR COALESCE(chapters.title, '') <> COALESCE(excluded.title, '')
          OR COALESCE(chapters.published_at, '') <> COALESCE(excluded.published_at, '')
          OR COALESCE(chapters.scanlation_group, '') <> COALESCE(excluded.scanlation_group, '')`,
        [
          stableId("chapter", chapter.id),
          work.id,
          chapter.id,
          attrs.chapter || null,
          attrs.volume || null,
          attrs.title || `Capítulo ${attrs.chapter || "?"}`,
          attrs.publishAt || null,
          group,
        ],
      );
      changed += Number(result.changes || 0);
    }
    offset += chapters.length;
    total = Number(payload.total || offset);
    if (!chapters.length) break;
  }
  const chapters = await all(
    `SELECT * FROM chapters WHERE work_id = ? AND language = ?
     ORDER BY CAST(chapter_number AS REAL) DESC, published_at DESC`,
    [work.id, "pt-BR"],
  );
  return { chapters, fetchedCount, changed };
}

async function pageUrls(chapter) {
  const response = await fetchMangaDex(`/at-home/server/${chapter.external_id}`);
  const payload = await response.json();
  if (payload.result !== "ok") throw new Error("MangaDex não disponibilizou este capítulo");
  return (payload.chapter.data || []).map(
    (name) => `${payload.baseUrl}/data/${payload.chapter.hash}/${name}`,
  );
}

function serializeWork(work) {
  return {
    id: work.id,
    slug: work.slug,
    title: work.title,
    alternativeTitle: work.alternative_title || undefined,
    synopsis: work.synopsis,
    cover: `/api/v1/media/cover/${work.id}`,
    kind: work.kind === "manhua" ? "manga" : work.kind,
    ageRating: work.is_adult ? "18+" : "14",
    status: work.status,
    rating: Number(work.rating) > 0 ? Number(work.rating) : null,
    year: work.year || null,
    genres: JSON.parse(work.genres_json || "[]"),
    language: "Português (BR)",
    metadataLanguages: {
      title: work.title_language || null,
      synopsis: work.synopsis_language || null,
    },
    chapterCount: Number(work.chapter_count || 0),
    latestChapter: Number(work.latest_chapter || 0),
    sources: [
      {
        id: work.source,
        label: work.source === "mangadex" ? "MangaDex" : work.source,
        role: "primary",
        available: true,
      },
    ],
  };
}

async function fileSize(filePath) {
  try {
    return (await fsp.stat(filePath)).size;
  } catch {
    return 0;
  }
}

function secondsSince(sqliteDate) {
  if (!sqliteDate) return null;
  const normalized = `${String(sqliteDate).replace(" ", "T")}Z`;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp)
    ? Math.max(0, Math.round((Date.now() - timestamp) / 1000))
    : null;
}

async function dashboardStats() {
  const [
    works,
    chapters,
    assets,
    assetKinds,
    latestRun,
    latestSuccessfulRun,
    adultRun,
    failures,
    activity,
    providerHealth,
    stat,
  ] = await Promise.all([
    get(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN is_adult = 0 THEN 1 ELSE 0 END) AS public,
              SUM(CASE WHEN is_adult = 1 THEN 1 ELSE 0 END) AS adult,
              MAX(updated_at) AS newest
       FROM works`,
    ),
    get(
      `SELECT COUNT(*) AS total,
              COUNT(DISTINCT work_id) AS works_with_chapters,
              SUM(CASE WHEN page_count IS NOT NULL AND page_count > 0 THEN 1 ELSE 0 END) AS with_page_count,
              MAX(updated_at) AS newest
       FROM chapters`,
    ),
    get(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available,
              COALESCE(SUM(CASE WHEN status = 'available' THEN byte_size ELSE 0 END), 0) AS bytes,
              MAX(updated_at) AS newest
       FROM assets`,
    ),
    all(
      `SELECT asset_kind AS kind, COUNT(*) AS count, COALESCE(SUM(byte_size), 0) AS bytes
       FROM assets WHERE status = 'available' GROUP BY asset_kind`,
    ),
    get(
      `SELECT started_at, finished_at, status, provider, imported_count, error,
              job_type, examined_count, changed_count, request_count, duration_ms
         FROM sync_runs ORDER BY started_at DESC LIMIT 1`,
    ),
    get(
      `SELECT started_at, finished_at, status, provider, imported_count, error
         FROM sync_runs WHERE status = 'succeeded'
         ORDER BY started_at DESC LIMIT 1`,
    ),
    get(
      `SELECT started_at, finished_at, status, provider, imported_count, error
       FROM sync_runs WHERE provider = 'mangadex-adult'
       ORDER BY started_at DESC LIMIT 1`,
    ),
    get(
      `SELECT COUNT(*) AS total FROM sync_runs
       WHERE status = 'failed' AND started_at >= datetime('now', '-24 hours')`,
    ),
    get(
      `SELECT COUNT(*) AS runs,
              COALESCE(SUM(request_count), 0) AS requests,
              COALESCE(SUM(changed_count), 0) AS changed
       FROM sync_runs WHERE started_at >= datetime('now', '-24 hours')`,
    ),
    get("SELECT * FROM provider_health WHERE provider='mangadex'"),
    fsp.statfs(dataDir),
  ]);

  const [databaseBytes, walBytes, shmBytes] = await Promise.all([
    fileSize(path.join(dataDir, "mangaflow.db")),
    fileSize(path.join(dataDir, "mangaflow.db-wal")),
    fileSize(path.join(dataDir, "mangaflow.db-shm")),
  ]);
  const diskTotalBytes = Number(stat.blocks) * Number(stat.bsize);
  const diskFreeBytes = Number(stat.bavail) * Number(stat.bsize);
  const assetsBytes = Number(assets?.bytes || 0);
  const syncAgeSeconds = secondsSince(latestRun?.finished_at || latestRun?.started_at);
  const successfulSyncAgeSeconds = secondsSince(
    latestSuccessfulRun?.finished_at || latestSuccessfulRun?.started_at,
  );
  const adultSyncAgeSeconds = secondsSince(adultRun?.finished_at || adultRun?.started_at);
  const [syncState, adultSyncState] = await Promise.all([
    readSyncCursor("public", "incremental"),
    readSyncCursor("adult", "incremental"),
  ]);
  const latestSyncState = latestRun?.provider === "mangadex-adult" ? adultSyncState : syncState;
  const workerHealthy = successfulSyncAgeSeconds !== null && successfulSyncAgeSeconds < 1_800;

  return {
    generatedAt: new Date().toISOString(),
    health: {
      api: true,
      database: true,
      worker: workerHealthy,
      storage: assetsBytes < assetLimitBytes && diskFreeBytes >= minimumFreeBytes,
      storageWarning: diskFreeBytes < warningFreeBytes,
      providerCircuitOpen: Boolean(
        providerHealth?.circuit_open_until &&
        Date.parse(`${providerHealth.circuit_open_until.replace(" ", "T")}Z`) > Date.now(),
      ),
    },
    catalog: {
      databaseTotal: Number(works?.total || 0),
      siteVisible: Number(works?.public || 0),
      adultHidden: Number(works?.adult || 0),
      updatedAt: works?.newest || null,
    },
    chapters: {
      total: Number(chapters?.total || 0),
      worksWithChapters: Number(chapters?.works_with_chapters || 0),
      withPageCount: Number(chapters?.with_page_count || 0),
      coveragePercent: works?.total
        ? Number(
            ((Number(chapters?.works_with_chapters || 0) / Number(works.total)) * 100).toFixed(1),
          )
        : 0,
      updatedAt: chapters?.newest || null,
    },
    assets: {
      total: Number(assets?.total || 0),
      available: Number(assets?.available || 0),
      bytes: assetsBytes,
      covers: Number(assetKinds.find((item) => item.kind === "cover")?.count || 0),
      chapterPages: Number(assetKinds.find((item) => item.kind === "chapter_page")?.count || 0),
      updatedAt: assets?.newest || null,
    },
    storage: {
      dataBytes: assetsBytes + databaseBytes + walBytes + shmBytes,
      databaseBytes: databaseBytes + walBytes + shmBytes,
      diskTotalBytes,
      diskFreeBytes,
      diskUsedPercent: diskTotalBytes
        ? Number((((diskTotalBytes - diskFreeBytes) / diskTotalBytes) * 100).toFixed(1))
        : 0,
      assetLimitBytes,
      minimumFreeBytes,
      warningFreeBytes,
    },
    sync: {
      provider: latestRun?.provider || "mangadex",
      status: latestRun?.status || "unknown",
      importedLastRun: Number(latestRun?.imported_count || 0),
      lastStartedAt: latestRun?.started_at || null,
      lastFinishedAt: latestRun?.finished_at || null,
      ageSeconds: syncAgeSeconds,
      failures24h: Number(failures?.total || 0),
      runs24h: Number(activity?.runs || 0),
      requests24h: Number(activity?.requests || 0),
      changed24h: Number(activity?.changed || 0),
      error: latestRun?.error || null,
      offset: Number(latestSyncState.offset || 0),
      providerTotal: Number(latestSyncState.provider_total || 0),
      stateUpdatedAt: latestSyncState.updated_at || null,
      jobType: latestRun?.job_type || null,
      examinedLastRun: Number(latestRun?.examined_count || 0),
      changedLastRun: Number(latestRun?.changed_count || 0),
      requestsLastRun: Number(latestRun?.request_count || 0),
      durationMs: Number(latestRun?.duration_ms || 0),
      providerFailures: Number(providerHealth?.consecutive_failures || 0),
      providerNextRetryAt: providerHealth?.next_retry_at || null,
    },
    adultSync: {
      status: adultRun?.status || "not_started",
      importedLastRun: Number(adultRun?.imported_count || 0),
      lastFinishedAt: adultRun?.finished_at || null,
      ageSeconds: adultSyncAgeSeconds,
      offset: Number(adultSyncState.offset || 0),
      providerTotal: Number(adultSyncState.provider_total || 0),
      stateUpdatedAt: adultSyncState.updated_at || null,
    },
  };
}

app.get("/api/v1/health", async (_req, res) => {
  const row = await get(
    "SELECT count(*) AS works, (SELECT count(*) FROM chapters) AS chapters, (SELECT count(*) FROM assets WHERE status = ?) AS assets FROM works",
    ["available"],
  );
  res.json({ ok: true, service: "mangaflow-api", ...row });
});
app.get("/api/v1/ready", async (_req, res) => {
  await get("SELECT 1 AS ok");
  res.json({ ok: true });
});
app.get("/api/v1/admin/dashboard", async (req, res, next) => {
  try {
    if (!adminToken || req.get("x-admin-token") !== adminToken)
      return res.status(401).json({ error: "Não autorizado" });
    res.set("Cache-Control", "no-store");
    res.json(await dashboardStats());
  } catch (error) {
    next(error);
  }
});

async function attachChapterSummaries(rows) {
  if (!rows.length) return rows;
  const ids = rows.map((work) => work.id);
  const placeholders = ids.map(() => "?").join(",");
  const chapterRows = await all(
    `SELECT work_id,
            COUNT(DISTINCT COALESCE(volume_number, '') || ':' ||
              COALESCE(chapter_number, external_id)) AS chapter_count,
            MAX(CAST(chapter_number AS REAL)) AS latest_chapter
     FROM chapters WHERE work_id IN (${placeholders}) AND language = ?
     GROUP BY work_id`,
    [...ids, "pt-BR"],
  );
  const byWork = new Map(chapterRows.map((chapter) => [chapter.work_id, chapter]));
  for (const work of rows) {
    const summary = byWork.get(work.id);
    work.chapter_count = Number(summary?.chapter_count || 0);
    work.latest_chapter = Number(summary?.latest_chapter || 0);
  }
  return rows;
}

function ftsQuery(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, 8)
    .map((token) => `${token}*`)
    .join(" AND ");
}

function serializeChapter(chapter) {
  return {
    id: chapter.id,
    number: Number(chapter.chapter_number) || 0,
    numberLabel: chapter.chapter_number || "?",
    volume: chapter.volume_number || null,
    title: chapter.title || `Capítulo ${chapter.chapter_number || "?"}`,
    language: "Português (BR)",
    releasedAt: chapter.published_at || "",
    scanlationGroup: chapter.scanlation_group,
  };
}

function groupChapterReleases(rows) {
  const groups = new Map();
  for (const chapter of rows) {
    const key = chapter.chapter_number
      ? `${chapter.volume_number || ""}:${chapter.chapter_number}`
      : chapter.external_id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(chapter);
  }
  return [...groups.values()].map((releases) => {
    const [primary, ...alternatives] = releases;
    return {
      ...serializeChapter(primary),
      alternatives: alternatives.map(serializeChapter),
    };
  });
}

app.get("/api/v1/catalog", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 48);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const adult = req.query.adult === "true" ? 1 : 0;
    const rows = await all(
      "SELECT * FROM works WHERE is_adult = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?",
      [adult, limit, (page - 1) * limit],
    );
    const count = await get("SELECT count(*) AS total FROM works WHERE is_adult = ?", [adult]);
    await attachChapterSummaries(rows);
    res.json({ results: rows.map(serializeWork), page, limit, total: count.total });
  } catch (error) {
    next(error);
  }
});
app.get("/api/v1/search", async (req, res, next) => {
  try {
    const query = String(req.query.q || "").trim();
    if (query.length < 2) return res.json({ results: [] });
    const adult = req.query.adult === "true" ? 1 : 0;
    const match = ftsQuery(query);
    if (!match) return res.json({ results: [] });
    const rows = await all(
      `SELECT w.* FROM works_fts f
       JOIN works w ON w.id = f.work_id
       WHERE works_fts MATCH ? AND w.is_adult = ?
       ORDER BY bm25(works_fts), w.updated_at DESC LIMIT 24`,
      [match, adult],
    );
    await attachChapterSummaries(rows);
    res.json({ results: rows.map(serializeWork) });
  } catch (error) {
    next(error);
  }
});
app.get("/api/v1/works/:slug", async (req, res, next) => {
  try {
    const work = await get("SELECT * FROM works WHERE slug = ?", [req.params.slug]);
    if (!work) return res.status(404).json({ error: "Obra não encontrada" });
    await attachChapterSummaries([work]);
    res.json(serializeWork(work));
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/works/:slug/chapters", async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const work = await get("SELECT id FROM works WHERE slug = ?", [req.params.slug]);
    if (!work) return res.status(404).json({ error: "Obra não encontrada" });
    const rows = await all(
      `SELECT * FROM chapters WHERE work_id = ? AND language = 'pt-BR'
       ORDER BY CAST(chapter_number AS REAL) DESC, published_at DESC, updated_at DESC`,
      [work.id],
    );
    const grouped = groupChapterReleases(rows);
    const offset = (page - 1) * limit;
    res.json({
      results: grouped.slice(offset, offset + limit),
      page,
      limit,
      total: grouped.length,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/chapters/:chapterId", async (req, res, next) => {
  try {
    const chapter = await get(
      `SELECT c.*, w.slug AS work_slug, w.title AS work_title
       FROM chapters c JOIN works w ON w.id = c.work_id
       WHERE c.id = ? AND c.language = 'pt-BR'`,
      [req.params.chapterId],
    );
    if (!chapter) return res.status(404).json({ error: "Capítulo não encontrado" });
    res.json({
      ...serializeChapter(chapter),
      workSlug: chapter.work_slug,
      workTitle: chapter.work_title,
    });
  } catch (error) {
    next(error);
  }
});
app.get("/api/v1/chapters/:chapterId/pages", async (req, res, next) => {
  try {
    const chapter = await get("SELECT * FROM chapters WHERE id = ?", [req.params.chapterId]);
    if (!chapter) return res.status(404).json({ error: "Capítulo não encontrado" });
    const urls = await pageUrls(chapter);
    await run("UPDATE chapters SET page_count = ?, updated_at=CURRENT_TIMESTAMP WHERE id = ?", [
      urls.length,
      chapter.id,
    ]);
    res.json({
      pages: urls.map((_url, index) => ({
        index,
        url: `/api/v1/media/chapter/${chapter.id}/${index}`,
      })),
    });
  } catch (error) {
    next(error);
  }
});
async function serveAsset(asset, res) {
  res.set({
    "Content-Type": asset.mime_type,
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: `\"${asset.sha256}\"`,
  });
  fs.createReadStream(asset.internal_path).pipe(res);
}
app.get("/api/v1/media/cover/:workId", async (req, res, next) => {
  try {
    const work = await get("SELECT * FROM works WHERE id = ?", [req.params.workId]);
    if (!work || !work.cover_source_url) return res.status(404).end();
    const asset = await storeAsset({
      workId: work.id,
      kind: "cover",
      sourceUrl: work.cover_source_url,
    });
    await serveAsset(asset, res);
  } catch (error) {
    next(error);
  }
});
app.get("/api/v1/media/chapter/:chapterId/:index", async (req, res, next) => {
  try {
    const chapter = await get("SELECT * FROM chapters WHERE id = ?", [req.params.chapterId]);
    if (!chapter) return res.status(404).end();
    const index = Number(req.params.index);
    const existing = await get(
      "SELECT * FROM assets WHERE chapter_id = ? AND asset_kind = ? AND page_index = ?",
      [chapter.id, "chapter_page", index],
    );
    if (existing?.status === "available" && fs.existsSync(existing.internal_path))
      return serveAsset(existing, res);
    const urls = await pageUrls(chapter);
    if (!urls[index]) return res.status(404).end();
    const asset = await storeAsset({
      chapterId: chapter.id,
      kind: "chapter_page",
      pageIndex: index,
      sourceUrl: urls[index],
    });
    await serveAsset(asset, res);
  } catch (error) {
    next(error);
  }
});
app.post("/api/v1/admin/sync", async (req, res, next) => {
  try {
    if (!adminToken || req.get("x-admin-token") !== adminToken)
      return res.status(401).json({ error: "Não autorizado" });
    const mode = req.query.mode === "full" ? "full" : "incremental";
    res.json(await syncCatalog({ mode }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/admin/sync-adult", async (req, res, next) => {
  try {
    if (!adminToken || req.get("x-admin-token") !== adminToken)
      return res.status(401).json({ error: "Não autorizado" });
    const mode = req.query.mode === "full" ? "full" : "incremental";
    res.json(await syncCatalog({ adult: true, mode }));
  } catch (error) {
    next(error);
  }
});

async function syncChaptersBatchUnsafe(limit) {
  const runId = nowId();
  const stats = { startedAt: Date.now(), examined: 0, changed: 0, requests: 0 };
  await run(
    "INSERT INTO sync_runs (id, status, provider, job_type) VALUES (?, 'running', 'mangadex-chapters', 'chapter_batch')",
    [runId],
  );
  const candidates = await all(
    `SELECT w.* FROM works w JOIN work_sync_state s ON s.work_id = w.id
     WHERE w.source = 'mangadex' AND s.next_check_at <= CURRENT_TIMESTAMP
     ORDER BY s.next_check_at, w.updated_at DESC
     LIMIT ?`,
    [limit],
  );
  const results = [];
  for (const work of candidates) {
    stats.examined += 1;
    try {
      const result = await syncChapters(work, stats);
      stats.changed += result.changed;
      const emptyPtbr = result.chapters.length === 0 ? 1 : 0;
      const interval = emptyPtbr || work.status === "Completo" ? "+7 days" : "+6 hours";
      await run(
        `UPDATE work_sync_state SET last_checked_at=CURRENT_TIMESTAMP,
         last_success_at=CURRENT_TIMESTAMP, next_check_at=datetime('now', ?), empty_ptbr=?,
         consecutive_failures=0, last_error=NULL, updated_at=CURRENT_TIMESTAMP WHERE work_id=?`,
        [interval, emptyPtbr, work.id],
      );
      results.push({
        workId: work.id,
        slug: work.slug,
        chapters: result.chapters.length,
        changed: result.changed,
      });
    } catch (error) {
      const state = await get("SELECT consecutive_failures FROM work_sync_state WHERE work_id=?", [
        work.id,
      ]);
      const failures = Number(state?.consecutive_failures || 0) + 1;
      const delay = ["+15 minutes", "+1 hour", "+6 hours", "+1 day"][Math.min(failures - 1, 3)];
      await run(
        `UPDATE work_sync_state SET last_checked_at=CURRENT_TIMESTAMP,
         next_check_at=datetime('now', ?), consecutive_failures=?, last_error=?,
         updated_at=CURRENT_TIMESTAMP WHERE work_id=?`,
        [delay, failures, String(error.message || error).slice(0, 500), work.id],
      );
      results.push({ workId: work.id, slug: work.slug, error: String(error.message || error) });
      if (error.status === 503) break;
    }
  }
  await finishSyncRun(runId, "succeeded", stats);
  return { processed: results.length, requests: stats.requests, changed: stats.changed, results };
}

async function syncChaptersBatch(limit) {
  return singleFlight("chapters", () => syncChaptersBatchUnsafe(limit));
}

app.post("/api/v1/admin/sync-chapters", async (req, res, next) => {
  try {
    if (!adminToken || req.get("x-admin-token") !== adminToken)
      return res.status(401).json({ error: "Não autorizado" });
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);
    res.json(await syncChaptersBatch(limit));
  } catch (error) {
    next(error);
  }
});
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.retryAt) {
    const seconds = Math.max(1, Math.ceil((error.retryAt.getTime() - Date.now()) / 1000));
    res.set("Retry-After", String(seconds));
  }
  res.status(error.status || 500).json({ error: error.message || "Erro interno" });
});

initialize()
  .then(() => app.listen(port, () => console.log(`MangaFlow API em :${port}`)))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
