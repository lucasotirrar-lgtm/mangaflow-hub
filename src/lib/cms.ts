import { supabase } from "@/integrations/supabase/client";
import {
  destaques as destaquesEstaticos,
  generos as generosEstaticos,
  lancamentos,
  noticias as noticiasEstaticas,
  populares,
  ranking,
  type Manga,
  type Status,
} from "@/data/manga";

const BUCKET = "site-images";
const DEZ_ANOS = 60 * 60 * 24 * 365 * 10;

export type MangaRow = {
  id: string;
  title: string;
  synopsis: string;
  cover_url: string | null;
  rating: number;
  status: string;
  genres: string[];
  chapter: string;
  views: string;
  in_popular: boolean;
  in_releases: boolean;
  in_ranking: boolean;
  sort_order: number;
};

export type DestaqueRow = {
  id: string;
  title: string;
  synopsis: string;
  image_url: string | null;
  rank_label: string;
  rating: number;
  status: string;
  genres: string[];
  sort_order: number;
};

export type NoticiaRow = { id: string; texto: string; sort_order: number };
export type GeneroRow = {
  id: string;
  nome: string;
  image_url: string | null;
  sort_order: number;
};

export type CardManga = Manga & { cover: string };

export function rowToManga(row: MangaRow): Manga {
  return {
    title: row.title,
    rating: Number(row.rating),
    status: (row.status as Status) ?? "Em andamento",
    genres: row.genres ?? [],
    cover: row.cover_url ?? "",
    chapter: row.chapter,
    views: row.views,
  };
}

export async function fetchMangas(): Promise<MangaRow[]> {
  const { data, error } = await supabase
    .from("mangas")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MangaRow[];
}

export async function fetchDestaques(): Promise<DestaqueRow[]> {
  const { data, error } = await supabase
    .from("destaques")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DestaqueRow[];
}

export async function fetchNoticias(): Promise<NoticiaRow[]> {
  const { data, error } = await supabase
    .from("noticias")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as NoticiaRow[];
}

export async function fetchGeneros(): Promise<GeneroRow[]> {
  const { data, error } = await supabase
    .from("generos")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as GeneroRow[];
}

/** Faz upload da imagem e devolve uma URL assinada de longa duração. */
export async function uploadImagem(file: File, pasta: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${pasta}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, DEZ_ANOS);
  if (signError) throw signError;
  return data.signedUrl;
}

/* --- Conteúdo exibido no site: banco quando houver, senão o conteúdo padrão --- */

export const fallback = {
  destaques: destaquesEstaticos,
  noticias: noticiasEstaticas,
  generos: generosEstaticos,
  populares,
  lancamentos,
  ranking,
};

export function listaOuFallback(rows: MangaRow[] | undefined, campo: keyof MangaRow, padrao: Manga[]) {
  if (!rows) return padrao;
  const filtrados = rows.filter((r) => Boolean(r[campo]));
  return filtrados.length > 0 ? filtrados.map(rowToManga) : padrao;
}
