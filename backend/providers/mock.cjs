"use strict";

const { BaseProvider } = require("./base.cjs");

class MockProvider extends BaseProvider {
  constructor(options = {}) {
    super("mock_provider", { minIntervalMs: 10 });
    this.works = [
      {
        id: "mock-bisque-001",
        externalId: "mock-bisque-001",
        slug: "sono-bisque-doll-wa-koi-wo-suru",
        title: "Sono Bisque Doll wa Koi o Suru",
        alternativeTitles: [
          "My Dress-Up Darling",
          "A Boneca Vestida se Apaixona",
          "その着せ替え人形は恋をする",
        ],
        year: 2018,
        status: "ongoing",
        chapters: [
          {
            externalId: "mock-bisque-ch-1",
            chapterNumber: "1",
            volumeNumber: "1",
            title: "Alguém que vive em um mundo diferente do meu",
            language: "pt-BR",
            publishedAt: "2018-01-19T00:00:00Z",
            scanlationGroup: "Scanlation Teste Brasil",
            pages: [
              "https://uploads.mangadex.org/covers/aa6c76f7-5f5f-46b6-a800-911145f81b9b/test1.jpg",
            ],
          },
          {
            externalId: "mock-bisque-ch-2",
            chapterNumber: "2",
            volumeNumber: "1",
            title: "Ela quer que eu faça?",
            language: "pt-BR",
            publishedAt: "2018-02-02T00:00:00Z",
            scanlationGroup: "Scanlation Teste Brasil",
            pages: [
              "https://uploads.mangadex.org/covers/aa6c76f7-5f5f-46b6-a800-911145f81b9b/test2.jpg",
            ],
          },
          {
            externalId: "mock-bisque-ch-3",
            chapterNumber: "3",
            volumeNumber: "1",
            title: "Então vamos nos apressar",
            language: "pt-BR",
            publishedAt: "2018-02-16T00:00:00Z",
            scanlationGroup: "Scanlation Teste Brasil",
            pages: [
              "https://uploads.mangadex.org/covers/aa6c76f7-5f5f-46b6-a800-911145f81b9b/test3.jpg",
            ],
          },
        ],
      },
    ];
  }

  async searchWorks(query) {
    const q = query.toLowerCase();
    return this.works.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.alternativeTitles.some((alt) => alt.toLowerCase().includes(q)),
    );
  }

  async getWork(externalId) {
    return this.works.find((w) => w.externalId === externalId) || null;
  }

  async listChapters(externalId, _options = {}) {
    const work = this.works.find((w) => w.externalId === externalId);
    if (!work) return [];
    return work.chapters.map((c) => ({
      externalId: c.externalId,
      chapterNumber: c.chapterNumber,
      volumeNumber: c.volumeNumber,
      title: c.title,
      language: c.language,
      publishedAt: c.publishedAt,
      scanlationGroup: c.scanlationGroup,
    }));
  }

  async resolvePages(chapter) {
    const rawExternalId = chapter.external_id.startsWith("mock_provider:")
      ? chapter.external_id.replace(/^mock_provider:/, "")
      : chapter.external_id;

    for (const w of this.works) {
      const c = w.chapters.find((ch) => ch.externalId === rawExternalId);
      if (c) return c.pages;
    }
    throw new Error("Capítulo mock não encontrado");
  }
}

module.exports = { MockProvider };
