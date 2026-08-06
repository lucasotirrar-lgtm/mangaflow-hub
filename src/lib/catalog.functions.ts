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
