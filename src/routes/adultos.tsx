import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback } from "react";
import { CatalogPage, type CatalogSearch } from "@/components/catalog-page";
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
        <section className="side-card mx-auto max-w-xl text-center">
          <h1 className="font-display text-2xl font-extrabold">Lista adulta desativada</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Ative o conteúdo adulto nas configurações para exibir esta lista neste dispositivo.
          </p>
          <Link to="/configuracoes" className="secondary-button mt-5">
            Abrir configurações
          </Link>
        </section>
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
