import type { CatalogItem } from "@/types/content";

export const catalog: CatalogItem[] = [];

async function request<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Catálogo indisponível (${response.status})`);
  return (await response.json()) as T;
}

export const catalogService = {
  async list(): Promise<CatalogItem[]> {
    return this.discover();
  },
  async discover(): Promise<CatalogItem[]> {
    return (await request<{ results: CatalogItem[] }>("/api/v1/catalog?limit=24")).results;
  },
  async getBySlug(slug: string): Promise<CatalogItem | undefined> {
    try {
      return await request<CatalogItem>(`/api/v1/works/${encodeURIComponent(slug)}`);
    } catch {
      return undefined;
    }
  },
  async search(query: string): Promise<CatalogItem[]> {
    const term = query.trim();
    if (!term) return [];
    return (
      await request<{ results: CatalogItem[] }>(`/api/v1/search?q=${encodeURIComponent(term)}`)
    ).results;
  },
  async pages(chapterId: string) {
    return request<{ pages: Array<{ index: number; url: string }> }>(
      `/api/v1/chapters/${encodeURIComponent(chapterId)}/pages`,
    );
  },
};

export type CatalogService = typeof catalogService;
