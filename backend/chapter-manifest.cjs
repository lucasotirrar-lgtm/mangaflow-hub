// At-home URLs expire: keep a bounded short-lived cache and coalesce readers.
function createManifestLoader(fetcher, { ttlMs = 600000, maxEntries = 1024, now = Date.now } = {}) {
  const cache = new Map();
  const pending = new Map();
  return async function pageUrls(chapter) {
    const key = chapter.external_id;
    const hit = cache.get(key);
    if (hit && hit.until > now()) return hit.urls;
    if (pending.has(key)) return pending.get(key);
    const work = (async () => {
      const response = await fetcher(`/at-home/server/${key}`);
      const payload = await response.json();
      if (payload.result !== "ok" || !Array.isArray(payload.chapter?.data))
        throw new Error("MangaDex não disponibilizou este capítulo");
      const urls = payload.chapter.data.map(
        (name) => `${payload.baseUrl}/data/${payload.chapter.hash}/${name}`,
      );
      cache.delete(key);
      cache.set(key, { until: now() + ttlMs, urls });
      while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
      return urls;
    })();
    pending.set(key, work);
    try {
      return await work;
    } finally {
      pending.delete(key);
    }
  };
}
module.exports = { createManifestLoader };
