import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, BookOpen, Database, HardDrive, Image, RefreshCw, Server } from "lucide-react";
import { getAdminDashboard, type AdminDashboardStats } from "@/lib/admin.functions";

const number = new Intl.NumberFormat("pt-BR");

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toLocaleString("pt-BR", {
    maximumFractionDigits: index >= 3 ? 2 : 1,
  })} ${units[index]}`;
}

function formatDate(value: string | null) {
  if (!value) return "Ainda não informado";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(normalized));
}

function formatAge(seconds: number | null) {
  if (seconds === null) return "sem registro";
  if (seconds < 60) return `há ${seconds}s`;
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`;
  return `há ${Math.floor(seconds / 3600)} h`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="card-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 font-display text-3xl font-extrabold text-foreground">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}

function HealthItem({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 p-3">
      <div className="flex items-center gap-3">
        <span
          className={`size-2.5 rounded-full ${ok ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.65)]" : "bg-destructive"}`}
        />
        <div>
          <p className="text-sm font-bold">{label}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      <span className={`text-xs font-bold ${ok ? "text-emerald-500" : "text-destructive"}`}>
        {ok ? "Saudável" : "Atenção"}
      </span>
    </div>
  );
}

function DashboardContent({ data }: { data: AdminDashboardStats }) {
  const catalogCoverage = data.sync.providerTotal
    ? Math.min(100, (data.catalog.databaseTotal / data.sync.providerTotal) * 100)
    : 0;
  const diskOccupied = data.storage.diskTotalBytes - data.storage.diskFreeBytes;

  return (
    <div className="space-y-6">
      <div className="dashboard-grid">
        <MetricCard
          icon={Database}
          label="Títulos no banco"
          value={number.format(data.catalog.databaseTotal)}
          detail={`${number.format(data.catalog.adultHidden)} oculto por classificação adulta`}
        />
        <MetricCard
          icon={BookOpen}
          label="Títulos no site"
          value={number.format(data.catalog.siteVisible)}
          detail="Catálogo público e navegável"
        />
        <MetricCard
          icon={Activity}
          label="Capítulos salvos"
          value={number.format(data.chapters.total)}
          detail={`${number.format(data.chapters.worksWithChapters)} obras com capítulos (${data.chapters.coveragePercent}%)`}
        />
        <MetricCard
          icon={HardDrive}
          label="Dados próprios"
          value={formatBytes(data.storage.dataBytes)}
          detail={`${formatBytes(data.assets.bytes)} em imagens e ${formatBytes(data.storage.databaseBytes)} no banco`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="card-surface p-5">
          <div className="flex items-center gap-3">
            <Server className="size-5 text-primary" />
            <div>
              <h2 className="font-display text-lg font-extrabold">Saúde dos serviços</h2>
              <p className="text-xs text-muted-foreground">Leitura atualizada automaticamente</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <HealthItem
              label="API do site"
              ok={data.health.api}
              detail="Respondendo às consultas"
            />
            <HealthItem label="Banco próprio" ok={data.health.database} detail="SQLite acessível" />
            <HealthItem
              label="Importador"
              ok={data.health.worker}
              detail={`Última atividade ${formatAge(data.sync.ageSeconds)}`}
            />
            <HealthItem
              label="Armazenamento"
              ok={data.health.storage}
              detail={`${formatBytes(data.storage.diskFreeBytes)} livres`}
            />
          </div>
        </section>

        <section className="card-surface p-5">
          <div className="flex items-center gap-3">
            <HardDrive className="size-5 text-primary" />
            <h2 className="font-display text-lg font-extrabold">Disco da VPS</h2>
          </div>
          <div className="mt-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-display text-2xl font-extrabold">
                  {data.storage.diskUsedPercent.toLocaleString("pt-BR")}% usado
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatBytes(diskOccupied)} de {formatBytes(data.storage.diskTotalBytes)}
                </p>
              </div>
              <p className="text-xs font-bold text-emerald-500">
                {formatBytes(data.storage.diskFreeBytes)} livres
              </p>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${data.health.storage ? "bg-gradient-primary" : "bg-destructive"}`}
                style={{ width: `${Math.min(100, data.storage.diskUsedPercent)}%` }}
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Limite seguro das imagens: {formatBytes(data.storage.assetLimitBytes)}. Reserva
              mínima:
              {` ${formatBytes(data.storage.minimumFreeBytes)}`}.
            </p>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-surface p-5">
          <div className="flex items-center gap-3">
            <RefreshCw className="size-5 text-primary" />
            <h2 className="font-display text-lg font-extrabold">Importação do catálogo</h2>
          </div>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-2xl font-extrabold">{catalogCoverage.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">
                {number.format(data.catalog.databaseTotal)} salvos de{" "}
                {number.format(data.sync.providerTotal || 0)} informados pela fonte
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500">
              {data.sync.status === "succeeded" ? "Sincronizando" : data.sync.status}
            </span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-primary"
              style={{ width: `${catalogCoverage}%` }}
            />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Último lote</dt>
              <dd className="mt-1 font-bold">{number.format(data.sync.importedLastRun)} títulos</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Falhas em 24h</dt>
              <dd className="mt-1 font-bold">{number.format(data.sync.failures24h)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Posição do ciclo</dt>
              <dd className="mt-1 font-bold">{number.format(data.sync.offset)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Último sucesso</dt>
              <dd className="mt-1 font-bold">{formatAge(data.sync.ageSeconds)}</dd>
            </div>
          </dl>
        </section>

        <section className="card-surface p-5">
          <div className="flex items-center gap-3">
            <Image className="size-5 text-primary" />
            <h2 className="font-display text-lg font-extrabold">Conteúdo armazenado</h2>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/70 p-4">
              <dt className="text-xs text-muted-foreground">Capas próprias</dt>
              <dd className="mt-2 text-xl font-extrabold">{number.format(data.assets.covers)}</dd>
            </div>
            <div className="rounded-xl border border-border/70 p-4">
              <dt className="text-xs text-muted-foreground">Páginas próprias</dt>
              <dd className="mt-2 text-xl font-extrabold">
                {number.format(data.assets.chapterPages)}
              </dd>
            </div>
            <div className="rounded-xl border border-border/70 p-4">
              <dt className="text-xs text-muted-foreground">Arquivos disponíveis</dt>
              <dd className="mt-2 text-xl font-extrabold">
                {number.format(data.assets.available)}
              </dd>
            </div>
            <div className="rounded-xl border border-border/70 p-4">
              <dt className="text-xs text-muted-foreground">Capítulos com páginas lidas</dt>
              <dd className="mt-2 text-xl font-extrabold">
                {number.format(data.chapters.withPageCount)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Última atualização do banco: {formatDate(data.catalog.updatedAt)}
          </p>
        </section>
      </div>
    </div>
  );
}

export function DashboardOverview() {
  const loadDashboard = useServerFn(getAdminDashboard);
  const query = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => loadDashboard({}),
    refetchInterval: 10_000,
    staleTime: 5_000,
    retry: 1,
  });

  if (query.isLoading) {
    return (
      <div className="card-surface flex min-h-56 items-center justify-center p-8 text-sm text-muted-foreground">
        <RefreshCw className="mr-3 size-5 animate-spin text-primary" />
        Lendo o banco e os serviços da VPS…
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="card-surface p-6">
        <h2 className="font-display text-lg font-extrabold text-destructive">
          Não foi possível carregar os indicadores
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {query.error instanceof Error ? query.error.message : "Tente novamente em instantes."}
        </p>
        <button
          onClick={() => query.refetch()}
          className="mt-4 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Atualizado em {formatDate(query.data.generatedAt)} · atualização automática a cada 10s
        </p>
        <button
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold hover:border-primary hover:text-primary disabled:opacity-60"
        >
          <RefreshCw className={`size-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
          Atualizar agora
        </button>
      </div>
      <DashboardContent data={query.data} />
    </div>
  );
}
