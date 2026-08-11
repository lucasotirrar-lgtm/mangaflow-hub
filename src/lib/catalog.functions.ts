import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const searchInput = z.object({
  query: z.string().trim().min(2).max(120),
  includeAdult: z.boolean().default(false),
  limit: z.number().int().min(1).max(24).default(18),
});

/** Public metadata only. Reader pages are always delivered by an authorized backend source. */
export const searchPublicCatalog = createServerFn({ method: "POST" })
  .validator(searchInput)
  .handler(async ({ data }) => {
    const { searchPublicCatalog: search } = await import("./catalog-providers.server");
    return search(data.query, data.includeAdult, data.limit);
  });

export const listCachedCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { listVpsCatalog } = await import("./catalog-providers.server");
  return listVpsCatalog();
});

export const getPublicWork = createServerFn({ method: "GET" })
  .validator((value: { slug: string }) => value)
  .handler(async ({ data }) => {
    const { getCatalogWork } = await import("./catalog-providers.server");
    return getCatalogWork(data.slug);
  });

export const getPublicChapterPages = createServerFn({ method: "GET" })
  .validator((value: { chapterId: string }) => value)
  .handler(async ({ data }) => {
    const { getChapterPages } = await import("./catalog-providers.server");
    return getChapterPages(data.chapterId);
  });
