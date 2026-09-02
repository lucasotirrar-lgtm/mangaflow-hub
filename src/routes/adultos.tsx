import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback } from "react";
import { CatalogPage, type CatalogSearch } from "@/components/catalog-page";
import { ProductState } from "@/components/product-states";
import { useAdultContent } from "@/lib/adult-content";

export const Route = createFileRoute("/adultos")({
  validateSearch: validateCatalogSearch,
  component: AdultList,
});

function AdultList() {
  const adult = useAdultContent();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const onSearchChange = useCallback(
    (next: CatalogSearch) => navigate({ search: next }),
    [navigate],
  );
  if (!adult.adultEnabled)
    return (
      <main className="page-shell py-12">
        <ProductState
          state="empty"
          action={
            <Link to="/configuracoes" className="secondary-button">
              Abrir configurações
            </Link>
          }
        />
      </main>
    );
  return (
    <CatalogPage
      title="Lista adulta"
      description="Obras adultas com capítulos disponíveis em português do Brasil."
      search={search}
      onSearchChange={onSearchChange}
      adultOnly
    />
  );
}

function validateCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  return {
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
