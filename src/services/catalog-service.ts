import type { CatalogItem } from "@/types/content";

export const catalog: CatalogItem[] = [];
const apiBase = (import.meta.env["VITE_CATALOG_API_URL"] || "").replace(/\/$/, "");

export type CatalogPageResponse = {
  results: CatalogItem[];
  page: number;
  limit: number;
  total: number;
};

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Catálogo indisponível (${response.status})`);
  return (await response.json()) as T;
}

export const catalogService = {
  async list(): Promise<CatalogItem[]> {
    return this.discover();
  },
  async discover(): Promise<CatalogItem[]> {
    return (await this.catalogPage({ limit: 24 })).results;
  },
  async catalogPage({
    page = 1,
    limit = 48,
    includeAdult = false,
  }: {
    page?: number;
    limit?: number;
    includeAdult?: boolean;
  } = {}): Promise<CatalogPageResponse> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      adult: String(includeAdult),
    });
    return request<CatalogPageResponse>(`/api/v1/catalog?${params.toString()}`);
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
