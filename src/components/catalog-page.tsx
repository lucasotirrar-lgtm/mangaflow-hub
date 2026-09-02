import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { MangaCard } from "@/components/manga-card";
import { CatalogSkeleton, ProductState } from "@/components/product-states";
import { catalogService } from "@/services/catalog-service";
import type { CatalogItem } from "@/types/content";

export type CatalogSearch = {
  age?: string | undefined;
  kind?: string | undefined;
  limit?: number | undefined;
  page?: number | undefined;
  status?: string | undefined;
};

export function CatalogPage({
  title = "Descobrir",
  description = "Encontre sua próxima leitura em português do Brasil.",
  search,
  onSearchChange,
  adultOnly = false,
}: {
  title?: string;
  description?: string;
  search: CatalogSearch;
  onSearchChange: (search: CatalogSearch) => void;
  adultOnly?: boolean;
}) {
  const kind = search.kind ?? "todos";
  const age = adultOnly ? "18+" : (search.age ?? "todos");
  const status = search.status ?? "todos";
  const pageSize = search.limit ?? 48;
  const [items, setItems] = useState<CatalogItem[]>([]);
  const page = search.page ?? 1;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    catalogService
      .catalogPage({ page, limit: pageSize, kind, age, status })
      .then((response) => {
        if (!active) return;
        setItems(response.results);
        setTotal(response.total);
        if (response.page !== page) {
          onSearchChange({
            age: search.age,
            kind: search.kind,
            limit: pageSize,
            page: response.page,
            status: search.status,
          });
        }
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
  }, [age, kind, onSearchChange, page, pageSize, search.age, search.kind, search.status, status]);

  const reset = () => {
    onSearchChange({ limit: pageSize });
  };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = kind !== "todos" || age !== "todos" || status !== "todos";
  const goToPage = (nextPage: number) => {
    onSearchChange({ ...search, page: Math.min(Math.max(nextPage, 1), totalPages) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const setFilter = (key: "kind" | "age" | "status", value: string) =>
    onSearchChange({ ...search, [key]: value === "todos" ? undefined : value, page: 1 });
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);

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
            : total
              ? `${start.toLocaleString("pt-BR")}–${end.toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")} ${total === 1 ? "obra" : "obras"}`
              : "Nenhuma obra encontrada"}
        </span>
      </div>
      <div className="filter-bar">
        <Filter
          label="Formato"
          value={kind}
          set={(value) => {
            setFilter("kind", value);
          }}
          options={[
            ["todos", "Todos"],
            ["manga", "Mangá"],
            ["manhwa", "Manhwa"],
            ["light-novel", "Light novel"],
          ]}
        />
        {!adultOnly && (
          <Filter
            label="Faixa etária"
            value={age}
            set={(value) => {
              setFilter("age", value);
            }}
            options={[
              ["todos", "Todas"],
              ["14", "14"],
              ["18+", "18+"],
            ]}
          />
        )}
        <Filter
          label="Status"
          value={status}
          set={(value) => {
            setFilter("status", value);
          }}
          options={[
            ["todos", "Todos"],
            ["Em andamento", "Em andamento"],
            ["Completo", "Completo"],
            ["Hiato", "Hiato"],
          ]}
        />
        <Filter
          label="Por página"
          value={String(pageSize)}
          set={(value) => onSearchChange({ ...search, limit: Number(value), page: 1 })}
          options={[
            ["24", "24 títulos"],
            ["48", "48 títulos"],
            ["60", "60 títulos"],
          ]}
        />
        {hasFilters && (
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
      ) : items.length ? (
        <>
          <div className="catalog-grid mt-8">
            {items.map((item) => (
              <MangaCard key={item.id} manga={item} />
            ))}
          </div>
          <CatalogPagination page={page} totalPages={totalPages} goToPage={goToPage} />
        </>
      ) : (
        <>
          <ProductState
            state="no-results"
            action={
              <button onClick={reset} className="secondary-button">
                Limpar filtros
              </button>
            }
          />
          <CatalogPagination page={page} totalPages={totalPages} goToPage={goToPage} />
        </>
      )}
    </main>
  );
}

function CatalogPagination({
  page,
  totalPages,
  goToPage,
}: {
  page: number;
  totalPages: number;
  goToPage: (page: number) => void;
}) {
  const visiblePages = useMemo(() => {
    const first = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages - first + 1) }, (_, index) => first + index);
  }, [page, totalPages]);
  if (totalPages <= 1) return null;
  return (
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
      {visiblePages.map((number) => (
        <button
          key={number}
          type="button"
          className="secondary-button min-w-10 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => goToPage(number)}
          disabled={number === page}
          aria-current={number === page ? "page" : undefined}
        >
          {number.toLocaleString("pt-BR")}
        </button>
      ))}
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
