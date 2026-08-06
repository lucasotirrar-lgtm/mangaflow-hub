import { Link, useNavigate } from "@tanstack/react-router";
import { BookmarkPlus, Play, Star } from "lucide-react";
import type { CatalogItem } from "@/types/content";
import { useAgeGate } from "@/components/age-gate";

const kindLabel = { manga: "Mangá", manhwa: "Manhwa", "light-novel": "Light novel" } as const;

export function MangaCard({ manga }: { manga: CatalogItem }) {
  const navigate = useNavigate();
  const { guard, modal } = useAgeGate();
  const open = () =>
    guard(manga.ageRating === "18+", () =>
      navigate({ to: "/obra/$slug", params: { slug: manga.slug } }),
    );
  return (
    <article className="group min-w-0">
      <button
        onClick={open}
        className="relative block w-full overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-sm transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <img
          src={manga.cover}
          alt={`Capa de ${manga.title}`}
          loading="lazy"
          width={640}
          height={960}
          className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
          <span className={`age-badge ${manga.ageRating === "18+" ? "adult" : ""}`}>
            {manga.ageRating}
          </span>
          <span className="rounded-full bg-background/85 px-2 py-1 text-[10px] font-bold backdrop-blur">
            {kindLabel[manga.kind]}
          </span>
        </div>
        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between">
          <span className="flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-xs font-bold text-star backdrop-blur">
            <Star className="h-3 w-3 fill-current" /> {manga.rating}
          </span>
          <Play className="h-8 w-8 rounded-full bg-primary p-2 text-primary-foreground opacity-0 transition group-hover:opacity-100" />
        </div>
      </button>
      <div className="mt-3 flex items-start gap-2">
        <button onClick={open} className="min-w-0 flex-1 text-left">
          <h3 className="line-clamp-2 font-display text-sm font-bold group-hover:text-primary">
            {manga.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Cap. {manga.latestChapter} · {manga.sources[0]?.label}
          </p>
        </button>
        <button
          aria-label={`Adicionar ${manga.title} à biblioteca`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-surface hover:text-primary"
        >
          <BookmarkPlus className="h-4 w-4" />
        </button>
      </div>
      {typeof manga.progress === "number" && (
        <div className="mt-2">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${manga.progress}%` }} />
          </div>
          <span className="mt-1 block text-[10px] text-muted-foreground">
            {manga.progress}% lido
          </span>
        </div>
      )}
      {modal}
    </article>
  );
}

export function SectionTitle({
  children,
  action,
  to,
}: {
  children: string;
  action?: string;
  to?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[.18em] text-primary">
          Seleção Yae
        </span>
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{children}</h2>
      </div>
      {action && to && (
        <Link
          to={to}
          className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-muted-foreground hover:text-primary"
        >
          {action} →
        </Link>
      )}
    </div>
  );
}
