import cover1 from "@/assets/cover-1.jpg";
import cover2 from "@/assets/cover-2.jpg";
import cover3 from "@/assets/cover-3.jpg";
import cover4 from "@/assets/cover-4.jpg";
import cover5 from "@/assets/cover-5.jpg";
import cover6 from "@/assets/cover-6.jpg";
import hero1 from "@/assets/hero-1.jpg";
import type { CatalogItem } from "@/types/content";

const chapters = (total: number) =>
  Array.from({ length: Math.min(total, 12) }, (_, i) => ({
    id: `cap-${total - i}`,
    number: total - i,
    title: i === 0 ? "O próximo passo" : `Capítulo ${total - i}`,
    language: "Português (BR)",
    releasedAt: i === 0 ? "Hoje" : `${i + 1} dias atrás`,
    read: i > 5,
  }));

export const catalog: CatalogItem[] = [
  {
    id: "1",
    slug: "a-herdeira-da-lua",
    title: "A Herdeira da Lua",
    alternativeTitle: "Moonlit Heir",
    synopsis:
      "Uma cartógrafa de memórias descobre que a lua guarda os nomes apagados do reino — inclusive o dela.",
    cover: cover1,
    hero: hero1,
    kind: "manhwa",
    ageRating: "14",
    status: "Em andamento",
    rating: 4.9,
    year: 2025,
    genres: ["Fantasia", "Romance"],
    language: "Português (BR)",
    latestChapter: 84,
    progress: 62,
    sources: [
      { id: "local", label: "Biblioteca local", role: "primary", available: true },
      { id: "anilist", label: "AniList", role: "metadata", available: true },
      { id: "mangadex", label: "MangaDex", role: "alternative", available: true },
    ],
    chapters: chapters(84),
  },
  {
    id: "2",
    slug: "blade-of-the-north",
    title: "Blade of the North",
    synopsis:
      "O último discípulo de uma escola esquecida atravessa o norte em busca da verdade sobre seu mestre.",
    cover: cover2,
    kind: "manhwa",
    ageRating: "16",
    status: "Em andamento",
    rating: 4.8,
    year: 2024,
    genres: ["Ação", "Aventura"],
    language: "Português (BR)",
    latestChapter: 126,
    progress: 18,
    sources: [
      { id: "suwayomi", label: "Suwayomi", role: "primary", available: true },
      { id: "anilist", label: "AniList", role: "metadata", available: true },
    ],
    chapters: chapters(126),
  },
  {
    id: "3",
    slug: "cafe-das-estrelas",
    title: "Café das Estrelas",
    synopsis:
      "Um café que só abre à meia-noite conecta pessoas que ainda têm algo importante a dizer.",
    cover: cover3,
    kind: "manga",
    ageRating: "Livre",
    status: "Completo",
    rating: 4.7,
    year: 2022,
    genres: ["Drama", "Slice of Life"],
    language: "Português (BR)",
    latestChapter: 42,
    sources: [
      { id: "local", label: "Biblioteca local", role: "primary", available: true },
      { id: "mangadex", label: "MangaDex", role: "alternative", available: true },
    ],
    chapters: chapters(42),
  },
  {
    id: "4",
    slug: "neon-requiem",
    title: "Neon Requiem",
    synopsis:
      "Em uma cidade onde lembranças viram moeda, uma investigadora caça o próprio passado.",
    cover: cover4,
    kind: "manga",
    ageRating: "18+",
    status: "Em andamento",
    rating: 4.6,
    year: 2025,
    genres: ["Cyberpunk", "Mistério"],
    language: "Inglês",
    latestChapter: 31,
    sources: [
      { id: "consumet", label: "Consumet", role: "primary", available: true },
      { id: "anilist", label: "AniList", role: "metadata", available: true },
    ],
    chapters: chapters(31),
  },
  {
    id: "5",
    slug: "the-quiet-archmage",
    title: "The Quiet Archmage",
    synopsis:
      "Uma arquimaga reclusa retorna à academia sob uma identidade falsa para impedir uma guerra.",
    cover: cover5,
    kind: "light-novel",
    ageRating: "14",
    status: "Em andamento",
    rating: 4.5,
    year: 2023,
    genres: ["Fantasia", "Academia"],
    language: "Português (BR)",
    latestChapter: 57,
    progress: 44,
    sources: [
      { id: "local", label: "Biblioteca local", role: "primary", available: true },
      { id: "anilist", label: "AniList", role: "metadata", available: true },
    ],
    chapters: chapters(57),
  },
  {
    id: "6",
    slug: "rosas-de-inverno",
    title: "Rosas de Inverno",
    synopsis:
      "Duas famílias rivais, um inverno sem fim e uma promessa capaz de mudar o destino de ambas.",
    cover: cover6,
    kind: "manhwa",
    ageRating: "18+",
    status: "Hiato",
    rating: 4.4,
    year: 2021,
    genres: ["Romance", "Drama"],
    language: "Português (BR)",
    latestChapter: 68,
    sources: [
      { id: "suwayomi", label: "Suwayomi", role: "primary", available: false },
      { id: "mangadex", label: "MangaDex", role: "alternative", available: true },
    ],
    chapters: chapters(68),
  },
];

export const catalogService = {
  async list(): Promise<CatalogItem[]> {
    return catalog;
  },
  async getBySlug(slug: string): Promise<CatalogItem | undefined> {
    return catalog.find((item) => item.slug === slug);
  },
  async search(query: string): Promise<CatalogItem[]> {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return q
      ? catalog.filter((item) =>
          [item.title, item.alternativeTitle, item.genres.join(" ")]
            .filter(Boolean)
            .some((value) => value!.toLocaleLowerCase("pt-BR").includes(q)),
        )
      : [];
  },
};

// Contrato único para o backend: novos provedores são adaptados no servidor e não vazam para a UI.
export type CatalogService = typeof catalogService;
