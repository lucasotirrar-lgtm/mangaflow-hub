import type { CatalogItem } from "@/types/content";
import {
  getPublicChapterPages,
  getPublicWork,
  listCachedCatalog,
  searchPublicCatalog,
} from "@/lib/catalog.functions";

// Compatibilidade temporária para telas que serão alimentadas pelo backend.
// Não contém obras fictícias: falhas são tratadas como estado vazio/indisponível.
export const catalog: CatalogItem[] = [];

export const catalogService = {
  async list(): Promise<CatalogItem[]> {
    return listCachedCatalog();
  },
  async discover(): Promise<CatalogItem[]> {
    return listCachedCatalog();
  },
  async getBySlug(slug: string): Promise<CatalogItem | undefined> {
    try {
      return await getPublicWork({ data: { slug } });
    } catch {
      return undefined;
    }
  },
  async search(query: string): Promise<CatalogItem[]> {
    const q = query.trim();
    if (!q) return [];
    return searchPublicCatalog({ data: { query: q, includeAdult: false } });
  },
  async pages(chapterId: string) {
    return getPublicChapterPages({ data: { chapterId } });
  },
};

export type CatalogService = typeof catalogService;
