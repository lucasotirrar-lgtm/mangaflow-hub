import type {
  AgeRating,
  CatalogItem,
  ContentKind,
  ContentSource,
  ProviderId,
} from "@/types/content";

type ProviderResult = CatalogItem;
type ProviderSearch = (
  query: string,
  includeAdult: boolean,
  limit: number,
) => Promise<ProviderResult[]>;

const TIMEOUT_MS = 8_000;

function remoteSlug(provider: ProviderId, id: string | number) {
  return `external--${provider}--${id}`;
}

function source(id: ProviderId, label: string): ContentSource[] {
  return [{ id, label, role: "metadata", available: true }];
}

function localize(values: Record<string, string> | undefined, fallback = "Sem sinopse") {
  if (!values) return fallback;
  return (
    values["pt-br"] ||
    values["pt"] ||
    values["en"] ||
    values["ja-ro"] ||
    Object.values(values)[0] ||
    fallback
  );
}

function year(value: string | number | null | undefined) {
  const result = Number(value);
  return Number.isFinite(result) && result > 0 ? result : new Date().getFullYear();
}

function kindFromLanguage(language: string | undefined): ContentKind {
  if (language === "ko") return "manhwa";
  if (language === "ja" || language === "zh") return "manga";
  return "light-novel";
}

function ageFromAdult(adult: boolean): AgeRating {
  return adult ? "18+" : "14";
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

const searchAniList: ProviderSearch = async (query, includeAdult, limit) => {
  type AniListResponse = {
    data?: {
      Page?: {
        media?: Array<{
          id: number;
          title?: Record<string, string>;
          description?: string | null;
          coverImage?: { extraLarge?: string; large?: string };
          format?: string | null;
          status?: string | null;
          averageScore?: number | null;
          startDate?: { year?: number | null };
          genres?: string[];
          chapters?: number | null;
          isAdult?: boolean;
        }>;
      };
    };
  };
  const payload = await requestJson<AniListResponse>("https://graphql.anilist.co", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      query: `query ($search: String, $perPage: Int, $isAdult: Boolean) {
        Page(page: 1, perPage: $perPage) {
          media(search: $search, type: MANGA, isAdult: $isAdult) {
            id title { romaji english native } description coverImage { extraLarge large }
            format status averageScore startDate { year } genres chapters isAdult
          }
        }
      }`,
      variables: { search: query, perPage: limit, isAdult: includeAdult },
    }),
  });
  return (payload.data?.Page?.media ?? []).map((item) => ({
    id: `anilist:${item.id}`,
    slug: remoteSlug("anilist", item.id),
    title: localize(item.title, "Título sem nome"),
    ...(item.title?.["native"] ? { alternativeTitle: item.title["native"] } : {}),
    synopsis: item.description?.replace(/<[^>]+>/g, "") || "Sem sinopse disponível.",
    cover: item.coverImage?.extraLarge || item.coverImage?.large || "",
    kind: item.format === "NOVEL" ? "light-novel" : "manga",
    ageRating: ageFromAdult(Boolean(item.isAdult)),
    status: item.status === "FINISHED" ? "Completo" : "Em andamento",
    rating: Math.max(0, (item.averageScore ?? 0) / 20),
    year: year(item.startDate?.year),
    genres: item.genres ?? [],
    language: "Metadados globais",
    latestChapter: item.chapters ?? 0,
    sources: source("anilist", "AniList"),
    chapters: [],
  }));
};

const searchMangaDex: ProviderSearch = async (query, includeAdult, limit) => {
  type MangaDexResponse = {
    data?: Array<{
      id: string;
      attributes?: {
        title?: Record<string, string>;
        altTitles?: Array<Record<string, string>>;
        description?: Record<string, string>;
        originalLanguage?: string;
        contentRating?: "safe" | "suggestive" | "erotica" | "pornographic";
        status?: "ongoing" | "completed" | "hiatus" | "cancelled";
        year?: number;
        tags?: Array<{ attributes?: { name?: Record<string, string> } }>;
      };
      relationships?: Array<{ type: string; attributes?: { fileName?: string } }>;
    }>;
  };
  const ratings = includeAdult
    ? ["safe", "suggestive", "erotica", "pornographic"]
    : ["safe", "suggestive"];
  const params = new URLSearchParams({ title: query, limit: String(limit), includes: "cover_art" });
  for (const rating of ratings) params.append("contentRating[]", rating);
  const payload = await requestJson<MangaDexResponse>(`https://api.mangadex.org/manga?${params}`);
  return (payload.data ?? []).map((item) => {
    const attrs = item.attributes;
    const cover = item.relationships?.find((relationship) => relationship.type === "cover_art")
      ?.attributes?.fileName;
    const adult = attrs?.contentRating === "erotica" || attrs?.contentRating === "pornographic";
    return {
      id: `mangadex:${item.id}`,
      slug: remoteSlug("mangadex", item.id),
      title: localize(attrs?.title, "Título sem nome"),
      ...(attrs?.altTitles?.map((title) => localize(title, "")).find(Boolean)
        ? { alternativeTitle: attrs.altTitles.map((title) => localize(title, "")).find(Boolean)! }
        : {}),
      synopsis: localize(attrs?.description),
      cover: cover ? `https://uploads.mangadex.org/covers/${item.id}/${cover}` : "",
      kind: kindFromLanguage(attrs?.originalLanguage),
      ageRating: ageFromAdult(adult),
      status:
        attrs?.status === "completed"
          ? "Completo"
          : attrs?.status === "hiatus"
            ? "Hiato"
            : "Em andamento",
      rating: 0,
      year: year(attrs?.year),
      genres: (attrs?.tags ?? []).map((tag) => localize(tag.attributes?.name, "")).filter(Boolean),
      language: "Português (BR) quando disponível",
      latestChapter: 0,
      sources: source("mangadex", "MangaDex"),
      chapters: [],
    };
  });
};

const searchJikan: ProviderSearch = async (query, includeAdult, limit) => {
  if (includeAdult) return [];
  type JikanResponse = {
    data?: Array<{
      mal_id: number;
      title: string;
      title_japanese?: string;
      synopsis?: string | null;
      images?: { jpg?: { large_image_url?: string; image_url?: string } };
      type?: string;
      status?: string;
      score?: number | null;
      published?: { from?: string | null };
      genres?: Array<{ name: string }>;
      chapters?: number | null;
    }>;
  };
  const payload = await requestJson<JikanResponse>(
    `https://api.jikan.moe/v4/manga?${new URLSearchParams({ q: query, limit: String(limit), sfw: "true" })}`,
  );
  return (payload.data ?? []).map((item) => ({
    id: `jikan:${item.mal_id}`,
    slug: remoteSlug("jikan", item.mal_id),
    title: item.title,
    ...(item.title_japanese ? { alternativeTitle: item.title_japanese } : {}),
    synopsis: item.synopsis || "Sem sinopse disponível.",
    cover: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || "",
    kind: item.type === "Light Novel" || item.type === "Novel" ? "light-novel" : "manga",
    ageRating: "14",
    status: item.status?.toLowerCase().includes("finished") ? "Completo" : "Em andamento",
    rating: item.score ?? 0,
    year: year(item.published?.from?.slice(0, 4)),
    genres: (item.genres ?? []).map((genre) => genre.name),
    language: "Metadados globais",
    latestChapter: item.chapters ?? 0,
    sources: source("jikan", "Jikan / MyAnimeList"),
    chapters: [],
  }));
};

const providers: ProviderSearch[] = [searchMangaDex, searchAniList, searchJikan];

function dedupe(items: CatalogItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchPublicCatalog(query: string, includeAdult: boolean, limit: number) {
  const settled = await Promise.allSettled(
    providers.map((provider) => provider(query, includeAdult, limit)),
  );
  return dedupe(
    settled.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
  ).slice(0, limit);
}

export function isExternalSlug(slug: string) {
  return /^external--(?:anilist|mangadex|jikan)--.+$/.test(slug);
}
