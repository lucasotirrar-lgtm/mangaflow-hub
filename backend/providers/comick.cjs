"use strict";

const { BaseProvider } = require("./base.cjs");

class ComickProvider extends BaseProvider {
  constructor(options = {}) {
    super("comick", {
      minIntervalMs: options.minIntervalMs || 1000,
      failureBackoffMinutes: [5, 15, 60, 240],
    });
    this.baseUrl =
      options.baseUrl || process.env.MANGAFLOW_COMICK_BASE_URL || "https://api.comick.dev";
  }

  async _request(path, { timeoutMs = 15000 } = {}) {
    await this.assertAvailable();
    return this.runQueued(async () => {
      await this.assertAvailable();
      const url = `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
      let response;
      try {
        response = await fetch(url, {
          signal: AbortSignal.timeout(timeoutMs),
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
          },
        });
      } catch (err) {
        await this.recordFailure(err);
        throw err;
      }

      if (response.status === 403 || response.status === 503) {
        const text = await response.text();
        const isCloudflare =
          text.includes("Just a moment...") ||
          text.includes("challenge-platform") ||
          text.includes("cloudflare");
        const errMsg = isCloudflare
          ? "Comick protegido por Cloudflare Managed Challenge"
          : `Comick HTTP ${response.status}`;
        const err = new Error(errMsg);
        err.status = response.status;
        err.isCloudflare = isCloudflare;
        // Trip circuit breaker for 1 hour on anti-bot challenge
        await this.recordFailure(err, 60 * 60 * 1000);
        throw err;
      }

      if (!response.ok) {
        const err = new Error(`Comick HTTP ${response.status}`);
        err.status = response.status;
        await this.recordFailure(err);
        throw err;
      }

      await this.recordSuccess();
      return response.json();
    });
  }

  async searchWorks(query) {
    try {
      const data = await this._request(`/v1.0/search?q=${encodeURIComponent(query)}&limit=10`);
      if (!Array.isArray(data)) return [];
      return data.map((item) => {
        const altTitles = Array.isArray(item.md_titles)
          ? item.md_titles.map((t) => (typeof t === "string" ? t : t.title)).filter(Boolean)
          : [];
        return {
          id: item.hid || String(item.id),
          externalId: item.hid || String(item.id),
          slug: item.slug,
          title: item.title || "Sem título",
          alternativeTitles: altTitles,
          year: item.year || null,
          status: item.status === 1 ? "ongoing" : "completed",
          raw: item,
        };
      });
    } catch (err) {
      if (err.isCloudflare) {
        console.warn(`[comick] Busca ignorada: ${err.message}`);
        return [];
      }
      throw err;
    }
  }

  async getWork(externalId) {
    try {
      const data = await this._request(`/comic/${encodeURIComponent(externalId)}`);
      const comic = data?.comic;
      if (!comic) return null;
      const altTitles = Array.isArray(comic.md_titles)
        ? comic.md_titles.map((t) => (typeof t === "string" ? t : t.title)).filter(Boolean)
        : [];
      return {
        id: comic.hid || String(comic.id),
        externalId: comic.hid || String(comic.id),
        slug: comic.slug,
        title: comic.title || "Sem título",
        alternativeTitles: altTitles,
        year: comic.year || null,
        status: comic.status === 1 ? "ongoing" : "completed",
        raw: comic,
      };
    } catch (err) {
      if (err.isCloudflare) {
        console.warn(`[comick] Detalhes da obra indisponíveis: ${err.message}`);
        return null;
      }
      throw err;
    }
  }

  async listChapters(externalId, { language = "pt-br", limit = 100 } = {}) {
    try {
      let page = 1;
      let total = 1;
      const allChapters = [];

      while (allChapters.length < total) {
        const data = await this._request(
          `/comic/${encodeURIComponent(externalId)}/chapters?lang=${encodeURIComponent(language)}&limit=${limit}&page=${page}`,
        );
        const chapters = data?.chapters || [];
        total = Number(data?.total || chapters.length);

        for (const ch of chapters) {
          allChapters.push({
            externalId: ch.hid || String(ch.id),
            chapterNumber: ch.chap || null,
            volumeNumber: ch.vol || null,
            title: ch.title || `Capítulo ${ch.chap || "?"}`,
            language: "pt-BR",
            publishedAt: ch.created_at || null,
            scanlationGroup:
              ch.group_name || (ch.md_groups && ch.md_groups[0]?.title) || "Grupo não informado",
          });
        }
        if (!chapters.length) break;
        page += 1;
      }
      return allChapters;
    } catch (err) {
      if (err.isCloudflare) {
        console.warn(`[comick] Capítulos indisponíveis: ${err.message}`);
        return [];
      }
      throw err;
    }
  }

  async resolvePages(chapter) {
    const rawExternalId = chapter.external_id.startsWith("comick:")
      ? chapter.external_id.replace(/^comick:/, "")
      : chapter.external_id;

    const data = await this._request(`/chapter/${encodeURIComponent(rawExternalId)}`);
    const chapterData = data?.chapter;
    if (!chapterData || !Array.isArray(chapterData.images)) {
      throw new Error("Comick não disponibilizou páginas para este capítulo");
    }

    return chapterData.images.map((img) => {
      if (img.url && img.url.startsWith("http")) return img.url;
      // B2 key fallback
      const key = img.b2key || img.url;
      return `https://meo.comick.pictures/${key}`;
    });
  }
}

module.exports = { ComickProvider };
