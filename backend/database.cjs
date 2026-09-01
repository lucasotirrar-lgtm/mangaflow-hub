const fs = require("node:fs");
const path = require("node:path");
const sqlite3 = require("sqlite3").verbose();

const dataDir = process.env.MANGAFLOW_DATA_DIR || path.join(__dirname, "data");
fs.mkdirSync(path.join(dataDir, "assets"), { recursive: true });
const db = new sqlite3.Database(path.join(dataDir, "mangaflow.db"));

const run = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve({ changes: this.changes, lastID: this.lastID });
    }),
  );
const get = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row))),
  );
const all = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows))),
  );

async function ensureColumn(table, column, definition) {
  const columns = await all(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function initialize() {
  await run("PRAGMA journal_mode = WAL");
  await run("PRAGMA synchronous = NORMAL");
  await run("PRAGMA busy_timeout = 5000");
  await run("PRAGMA foreign_keys = ON");
  await run(`CREATE TABLE IF NOT EXISTS works (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    alternative_title TEXT,
    synopsis TEXT NOT NULL DEFAULT '',
    cover_source_url TEXT,
    kind TEXT NOT NULL DEFAULT 'manga',
    status TEXT NOT NULL DEFAULT 'Em andamento',
    rating REAL NOT NULL DEFAULT 0,
    year INTEGER,
    language TEXT NOT NULL DEFAULT 'pt-BR',
    genres_json TEXT NOT NULL DEFAULT '[]',
    is_adult INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source, external_id)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    external_id TEXT NOT NULL UNIQUE,
    chapter_number TEXT,
    volume_number TEXT,
    title TEXT,
    language TEXT NOT NULL DEFAULT 'pt-BR',
    published_at TEXT,
    page_count INTEGER,
    scanlation_group TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    work_id TEXT REFERENCES works(id) ON DELETE CASCADE,
    chapter_id TEXT REFERENCES chapters(id) ON DELETE CASCADE,
    asset_kind TEXT NOT NULL,
    page_index INTEGER,
    source_url TEXT,
    internal_path TEXT,
    mime_type TEXT,
    byte_size INTEGER,
    sha256 TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(work_id, asset_kind),
    UNIQUE(chapter_id, asset_kind, page_index),
    UNIQUE(sha256)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS sync_runs (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TEXT,
    status TEXT NOT NULL,
    provider TEXT NOT NULL,
    imported_count INTEGER NOT NULL DEFAULT 0,
    error TEXT
  )`);

  await ensureColumn("works", "provider_updated_at", "TEXT");
  await ensureColumn("works", "title_language", "TEXT");
  await ensureColumn("works", "synopsis_language", "TEXT");
  await ensureColumn("sync_runs", "job_type", "TEXT NOT NULL DEFAULT 'catalog_incremental'");
  await ensureColumn("sync_runs", "examined_count", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("sync_runs", "changed_count", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("sync_runs", "request_count", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("sync_runs", "duration_ms", "INTEGER NOT NULL DEFAULT 0");

  await run(`CREATE TABLE IF NOT EXISTS sync_cursors (
    provider TEXT NOT NULL,
    lane TEXT NOT NULL,
    mode TEXT NOT NULL,
    offset INTEGER NOT NULL DEFAULT 0,
    high_water_mark TEXT,
    provider_total INTEGER NOT NULL DEFAULT 0,
    last_full_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(provider, lane, mode)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS work_sync_state (
    work_id TEXT PRIMARY KEY REFERENCES works(id) ON DELETE CASCADE,
    last_checked_at TEXT,
    next_check_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_success_at TEXT,
    empty_ptbr INTEGER NOT NULL DEFAULT 0,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS provider_health (
    provider TEXT PRIMARY KEY,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    next_retry_at TEXT,
    circuit_open_until TEXT,
    last_error TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE VIRTUAL TABLE IF NOT EXISTS works_fts USING fts5(
    work_id UNINDEXED,
    title,
    alternative_title,
    tokenize='unicode61 remove_diacritics 2'
  )`);
  await run(`CREATE TRIGGER IF NOT EXISTS works_fts_insert AFTER INSERT ON works BEGIN
    INSERT INTO works_fts(work_id, title, alternative_title)
    VALUES (new.id, new.title, COALESCE(new.alternative_title, ''));
  END`);
  await run(`CREATE TRIGGER IF NOT EXISTS works_fts_update AFTER UPDATE OF title, alternative_title ON works BEGIN
    DELETE FROM works_fts WHERE work_id = old.id;
    INSERT INTO works_fts(work_id, title, alternative_title)
    VALUES (new.id, new.title, COALESCE(new.alternative_title, ''));
  END`);
  await run(`CREATE TRIGGER IF NOT EXISTS works_fts_delete AFTER DELETE ON works BEGIN
    DELETE FROM works_fts WHERE work_id = old.id;
  END`);
  const ftsCount = await get("SELECT COUNT(*) AS total FROM works_fts");
  if (Number(ftsCount?.total || 0) === 0) {
    await run(`INSERT INTO works_fts(work_id, title, alternative_title)
      SELECT id, title, COALESCE(alternative_title, '') FROM works`);
  }

  await run(`INSERT OR IGNORE INTO work_sync_state
      (work_id, last_checked_at, next_check_at, last_success_at, empty_ptbr)
    SELECT w.id,
           CURRENT_TIMESTAMP,
           CASE WHEN w.status = 'Completo'
             THEN datetime('now', '+7 days')
             ELSE datetime('now', '+6 hours')
           END,
           CURRENT_TIMESTAMP,
           CASE WHEN EXISTS (SELECT 1 FROM chapters c WHERE c.work_id = w.id) THEN 0 ELSE 1 END
    FROM works w`);
  await run("CREATE INDEX IF NOT EXISTS works_title_idx ON works(title)");
  await run(
    "CREATE INDEX IF NOT EXISTS works_catalog_filter_idx ON works(is_adult, kind, status, updated_at)",
  );
  await run("CREATE INDEX IF NOT EXISTS works_provider_updated_idx ON works(provider_updated_at)");
  await run("CREATE INDEX IF NOT EXISTS chapters_work_idx ON chapters(work_id, chapter_number)");
  await run("CREATE INDEX IF NOT EXISTS chapter_schedule_idx ON work_sync_state(next_check_at)");
  await run("CREATE INDEX IF NOT EXISTS sync_runs_started_idx ON sync_runs(started_at)");
}

module.exports = { all, dataDir, db, get, initialize, run };
