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
  await run("CREATE INDEX IF NOT EXISTS works_title_idx ON works(title)");
  await run("CREATE INDEX IF NOT EXISTS chapters_work_idx ON chapters(work_id, chapter_number)");
}

module.exports = { all, dataDir, db, get, initialize, run };
