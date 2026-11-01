"use strict";

const { BaseProvider } = require("./base.cjs");
const { fetchMangaDex } = require("../mangadex-client.cjs");

class MangaDexProvider extends BaseProvider {
  constructor() {
    super("mangadex", { minIntervalMs: 300 });
  }

  async searchWorks(query) {
    const params = new URLSearchParams({
      title: query,
      limit: "10",
      "order[relevance]": "desc",
    });
    const res = await fetchMangaDex(`/manga?${params}`);
    const data = await res.json();
    return (data.data || []).map((m) => {
      const titles = Object.values(m.attributes.title || {});
      const altTitles = (m.attributes.altTitles || []).flatMap((t) => Object.values(t));
      return {
        id: m.id,
        externalId: m.id,
        title: titles[0] || "Sem título",
        alternativeTitles: altTitles,
        year: m.attributes.year || null,
        status: m.attributes.status || "ongoing",
        raw: m,
      };
    });
  }

  async getWork(externalId) {
    const res = await fetchMangaDex(`/manga/${externalId}`);
    const data = await res.json();
    const m = data.data;
    if (!m) return null;
    const titles = Object.values(m.attributes.title || {});
    const altTitles = (m.attributes.altTitles || []).flatMap((t) => Object.values(t));
    return {
      id: m.id,
      externalId: m.id,
      title: titles[0] || "Sem título",
      alternativeTitles: altTitles,
      year: m.attributes.year || null,
      status: m.attributes.status || "ongoing",
      raw: m,
    };
  }

  async listChapters(externalId, { language = "pt-br", limit = 100 } = {}) {
    let offset = 0;
    let total = 1;
    const allChapters = [];

    while (offset < total) {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        "order[chapter]": "desc",
        "translatedLanguage[]": language,
        "includes[]": "scanlation_group",
      });
      const res = await fetchMangaDex(`/manga/${externalId}/feed?${params}`);
      const payload = await res.json();
      const chapters = payload.data || [];
      for (const ch of chapters) {
        const attrs = ch.attributes || {};
        const group =
          (ch.relationships || []).find((r) => r.type === "scanlation_group")?.attributes?.name ||
          "Grupo não informado";
        allChapters.push({
          externalId: ch.id,
          chapterNumber: attrs.chapter || null,
          volumeNumber: attrs.volume || null,
          title: attrs.title || `Capítulo ${attrs.chapter || "?"}`,
          language: "pt-BR",
          publishedAt: attrs.publishAt || null,
          scanlationGroup: group,
        });
      }
      offset += chapters.length;
      total = Number(payload.total || offset);
      if (!chapters.length) break;
    }
    return allChapters;
  }

  async resolvePages(chapter) {
    const response = await fetchMangaDex(`/at-home/server/${chapter.external_id}`);
    const payload = await response.json();
    if (payload.result !== "ok") throw new Error("MangaDex não disponibilizou este capítulo");
    return (payload.chapter.data || []).map(
      (name) => `${payload.baseUrl}/data/${payload.chapter.hash}/${name}`,
    );
  }
}

module.exports = { MangaDexProvider };
