import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { CatalogPage, type CatalogSearch } from "@/components/catalog-page";
export const Route = createFileRoute("/descobrir")({
  validateSearch: validateCatalogSearch,
  head: () => ({
    meta: [
      { title: "Descobrir Mangás e Manhwas — Yae Manga House" },
      {
        name: "description",
        content: "Explore novos mangás, manhwas e light novels com filtros por tipo, status e classificação.",
      },
      { property: "og:title", content: "Descobrir — Yae Manga House" },
      {
        property: "og:description",
        content: "Encontre seu próximo mangá ou manhwa favorito na Yae Manga House.",
      },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const onSearchChange = useCallback(
    (next: CatalogSearch) => navigate({ search: next }),
    [navigate],
  );
  return <CatalogPage search={search} onSearchChange={onSearchChange} />;
}

function validateCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  return {
    age: ["14", "18+"].includes(String(search["age"])) ? String(search["age"]) : undefined,
    kind: ["manga", "manhwa", "light-novel"].includes(String(search["kind"]))
      ? String(search["kind"])
      : undefined,
    limit: [24, 48, 60].includes(Number(search["limit"])) ? Number(search["limit"]) : 48,
    page: Math.max(Number(search["page"]) || 1, 1),
    status: ["Em andamento", "Completo", "Hiato"].includes(String(search["status"]))
      ? String(search["status"])
      : undefined,
  };
}
