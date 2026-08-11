const intervalMs = Number(process.env.MANGAFLOW_SYNC_INTERVAL_MS || 15 * 60 * 1000);
const endpoint = process.env.MANGAFLOW_API_INTERNAL_URL || "http://api:3100/api/v1/admin/sync";
const token = process.env.MANGAFLOW_ADMIN_TOKEN || "";

async function sync() {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "x-admin-token": token },
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log("[sync]", await response.json());
  } catch (error) {
    console.error("[sync]", error.message);
  }
}
sync();
setInterval(sync, intervalMs);
