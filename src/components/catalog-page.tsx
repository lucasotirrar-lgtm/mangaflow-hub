import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { MangaCard } from "@/components/manga-card";
import { ProductState } from "@/components/product-states";
import { catalog } from "@/services/catalog-service";

export function CatalogPage({
  title = "Descobrir",
  description = "Encontre sua próxima leitura sem ficar preso a uma única fonte.",
}: {
  title?: string;
  description?: string;
}) {
  const [kind, setKind] = useState("todos");
  const [age, setAge] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () =>
      catalog.filter(
        (x) =>
          (kind === "todos" || x.kind === kind) &&
          (age === "todos" || x.ageRating === age) &&
          (status === "todos" || x.status === status),
      ),
    [kind, age, status],
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
          {filtered.length} {filtered.length === 1 ? "obra" : "obras"}
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
      {filtered.length ? (
        <>
          <div className="catalog-grid mt-8">
            {filtered.map((item) => (
              <MangaCard key={item.id} manga={item} />
            ))}
          </div>
          <nav aria-label="Paginação" className="pagination">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
            <span>Página {page} de 1</span>
            <button disabled>Próxima</button>
          </nav>
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
  set: (v: string) => void;
  options: string[][];
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(e) => set(e.target.value)}>
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
