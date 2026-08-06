import { AlertTriangle, BookOpen, LockKeyhole, SearchX, WifiOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AsyncState } from "@/types/content";

export function CatalogSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-label="Carregando catálogo" className="catalog-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
          <Skeleton className="mt-3 h-5 w-4/5" />
          <Skeleton className="mt-2 h-3 w-2/5" />
        </div>
      ))}
    </div>
  );
}

const config = {
  empty: [
    BookOpen,
    "Sua estante ainda está vazia",
    "Adicione obras à biblioteca para acompanhar capítulos e progresso.",
  ],
  error: [
    AlertTriangle,
    "Não foi possível carregar",
    "Tente novamente. Se o problema continuar, verifique a fonte configurada.",
  ],
  offline: [
    WifiOff,
    "Você está offline",
    "Conteúdos salvos no servidor continuam disponíveis; sincronizaremos quando a conexão voltar.",
  ],
  unauthorized: [
    LockKeyhole,
    "Entre para continuar",
    "Este espaço guarda informações pessoais, como histórico, listas e progresso.",
  ],
  "no-results": [
    SearchX,
    "Nenhuma obra encontrada",
    "Tente remover filtros ou buscar por outro título, autor ou gênero.",
  ],
} as const;

export function ProductState({
  state,
  action,
}: {
  state: Exclude<AsyncState, "loading" | "ready"> | "no-results";
  action?: React.ReactNode;
}) {
  const [Icon, title, text] = config[state];
  return (
    <div className="state-panel" role={state === "error" ? "alert" : "status"}>
      <Icon className="h-7 w-7 text-primary" />
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
