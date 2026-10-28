import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { CatalogPage, type CatalogSearch } from "@/components/catalog-page";
export const Route = createFileRoute("/mangas")({
  validateSearch: validateCatalogSearch,
  head: () => ({
    meta: [
      { title: "Catálogo Completo de Mangás — Yae Manga House" },
      {
        name: "description",
        content: "Todas as obras disponíveis com capítulos traduzidos em português do Brasil.",
      },
      { property: "og:title", content: "Catálogo de Mangás — Yae Manga House" },
      {
        property: "og:description",
        content: "Navegue pelo catálogo completo de mangás, manhwas e light novels.",
      },
    ],
  }),
  component: MangasPage,
});

function MangasPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const onSearchChange = useCallback(
    (next: CatalogSearch) => navigate({ search: next }),
    [navigate],
  );
  return (
    <CatalogPage
      title="Catálogo completo"
      description="Todas as obras disponíveis nas suas fontes, em uma visão unificada."
      search={search}
      onSearchChange={onSearchChange}
    />
  );
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
