import type { CatalogItem, ContentKind } from "@/types/content";

const TIMEOUT_MS = 12_000;
const API_URL = (process.env["MANGAFLOW_API_URL"] || "http://api:3100").replace(/\/$/, "");

type ApiChapter = {
  id: string;
  number: number;
  title: string;
  language: string;
  releasedAt: string;
  scanlationGroup?: string;
};

type ApiWork = {
  id: string;
  slug: string;
  title: string;
  alternativeTitle?: string;
  synopsis: string;
  cover: string;
  kind: ContentKind;
  ageRating: "Livre" | "14" | "16" | "18+";
  status: "Em andamento" | "Completo" | "Hiato";
  rating: number | null;
  year: number | null;
  genres: string[];
  language: string;
  latestChapter: number;
  sources: CatalogItem["sources"];
  chapters?: ApiChapter[];
};

async function request<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}${path}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`MangaFlow API HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function mapWork(work: ApiWork): CatalogItem {
  return {
    ...work,
    kind: work.kind,
    chapters: (work.chapters || []).map((chapter) => ({ ...chapter, read: false })),
  };
}

export async function listVpsCatalog(_query = "", limit = 24) {
  const payload = await request<{ results: ApiWork[] }>(
    `/api/v1/catalog?limit=${Math.min(limit, 48)}`,
  );
  return payload.results.map(mapWork);
}

export async function searchPublicCatalog(query: string, includeAdult: boolean, _limit = 24) {
  const payload = await request<{ results: ApiWork[] }>(
    `/api/v1/search?q=${encodeURIComponent(query)}&adult=${includeAdult}`,
  );
  return payload.results.map(mapWork);
}

export async function getCatalogWork(slug: string) {
  return mapWork(await request<ApiWork>(`/api/v1/works/${encodeURIComponent(slug)}`));
}

export async function getChapterPages(chapterId: string) {
  return request<{ pages: Array<{ index: number; url: string }> }>(
    `/api/v1/chapters/${encodeURIComponent(chapterId)}/pages`,
  );
}
