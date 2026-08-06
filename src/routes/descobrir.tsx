import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "@/components/catalog-page";
export const Route = createFileRoute("/descobrir")({
  validateSearch: (search: Record<string, unknown>) => ({
    age: typeof search.age === "string" ? search.age : undefined,
  }),
  component: () => <CatalogPage />,
});
