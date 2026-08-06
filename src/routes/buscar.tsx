import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { MangaCard } from "@/components/manga-card";
import { ProductState, CatalogSkeleton } from "@/components/product-states";
import { catalogService } from "@/services/catalog-service";
import type { CatalogItem } from "@/types/content";
export const Route = createFileRoute("/buscar")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : "" }),
  component: SearchPage,
});
function SearchPage() {
  const { q } = Route.useSearch();
  const [term, setTerm] = useState(q);
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(Boolean(q));
  useEffect(() => {
    const id = setTimeout(() => {
      setLoading(true);
      catalogService
        .search(term)
        .then(setResults)
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(id);
  }, [term]);
  return (
    <main className="page-shell pb-28">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            <Search />
            Busca inteligente
          </span>
          <h1>Buscar no catálogo</h1>
          <p>Pesquise em títulos, nomes alternativos e gêneros de todas as fontes.</p>
        </div>
      </div>
      <label className="search-large">
        <Search />
        <input
          autoFocus
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Ex.: fantasia, Blade of the North..."
        />
        <kbd>350ms</kbd>
      </label>
      <div className="mt-8">
        {loading ? (
          <CatalogSkeleton />
        ) : !term ? (
          <ProductState state="empty" />
        ) : results.length ? (
          <>
            <p className="mb-5 text-sm text-muted-foreground">
              {results.length} resultado(s) para “{term}”
            </p>
            <div className="catalog-grid">
              {results.map((x) => (
                <MangaCard key={x.id} manga={x} />
              ))}
            </div>
          </>
        ) : (
          <ProductState state="no-results" />
        )}
      </div>
    </main>
  );
}
