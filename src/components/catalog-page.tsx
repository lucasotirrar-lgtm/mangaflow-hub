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
  const [kind, setKind] = useState("todos");
  const [age, setAge] = useState(initialAge);
  const [status, setStatus] = useState("todos");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    catalogService
      .discover()
      .then(setItems)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

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
            : `${filtered.length} ${filtered.length === 1 ? "obra" : "obras"}`}
        </span>
      </div>
      <div className="filter-bar">
        <Filter
          label="Formato"
          value={kind}
          set={setKind}
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
          set={setAge}
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
          set={setStatus}
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
        <div className="catalog-grid mt-8">
          {filtered.map((item) => (
            <MangaCard key={item.id} manga={item} />
          ))}
        </div>
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
