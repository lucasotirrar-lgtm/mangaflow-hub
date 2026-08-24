const incrementalIntervalMs = Number(process.env.MANGAFLOW_SYNC_INTERVAL_MS || 15 * 60 * 1000);
const adultIntervalMs = Number(process.env.MANGAFLOW_ADULT_SYNC_INTERVAL_MS || 60 * 60 * 1000);
const chapterIntervalMs = Number(process.env.MANGAFLOW_CHAPTER_SYNC_INTERVAL_MS || 1000);
const fullIntervalMs = Number(
  process.env.MANGAFLOW_FULL_SYNC_INTERVAL_MS || 7 * 24 * 60 * 60 * 1000,
);
const endpoint = process.env.MANGAFLOW_API_INTERNAL_URL || "http://api:3100/api/v1/admin/sync";
const adultEndpoint =
  process.env.MANGAFLOW_API_ADULT_INTERNAL_URL || endpoint.replace(/\/sync$/, "/sync-adult");
const chapterEndpoint =
  process.env.MANGAFLOW_API_CHAPTER_INTERNAL_URL ||
  `${endpoint.replace(/\/sync$/, "/sync-chapters")}?limit=100`;
const token = process.env.MANGAFLOW_ADMIN_TOKEN || "";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function execute(name, url, timeoutMs) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "x-admin-token": token },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    const retryAfter = Number(response.headers.get("retry-after"));
    if (Number.isFinite(retryAfter) && retryAfter > 0) error.retryAfterMs = retryAfter * 1000;
    throw error;
  }
  console.log(`[${name}]`, await response.json());
}

async function runLoop({ name, url, intervalMs, timeoutMs = 5 * 60 * 1000, immediate = true }) {
  if (!immediate) await wait(intervalMs);
  while (true) {
    let delay = intervalMs;
    try {
      await execute(name, url, timeoutMs);
    } catch (error) {
      delay = Math.max(delay, Number(error.retryAfterMs || 0));
      console.error(`[${name}]`, error.message);
    }
    await wait(delay);
  }
}

void runLoop({ name: "sync", url: endpoint, intervalMs: incrementalIntervalMs });
void runLoop({ name: "sync-adult", url: adultEndpoint, intervalMs: adultIntervalMs });
void runLoop({
  name: "sync-chapters",
  url: chapterEndpoint,
  intervalMs: chapterIntervalMs,
  timeoutMs: 15 * 60 * 1000,
});
void runLoop({
  name: "sync-full",
  url: `${endpoint}?mode=full`,
  intervalMs: fullIntervalMs,
  timeoutMs: 15 * 60 * 1000,
  immediate: false,
});
void runLoop({
  name: "sync-adult-full",
  url: `${adultEndpoint}?mode=full`,
  intervalMs: fullIntervalMs,
  timeoutMs: 15 * 60 * 1000,
  immediate: false,
});
