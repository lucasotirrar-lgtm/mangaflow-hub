import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { MangaCard } from "@/components/manga-card";
import { ProductState, CatalogSkeleton } from "@/components/product-states";
import { catalogService } from "@/services/catalog-service";
import type { CatalogItem } from "@/types/content";

type SearchRouteSearch = { q?: string | undefined; page?: number | undefined };

export const Route = createFileRoute("/buscar")({
  validateSearch: (s: Record<string, unknown>): SearchRouteSearch => ({
    q: typeof s["q"] === "string" ? s["q"] : "",
    page: Math.max(Number(s["page"]) || 1, 1),
  }),
  head: () => ({
    meta: [
      { title: "Buscar Obras — Yae Manga House" },
      {
        name: "description",
        content: "Pesquise por títulos, gêneros, autores e sinopses em nosso catálogo de mangás.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q = "", page = 1 } = Route.useSearch();
  const navigate = useNavigate();
  const [term, setTerm] = useState(q);
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(Boolean(q));
  const [failed, setFailed] = useState(false);
  useEffect(() => setTerm(q), [q]);
  useEffect(() => {
    const value = q.trim();
    if (!value) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setFailed(false);
    document.title = `"${value}" — Busca | Yae Manga House`;
    catalogService
      .search(value, page)
      .then((response) => {
        if (!active) return;
        setResults(response.results);
        setTotal(response.total);
      })
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      document.title = "Yae Manga House";
    };
  }, [page, q]);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    navigate({ to: "/buscar", search: { q: term.trim(), page: 1 } });
  };
  const totalPages = Math.max(1, Math.ceil(total / 24));
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
      <form className="search-large" onSubmit={submit}>
        <Search />
        <input
          autoFocus
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Ex.: fantasia, Blade of the North..."
        />
        <kbd>Enter</kbd>
      </form>
      <div className="mt-8">
        {loading ? (
          <CatalogSkeleton />
        ) : failed ? (
          <ProductState
            state="error"
            action={
              <button
                className="secondary-button"
                onClick={() => navigate({ to: "/buscar", search: { q, page } })}
              >
                Tentar novamente
              </button>
            }
          />
        ) : !q ? (
          <div className="state-panel" role="status">
            <Search className="h-7 w-7 text-primary" />
            <h2>O que você deseja ler hoje?</h2>
            <p>
              Digite o título de uma obra, gênero, autor ou palavra-chave para buscar em todo o catálogo.
            </p>
          </div>
        ) : results.length ? (
          <>
            <p className="mb-5 text-sm text-muted-foreground">
              {total.toLocaleString("pt-BR")} resultado(s) para “{q}”
            </p>
            <div className="catalog-grid">
              {results.map((x) => (
                <MangaCard key={x.id} manga={x} />
              ))}
            </div>
            {totalPages > 1 && (
              <nav className="mt-10 flex justify-center gap-3" aria-label="Paginação da busca">
                <button
                  className="secondary-button"
                  disabled={page === 1}
                  onClick={() => navigate({ to: "/buscar", search: { q, page: page - 1 } })}
                >
                  Anterior
                </button>
                <span className="self-center text-sm">
                  Página {page} de {totalPages}
                </span>
                <button
                  className="secondary-button"
                  disabled={page === totalPages}
                  onClick={() => navigate({ to: "/buscar", search: { q, page: page + 1 } })}
                >
                  Próxima
                </button>
              </nav>
            )}
          </>
        ) : (
          <ProductState state="no-results" />
        )}
      </div>
    </main>
  );
}
