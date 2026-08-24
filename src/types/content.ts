export type ContentKind = "manga" | "manhwa" | "light-novel";
export type AgeRating = "Livre" | "14" | "16" | "18+";
export type ProviderId = "local" | "mangadex" | "consumet" | "suwayomi" | "anilist" | "jikan";

export type ContentSource = {
  id: ProviderId;
  label: string;
  role: "primary" | "metadata" | "alternative";
  available: boolean;
};

export type Chapter = {
  id: string;
  number: number;
  title: string;
  language: string;
  releasedAt: string;
  read?: boolean;
  scanlationGroup?: string;
  alternatives?: Chapter[];
};

export type CatalogItem = {
  id: string;
  slug: string;
  title: string;
  alternativeTitle?: string;
  synopsis: string;
  cover: string;
  hero?: string;
  kind: ContentKind;
  ageRating: AgeRating;
  status: "Em andamento" | "Completo" | "Hiato";
  rating: number | null;
  year: number | null;
  genres: string[];
  language: string;
  latestChapter: number;
  chapterCount?: number;
  metadataLanguages?: { title: string | null; synopsis: string | null };
  progress?: number;
  sources: ContentSource[];
  chapters: Chapter[];
};

export type AsyncState = "loading" | "ready" | "empty" | "error" | "offline" | "unauthorized";
