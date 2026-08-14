import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { MangaCard } from "@/components/manga-card";
import { CatalogSkeleton, ProductState } from "@/components/product-states";
import { catalogService } from "@/services/catalog-service";
import type { CatalogItem } from "@/types/content";

export function CatalogPage({
  title = "Descobrir",
  description = "Encontre sua próxima leitura em português do Brasil.",
  initialAge = "todos",
}: {
  title?: string;
  description?: string;
  initialAge?: string;
}) {
  const pageSize = 48;
  const [kind, setKind] = useState("todos");
  const [age, setAge] = useState(initialAge);
  const [status, setStatus] = useState("todos");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const includeAdult = age === "18+";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    catalogService
      .catalogPage({ page, limit: pageSize, includeAdult })
      .then((response) => {
        if (!active) return;
        setItems(response.results);
        setTotal(response.total);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [includeAdult, page]);

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (kind === "todos" || item.kind === kind) &&
          (age === "todos" || item.ageRating === age) &&
          (status === "todos" || item.status === status),
      ),
    [items, kind, age, status],
  );
  const reset = () => {
    setKind("todos");
    setAge("todos");
    setStatus("todos");
    setPage(1);
  };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasLocalFilters = kind !== "todos" || age !== "todos" || status !== "todos";
  const goToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="page-shell pb-28">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            <SlidersHorizontal />
            Catálogo unificado
          </span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <span className="result-count">
          {loading
            ? "Carregando"
            : hasLocalFilters
              ? `${filtered.length} nesta página · ${total.toLocaleString("pt-BR")} no catálogo`
              : `${total.toLocaleString("pt-BR")} ${total === 1 ? "obra" : "obras"}`}
        </span>
      </div>
      <div className="filter-bar">
        <Filter
          label="Formato"
          value={kind}
          set={(value) => {
            setKind(value);
            setPage(1);
          }}
          options={[
            ["todos", "Todos"],
            ["manga", "Mangá"],
            ["manhwa", "Manhwa"],
            ["light-novel", "Light novel"],
          ]}
        />
        <Filter
          label="Faixa etária"
          value={age}
          set={(value) => {
            setAge(value);
            setPage(1);
          }}
          options={[
            ["todos", "Todas"],
            ["Livre", "Livre"],
            ["14", "14"],
            ["16", "16"],
            ["18+", "18+"],
          ]}
        />
        <Filter
          label="Status"
          value={status}
          set={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[
            ["todos", "Todos"],
            ["Em andamento", "Em andamento"],
            ["Completo", "Completo"],
            ["Hiato", "Hiato"],
          ]}
        />
        {(kind !== "todos" || age !== "todos" || status !== "todos") && (
          <button onClick={reset} className="clear-filter">
            <X />
            Limpar
          </button>
        )}
      </div>
      {loading ? (
        <div className="mt-8">
          <CatalogSkeleton />
        </div>
      ) : failed ? (
        <ProductState
          state="error"
          action={
            <button onClick={() => window.location.reload()} className="secondary-button">
              Tentar novamente
            </button>
          }
        />
      ) : filtered.length ? (
        <>
          <div className="catalog-grid mt-8">
            {filtered.map((item) => (
              <MangaCard key={item.id} manga={item} />
            ))}
          </div>
          {totalPages > 1 && (
            <nav
              className="mt-10 flex flex-wrap items-center justify-center gap-3"
              aria-label="Paginação do catálogo"
            >
              <button
                type="button"
                className="secondary-button disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => goToPage(1)}
                disabled={page === 1}
              >
                Primeira
              </button>
              <button
                type="button"
                className="secondary-button disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
              >
                Anterior
              </button>
              <span className="text-sm font-bold text-muted-foreground">
                Página {page.toLocaleString("pt-BR")} de {totalPages.toLocaleString("pt-BR")}
              </span>
              <button
                type="button"
                className="secondary-button disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
              >
                Próxima
              </button>
              <button
                type="button"
                className="secondary-button disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => goToPage(totalPages)}
                disabled={page === totalPages}
              >
                Última
              </button>
            </nav>
          )}
        </>
      ) : (
        <ProductState
          state="no-results"
          action={
            <button onClick={reset} className="secondary-button">
              Limpar filtros
            </button>
          }
        />
      )}
    </main>
  );
}

function Filter({
  label,
  value,
  set,
  options,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  options: string[][];
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => set(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
