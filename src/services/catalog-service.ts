import type { CatalogItem, Chapter } from "@/types/content";

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

const normalizeWork = (work: CatalogItem): CatalogItem => ({
  ...work,
  chapters: work.chapters || [],
});

export type ChapterPageResponse = {
  results: Chapter[];
  page: number;
  limit: number;
  total: number;
};

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
    kind = "todos",
    age = "todos",
    status = "todos",
    query = "",
  }: {
    page?: number;
    limit?: number;
    includeAdult?: boolean;
    kind?: string;
    age?: string;
    status?: string;
    query?: string;
  } = {}): Promise<CatalogPageResponse> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    const requestedAge = age === "todos" && includeAdult ? "18+" : age;
    if (requestedAge !== "todos") params.set("age", requestedAge);
    if (kind !== "todos") params.set("kind", kind);
    if (status !== "todos") params.set("status", status);
    if (query.trim()) params.set("q", query.trim());
    const payload = await request<CatalogPageResponse>(`/api/v1/catalog?${params.toString()}`);
    return { ...payload, results: payload.results.map(normalizeWork) };
  },
  async getBySlug(slug: string): Promise<CatalogItem | undefined> {
    try {
      return normalizeWork(await request<CatalogItem>(`/api/v1/works/${encodeURIComponent(slug)}`));
    } catch {
      return undefined;
    }
  },
  async search(query: string): Promise<CatalogItem[]> {
    const term = query.trim();
    if (!term) return [];
    return (
      await request<{ results: CatalogItem[] }>(`/api/v1/search?q=${encodeURIComponent(term)}`)
    ).results.map(normalizeWork);
  },
  async chapters(slug: string, page = 1, limit = 100): Promise<ChapterPageResponse> {
    return request<ChapterPageResponse>(
      `/api/v1/works/${encodeURIComponent(slug)}/chapters?page=${page}&limit=${limit}`,
    );
  },
  async chapter(chapterId: string) {
    return request<Chapter & { workSlug: string; workTitle: string }>(
      `/api/v1/chapters/${encodeURIComponent(chapterId)}`,
    );
  },
  async pages(chapterId: string) {
    return request<{ pages: Array<{ index: number; url: string }> }>(
      `/api/v1/chapters/${encodeURIComponent(chapterId)}/pages`,
    );
  },
};

export type CatalogService = typeof catalogService;
