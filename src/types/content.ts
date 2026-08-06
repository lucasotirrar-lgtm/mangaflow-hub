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
  rating: number;
  year: number;
  genres: string[];
  language: string;
  latestChapter: number;
  progress?: number;
  sources: ContentSource[];
  chapters: Chapter[];
};

export type AsyncState = "loading" | "ready" | "empty" | "error" | "offline" | "unauthorized";
