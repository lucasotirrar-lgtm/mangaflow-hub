import { useEffect, useState } from "react";
import type { CatalogItem } from "@/types/content";

const key = "mangaflow-reading-history-v1";
const changed = "mangaflow-reading-history-changed";

export type ReadingEntry = CatalogItem & {
  lastChapterId: string;
  lastChapterNumber: number;
  lastReadAt: string;
};

function read(): ReadingEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]") as ReadingEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: ReadingEntry[]) {
  localStorage.setItem(key, JSON.stringify(entries.slice(0, 12)));
  window.dispatchEvent(new Event(changed));
}

export function rememberReading(item: CatalogItem, chapterId: string, chapterNumber: number) {
  const entry: ReadingEntry = {
    ...item,
    lastChapterId: chapterId,
    lastChapterNumber: chapterNumber,
    lastReadAt: new Date().toISOString(),
  };
  write([entry, ...read().filter((current) => current.slug !== item.slug)]);
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
