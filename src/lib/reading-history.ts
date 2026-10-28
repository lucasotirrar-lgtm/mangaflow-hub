import { useEffect, useState } from "react";
import type { CatalogItem } from "@/types/content";
import { safeStorage } from "@/lib/safe-storage";

const key = "mangaflow-reading-history-v1";
const changed = "mangaflow-reading-history-changed";

export type ReadingEntry = CatalogItem & {
  lastChapterId: string;
  lastChapterNumber: number;
  lastReadAt: string;
  lastPage?: number | undefined;
};

function read(): ReadingEntry[] {
  try {
    const raw = safeStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as ReadingEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: ReadingEntry[]) {
  try {
    safeStorage.setItem(key, JSON.stringify(entries.slice(0, 12)));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(changed));
    }
  } catch {
    // safeStorage handles fallbacks
  }
}

export function rememberReading(
  item: CatalogItem,
  chapterId: string,
  chapterNumber: number,
  page?: number,
) {
  const existing = read().find((c) => c.slug === item.slug && c.lastChapterId === chapterId);
  const entry: ReadingEntry = {
    ...item,
    lastChapterId: chapterId,
    lastChapterNumber: chapterNumber,
    lastReadAt: new Date().toISOString(),
    lastPage: page ?? existing?.lastPage ?? 1,
  };
  write([entry, ...read().filter((current) => current.slug !== item.slug)]);
}

export function updateReadingPage(slug: string, chapterId: string, page: number) {
  const current = read();
  const index = current.findIndex((entry) => entry.slug === slug);
  if (index >= 0 && current[index] && current[index].lastChapterId === chapterId) {
    if (current[index].lastPage === page) return;
    current[index] = {
      ...current[index],
      lastPage: page,
      lastReadAt: new Date().toISOString(),
    };
    write(current);
  }
}

export function getSavedReadingPage(slug: string, chapterId: string): number | undefined {
  const current = read();
  const found = current.find((entry) => entry.slug === slug && entry.lastChapterId === chapterId);
  return found?.lastPage;
}

export function clearReadingHistory() {
  safeStorage.removeItem(key);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(changed));
  }
}

export function removeReadingHistory(slug: string) {
  write(read().filter((current) => current.slug !== slug));
}

export function useReadingHistory() {
  const [entries, setEntries] = useState<ReadingEntry[]>([]);
  useEffect(() => {
    const refresh = () => setEntries(read());
    refresh();
    window.addEventListener(changed, refresh);
    return () => window.removeEventListener(changed, refresh);
  }, []);
  return entries;
}
