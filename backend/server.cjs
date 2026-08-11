require("dotenv").config();
const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const express = require("express");
const { all, dataDir, get, initialize, run } = require("./database.cjs");

const app = express();
const port = Number(process.env.PORT || 3100);
const adminToken = process.env.MANGAFLOW_ADMIN_TOKEN || "";
const maxAssetBytes = Number(process.env.MANGAFLOW_MAX_ASSET_BYTES || 25 * 1024 * 1024);
const assetLimitBytes = Number(process.env.MANGAFLOW_ASSET_LIMIT_BYTES || 60 * 1024 * 1024 * 1024);
const minimumFreeBytes = Number(
  process.env.MANGAFLOW_MINIMUM_FREE_BYTES || 25 * 1024 * 1024 * 1024,
);
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const allowedHosts = new Set(["uploads.mangadex.org", "s4.anilist.co", "api.mangadex.org"]);

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
const localize = (values, fallback = "") =>
  values?.["pt-br"] ||
  values?.pt ||
  values?.en ||
  values?.["ja-ro"] ||
  Object.values(values || {})[0] ||
  fallback;

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

async function storeAsset({ workId = null, chapterId = null, kind, pageIndex = null, sourceUrl }) {
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

async function upsertMangaDex(item) {
  const attrs = item.attributes || {};
  const cover = (item.relationships || []).find((relation) => relation.type === "cover_art")
    ?.attributes?.fileName;
  const id = stableId("mangadex", item.id);
  const title = localize(attrs.title, "Sem título");
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
    `INSERT INTO works (id, source, external_id, slug, title, alternative_title, synopsis, cover_source_url, kind, status, year, language, genres_json, is_adult)
     VALUES (?, 'mangadex', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pt-BR', ?, ?)
     ON CONFLICT(source, external_id) DO UPDATE SET title=excluded.title, alternative_title=excluded.alternative_title, synopsis=excluded.synopsis, cover_source_url=excluded.cover_source_url, kind=excluded.kind, status=excluded.status, year=excluded.year, genres_json=excluded.genres_json, is_adult=excluded.is_adult, updated_at=CURRENT_TIMESTAMP`,
    [
      id,
      item.id,
      slugFor("mangadex", item.id, title),
      title,
      (attrs.altTitles || []).map((value) => localize(value, "")).find(Boolean) || null,
      localize(attrs.description, "Sinopse ainda não disponível em português."),
      cover ? `https://uploads.mangadex.org/covers/${item.id}/${cover}` : null,
      kind,
      status,
      attrs.year || null,
      JSON.stringify(
        (attrs.tags || []).map((tag) => localize(tag.attributes?.name, "")).filter(Boolean),
      ),
      adult,
    ],
  );
  return get("SELECT * FROM works WHERE id = ?", [id]);
}

async function syncCatalog() {
  const runId = nowId();
  await run("INSERT INTO sync_runs (id, status, provider) VALUES (?, 'running', 'mangadex')", [
    runId,
  ]);
  try {
    const params = new URLSearchParams({ limit: "100", "order[latestUploadedChapter]": "desc" });
    params.append("includes[]", "cover_art");
    params.append("availableTranslatedLanguage[]", "pt-br");
    params.append("contentRating[]", "safe");
    params.append("contentRating[]", "suggestive");
    const response = await fetch(`https://api.mangadex.org/manga?${params}`, {
      signal: AbortSignal.timeout(20_000),
      headers: { "user-agent": "MangaFlow pessoal/1.0" },
    });
    if (!response.ok) throw new Error(`MangaDex HTTP ${response.status}`);
    const payload = await response.json();
    let imported = 0;
    for (const item of payload.data || []) {
      await upsertMangaDex(item);
      imported += 1;
    }
    await run(
      "UPDATE sync_runs SET status='succeeded', imported_count=?, finished_at=CURRENT_TIMESTAMP WHERE id=?",
      [imported, runId],
    );
    return { imported };
  } catch (error) {
    await run(
      "UPDATE sync_runs SET status='failed', error=?, finished_at=CURRENT_TIMESTAMP WHERE id=?",
      [String(error.message || error), runId],
    );
    throw error;
  }
}

async function syncChapters(work) {
  if (work.source !== "mangadex") return [];
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const params = new URLSearchParams({
      limit: "100",
      offset: String(offset),
      "order[chapter]": "desc",
    });
    params.append("translatedLanguage[]", "pt-br");
    params.append("includes[]", "scanlation_group");
    const response = await fetch(
      `https://api.mangadex.org/manga/${work.external_id}/feed?${params}`,
      { signal: AbortSignal.timeout(20_000), headers: { "user-agent": "MangaFlow pessoal/1.0" } },
    );
    if (!response.ok) throw new Error(`Capítulos indisponíveis (${response.status})`);
    const payload = await response.json();
    const chapters = payload.data || [];
    for (const chapter of chapters) {
      const attrs = chapter.attributes || {};
      const group =
        (chapter.relationships || []).find((relation) => relation.type === "scanlation_group")
          ?.attributes?.name || "Grupo não informado";
      await run(
        `INSERT INTO chapters (id, work_id, source, external_id, chapter_number, volume_number, title, language, published_at, scanlation_group)
       VALUES (?, ?, 'mangadex', ?, ?, ?, ?, 'pt-BR', ?, ?)
       ON CONFLICT(external_id) DO UPDATE SET chapter_number=excluded.chapter_number, volume_number=excluded.volume_number, title=excluded.title, published_at=excluded.published_at, scanlation_group=excluded.scanlation_group, updated_at=CURRENT_TIMESTAMP`,
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
    }
    offset += chapters.length;
    total = Number(payload.total || offset);
    if (!chapters.length) break;
  }
  return all(
    "SELECT * FROM chapters WHERE work_id = ? AND language = ? ORDER BY CAST(chapter_number AS REAL) DESC, published_at DESC",
    [work.id, "pt-BR"],
  );
}

async function pageUrls(chapter) {
  const response = await fetch(`https://api.mangadex.org/at-home/server/${chapter.external_id}`, {
    signal: AbortSignal.timeout(20_000),
    headers: { "user-agent": "MangaFlow pessoal/1.0" },
  });
  if (!response.ok) throw new Error(`Leitor indisponível (${response.status})`);
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
    rating: work.rating || 0,
    year: work.year || new Date().getFullYear(),
    genres: JSON.parse(work.genres_json || "[]"),
    language: "Português (BR)",
    latestChapter: 0,
    sources: [
      {
        id: work.source,
        label: work.source === "mangadex" ? "MangaDex" : work.source,
        role: "primary",
        available: true,
      },
    ],
    chapters: [],
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
    let rows = await all(
      "SELECT * FROM works WHERE is_adult = ? AND (title LIKE ? OR alternative_title LIKE ?) ORDER BY updated_at DESC LIMIT 24",
      [adult, `%${query}%`, `%${query}%`],
    );
    if (!rows.length) {
      const params = new URLSearchParams({ title: query, limit: "24" });
      params.append("includes[]", "cover_art");
      params.append("availableTranslatedLanguage[]", "pt-br");
      const response = await fetch(`https://api.mangadex.org/manga?${params}`, {
        signal: AbortSignal.timeout(15_000),
        headers: { "user-agent": "MangaFlow pessoal/1.0" },
      });
      if (response.ok)
        for (const item of (await response.json()).data || []) await upsertMangaDex(item);
      rows = await all(
        "SELECT * FROM works WHERE is_adult = ? AND (title LIKE ? OR alternative_title LIKE ?) ORDER BY updated_at DESC LIMIT 24",
        [adult, `%${query}%`, `%${query}%`],
      );
    }
    res.json({ results: rows.map(serializeWork) });
  } catch (error) {
    next(error);
  }
});
app.get("/api/v1/works/:slug", async (req, res, next) => {
  try {
    const work = await get("SELECT * FROM works WHERE slug = ?", [req.params.slug]);
    if (!work) return res.status(404).json({ error: "Obra não encontrada" });
    const chapters = await syncChapters(work);
    const result = serializeWork(work);
    result.chapters = chapters.map((chapter) => ({
      id: chapter.id,
      number: Number(chapter.chapter_number) || 0,
      title: chapter.title,
      language: "Português (BR)",
      releasedAt: chapter.published_at || "",
      read: false,
      scanlationGroup: chapter.scanlation_group,
    }));
    result.latestChapter = result.chapters[0]?.number || 0;
    res.json(result);
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
    res.json(await syncCatalog());
  } catch (error) {
    next(error);
  }
});
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.message || "Erro interno" });
});

initialize()
  .then(() => app.listen(port, () => console.log(`MangaFlow API em :${port}`)))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
