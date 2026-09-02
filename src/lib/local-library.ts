import { useEffect, useState } from "react";
import type { CatalogItem } from "@/types/content";

const key = "mangaflow-library-v1";
const changed = "mangaflow-library-changed";

export type LocalLibraryEntry = Pick<
  CatalogItem,
  "slug" | "title" | "cover" | "kind" | "ageRating" | "status" | "latestChapter" | "sources"
> & {
  addedAt: string;
  favorite: boolean;
};

function read(): LocalLibraryEntry[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]") as LocalLibraryEntry[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function write(entries: LocalLibraryEntry[]) {
  localStorage.setItem(key, JSON.stringify(entries));
  window.dispatchEvent(new Event(changed));
}

export function useLocalLibrary() {
  const [entries, setEntries] = useState<LocalLibraryEntry[]>([]);
  useEffect(() => {
    const refresh = () => setEntries(read());
    refresh();
    window.addEventListener(changed, refresh);
    return () => window.removeEventListener(changed, refresh);
  }, []);
  const add = (item: CatalogItem) => {
    const current = read();
    if (!current.some((entry) => entry.slug === item.slug)) {
      write([{ ...item, addedAt: new Date().toISOString(), favorite: false }, ...current]);
    }
  };
  const remove = (slug: string) => write(read().filter((entry) => entry.slug !== slug));
  const toggleFavorite = (slug: string) =>
    write(
      read().map((entry) =>
        entry.slug === slug ? { ...entry, favorite: !entry.favorite } : entry,
      ),
    );
  return { entries, add, remove, toggleFavorite };
}
