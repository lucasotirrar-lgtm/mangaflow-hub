const { get, run } = require("./database.cjs");

const provider = "mangadex";
const minimumIntervalMs = Number(process.env.MANGAFLOW_MANGADEX_MIN_INTERVAL_MS || 300);
const failureBackoffMinutes = [1, 5, 15, 60];

let requestQueue = Promise.resolve();
let lastRequestStartedAt = 0;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function sqliteTimestamp(date) {
  return date
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, "");
}

function retryAfterMilliseconds(value) {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : 0;
}

function providerUnavailable(message, retryAt) {
  const error = new Error(message);
  error.status = 503;
  error.retryAt = retryAt || null;
  return error;
}

async function assertProviderAvailable() {
  const health = await get("SELECT * FROM provider_health WHERE provider = ?", [provider]);
  const blockedUntil = [health?.next_retry_at, health?.circuit_open_until]
    .filter(Boolean)
    .map((value) => Date.parse(`${String(value).replace(" ", "T")}Z`))
    .filter(Number.isFinite)
    .reduce((latest, value) => Math.max(latest, value), 0);
  if (blockedUntil > Date.now()) {
    throw providerUnavailable("MangaDex temporariamente em espera", new Date(blockedUntil));
  }
}

async function recordSuccess() {
  await run(
    `INSERT INTO provider_health(provider, consecutive_failures, next_retry_at, circuit_open_until, last_error)
     VALUES (?, 0, NULL, NULL, NULL)
     ON CONFLICT(provider) DO UPDATE SET consecutive_failures=0, next_retry_at=NULL,
       circuit_open_until=NULL, last_error=NULL, updated_at=CURRENT_TIMESTAMP`,
    [provider],
  );
}

async function recordFailure(error, retryAfterMs = 0) {
  const current = await get("SELECT consecutive_failures FROM provider_health WHERE provider = ?", [
    provider,
  ]);
  const failures = Number(current?.consecutive_failures || 0) + 1;
  const backoffMinutes =
    failureBackoffMinutes[Math.min(failures - 1, failureBackoffMinutes.length - 1)];
  const backoffMs = Math.max(backoffMinutes * 60_000, retryAfterMs);
  const nextRetryAt = new Date(Date.now() + backoffMs);
  const circuitOpenUntil = failures >= 5 ? new Date(Date.now() + 15 * 60_000) : null;
  await run(
    `INSERT INTO provider_health(provider, consecutive_failures, next_retry_at, circuit_open_until, last_error)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(provider) DO UPDATE SET consecutive_failures=excluded.consecutive_failures,
       next_retry_at=excluded.next_retry_at, circuit_open_until=excluded.circuit_open_until,
       last_error=excluded.last_error, updated_at=CURRENT_TIMESTAMP`,
    [
      provider,
      failures,
      sqliteTimestamp(nextRetryAt),
      circuitOpenUntil ? sqliteTimestamp(circuitOpenUntil) : null,
      String(error.message || error).slice(0, 500),
    ],
  );
  return nextRetryAt;
}

async function runQueued(task) {
  const execute = async () => {
    const remaining = minimumIntervalMs - (Date.now() - lastRequestStartedAt);
    if (remaining > 0) await wait(remaining);
    lastRequestStartedAt = Date.now();
    return task();
  };
  const result = requestQueue.then(execute, execute);
  requestQueue = result.catch(() => {});
  return result;
}

async function fetchMangaDex(pathOrUrl, { timeoutMs = 20_000, stats } = {}) {
  await assertProviderAvailable();
  return runQueued(async () => {
    await assertProviderAvailable();
    if (stats) stats.requests = Number(stats.requests || 0) + 1;
    const url = pathOrUrl.startsWith("http")
      ? pathOrUrl
      : `https://api.mangadex.org${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
    let response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "user-agent": "MangaFlow pessoal/2.0" },
      });
    } catch (error) {
      const retryAt = await recordFailure(error);
      throw providerUnavailable(`MangaDex indisponível: ${error.message || error}`, retryAt);
    }
    if (!response.ok) {
      const error = new Error(`MangaDex HTTP ${response.status}`);
      error.providerStatus = response.status;
      const shouldBackoff =
        response.status === 429 || response.status === 503 || response.status >= 500;
      if (shouldBackoff) {
        const retryAt = await recordFailure(
          error,
          retryAfterMilliseconds(response.headers.get("retry-after")),
        );
        throw providerUnavailable(error.message, retryAt);
      }
      throw error;
    }
    await recordSuccess();
    return response;
  });
}

module.exports = { fetchMangaDex };
