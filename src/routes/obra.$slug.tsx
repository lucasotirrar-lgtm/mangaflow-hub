import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  BookmarkPlus,
  BookOpen,
  Check,
  ChevronRight,
  Languages,
  Play,
  Search,
  Share2,
  Star,
  X,
} from "lucide-react";
import { catalogService } from "@/services/catalog-service";
import { CatalogSkeleton, ProductState } from "@/components/product-states";
import type { CatalogItem } from "@/types/content";
import { useAgeGate } from "@/components/age-gate";
import { useLocalLibrary } from "@/lib/local-library";
import { useAdultContent } from "@/lib/adult-content";
import { useReadingHistory } from "@/lib/reading-history";

export const Route = createFileRoute("/obra/$slug")({
  head: () => ({
    meta: [
      { title: "Obra — Yae Manga House" },
      {
        name: "description",
        content: "Leia capítulos de mangás e manhwas online em português na Yae Manga House.",
      },
    ],
  }),
  component: Detail,
});

function formatReleaseDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatChapterLabel(number: number) {
  return number > 0 ? `Capítulo ${number}` : "Capítulo disponível";
}

function Detail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<CatalogItem>();
  const [failed, setFailed] = useState(false);
  const [chapterPage, setChapterPage] = useState(1);
  const [chapterTotal, setChapterTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const [copied, setCopied] = useState(false);
  const { guard, modal } = useAgeGate();
  const { add, remove, entries } = useLocalLibrary();
  const { adultEnabled } = useAdultContent();
  const history = useReadingHistory();
  const [chapterFilter, setChapterFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const displayChapters = useMemo(() => {
    if (!item?.chapters) return [];
    let list = [...item.chapters];
    const q = chapterFilter.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (ch) =>
          String(ch.number).includes(q) ||
          (ch.title && ch.title.toLowerCase().includes(q)),
      );
    }
    if (sortOrder === "asc") {
      list.sort((a, b) => a.number - b.number);
    } else {
      list.sort((a, b) => b.number - a.number);
    }
    return list;
  }, [item?.chapters, chapterFilter, sortOrder]);

  useEffect(() => {
    let active = true;
    setItem(undefined);
    setFailed(false);
    setCoverError(false);

    Promise.all([catalogService.getBySlug(slug), catalogService.chapters(slug)])
      .then(([value, chapters]) => {
        if (!active) return;
        setItem(value ? { ...value, chapters: chapters.results } : undefined);
        setChapterPage(1);
        setChapterTotal(chapters.total);
        if (!value) {
          setFailed(true);
        } else {
          document.title = `${value.title} — Ler Online em Português | Yae Manga House`;
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      document.title = "Yae Manga House";
    };
  }, [slug]);

  const loadMore = async () => {
    if (!item || loadingMore || item.chapters.length >= chapterTotal) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const next = chapterPage + 1;
      const payload = await catalogService.chapters(slug, next);
      setItem({ ...item, chapters: [...item.chapters, ...payload.results] });
      setChapterPage(next);
    } catch {
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const shareWork = async () => {
    if (!item) return;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: item.title,
          text: `Leia ${item.title} online em português na Yae Manga House!`,
          url: window.location.href,
        });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }
    } catch {
      // Ignore abort/cancellation
    }
  };

  if (!item)
    return (
      <main className="page-shell py-12">
        {failed ? <ProductState state="no-results" /> : <CatalogSkeleton />}
      </main>
    );
  if (item.ageRating === "18+" && !adultEnabled)
    return (
      <main className="page-shell py-12">
        <section className="side-card mx-auto max-w-xl text-center">
          <h1 className="font-display text-2xl font-extrabold">Conteúdo adulto desativado</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Esta obra não é exibida enquanto o conteúdo adulto estiver desligado.
          </p>
          <Link to="/configuracoes" className="secondary-button mt-5">
            Abrir configurações
          </Link>
        </section>
      </main>
    );

  const workHistory = history.find((h) => h.slug === item.slug);
  const resumeChapter = workHistory?.lastChapterId
    ? item.chapters.find((c) => c.id === workHistory.lastChapterId)
    : undefined;
  const targetChapter = resumeChapter ?? item.chapters[0];
  const targetLabel = resumeChapter
    ? `Continuar: Cap. ${resumeChapter.number > 0 ? resumeChapter.number : ""}${workHistory?.lastPage && workHistory.lastPage > 1 ? ` (Pág. ${workHistory.lastPage})` : ""}`
    : targetChapter
      ? targetChapter.number > 0
        ? `Ler capítulo ${targetChapter.number}`
        : "Ler capítulo disponível"
      : "";
  const inLibrary = entries.some((entry) => entry.slug === item.slug);

  return (
    <main className="pb-28">
      <section className="detail-hero">
        {!coverError ? (
          <img
            src={item.cover}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-25 blur-sm"
          />
        ) : (
          <div className="absolute inset-0 bg-primary/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/40" />
        <div className="relative mx-auto grid max-w-[1200px] gap-7 px-4 py-10 sm:grid-cols-[220px_1fr] lg:px-8 lg:py-16">
          {!coverError ? (
            <img
              src={item.cover}
              alt={`Capa de ${item.title}`}
              fetchPriority="high"
              decoding="async"
              width={440}
              height={660}
              className="mx-auto aspect-[2/3] w-44 rounded-2xl object-cover shadow-2xl sm:w-full"
              onError={() => setCoverError(true)}
            />
          ) : (
            <div className="mx-auto flex aspect-[2/3] w-44 flex-col items-center justify-center rounded-2xl border border-border bg-surface p-4 text-center shadow-2xl sm:w-full">
              <BookOpen className="h-12 w-12 text-primary/50" />
              <span className="mt-2 text-xs font-semibold text-muted-foreground">
                {item.title}
              </span>
            </div>
          )}
          <div className="self-end">
            <div className="flex flex-wrap gap-2">
              <span className={`age-badge ${item.ageRating === "18+" ? "adult" : ""}`}>
                {item.ageRating}
              </span>
              <span className="tag">
                {item.kind === "light-novel"
                  ? "Light novel"
                  : item.kind === "manhwa"
                    ? "Manhwa"
                    : "Mangá"}
              </span>
              <span className="tag">{item.status}</span>
            </div>
            <h1 className="mt-4 font-display text-4xl font-extrabold sm:text-5xl">{item.title}</h1>
            {item.alternativeTitle && (
              <p className="text-muted-foreground">{item.alternativeTitle}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {item.rating !== null && (
                <span className="flex items-center gap-1 font-bold text-star">
                  <Star className="h-4 w-4 fill-current" />
                  {item.rating}
                </span>
              )}
              {item.year && <span>{item.year}</span>}
              <span className="flex items-center gap-1">
                <Languages className="h-4 w-4" />
                {item.language}
              </span>
            </div>
            <p className="mt-5 max-w-3xl leading-7 text-muted-foreground">{item.synopsis}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {item.genres.map((genre) => (
                <span className="tag" key={genre}>
                  {genre}
                </span>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              {targetChapter ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    guard(item.ageRating === "18+", () =>
                      navigate({
                        to: "/ler/$slug/$chapter",
                        params: { slug: item.slug, chapter: targetChapter.id },
                      }),
                    )
                  }
                >
                  <Play /> {targetLabel}
                </button>
              ) : (
                <span className="secondary-button cursor-not-allowed opacity-60">
                  Sem capítulo PT-BR disponível
                </span>
              )}
              <button
                type="button"
                className={`secondary-button ${inLibrary ? "border-primary text-primary" : ""}`}
                aria-pressed={inLibrary}
                onClick={() => (inLibrary ? remove(item.slug) : add(item))}
              >
                <BookmarkPlus className={inLibrary ? "fill-primary" : ""} />
                {inLibrary ? "Salvo na biblioteca" : "Adicionar à biblioteca"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={shareWork}
                aria-label="Compartilhar obra"
              >
                {copied ? <Check className="text-primary" /> : <Share2 />}
                {copied ? "Link copiado!" : "Compartilhar"}
              </button>
            </div>
          </div>
        </div>
      </section>
      <div className="page-shell grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <span className="eyebrow !mb-0">CAPÍTULOS</span>
              <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                {chapterTotal} em PT-BR
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-52 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={chapterFilter}
                  onChange={(e) => setChapterFilter(e.target.value)}
                  placeholder="Filtrar capítulo..."
                  className="w-full rounded-xl border border-input bg-surface py-2 pl-9 pr-8 text-xs font-medium text-foreground outline-none transition focus:border-primary"
                />
                {chapterFilter && (
                  <button
                    type="button"
                    onClick={() => setChapterFilter("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Limpar filtro de capítulos"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
                aria-label="Alternar ordem dos capítulos"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                <span>{sortOrder === "desc" ? "Mais recentes" : "Primeiros"}</span>
              </button>
            </div>
          </div>

          {displayChapters.length ? (
            <div className="chapter-list">
              {displayChapters.map((chapter) => {
                const workHistory = history.find((h) => h.slug === item.slug);
                const isRead =
                  Boolean(workHistory) &&
                  (chapter.id === workHistory?.lastChapterId ||
                    (chapter.number > 0 &&
                      workHistory?.lastChapterNumber !== undefined &&
                      chapter.number <= workHistory.lastChapterNumber));

                const hasCustomTitle =
                  chapter.title &&
                  chapter.title.trim().toLowerCase() !== `capítulo ${chapter.number}` &&
                  chapter.title.trim() !== String(chapter.number);

                return (
                  <Link
                    key={chapter.id}
                    to="/ler/$slug/$chapter"
                    params={{ slug: item.slug, chapter: chapter.id }}
                    className="chapter-row group"
                  >
                    <span className={`chapter-number ${isRead ? "read" : ""}`}>
                      {isRead ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span>{chapter.number > 0 ? chapter.number : "—"}</span>
                      )}
                    </span>
                    <div className="chapter-row-info">
                      <div className="chapter-row-title">
                        <span>{formatChapterLabel(chapter.number)}</span>
                        {hasCustomTitle && (
                          <span className="truncate text-xs font-normal text-muted-foreground">
                            — {chapter.title}
                          </span>
                        )}
                      </div>
                      <div className="chapter-row-meta">
                        <span>{formatReleaseDate(chapter.releasedAt)}</span>
                        {chapter.language && (
                          <>
                            <span>·</span>
                            <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                              {chapter.language}
                            </span>
                          </>
                        )}
                        {isRead && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-primary">Lido</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary transition group-hover:bg-primary group-hover:text-primary-foreground sm:inline-flex">
                        Ler
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : chapterFilter ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum capítulo encontrado correspondente a "{chapterFilter}".
              </p>
              <button
                type="button"
                onClick={() => setChapterFilter("")}
                className="secondary-button mt-4"
              >
                Limpar busca de capítulos
              </button>
            </div>
          ) : (
            <ProductState state="empty" />
          )}

          {item.chapters.length < chapterTotal && (
            <div className="mt-6 flex justify-center">
              <button
                className="secondary-button min-w-[220px]"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Carregando…" : "Carregar mais capítulos"}
              </button>
            </div>
          )}
          {loadMoreError && (
            <p className="mt-3 text-center text-sm text-destructive">
              Não foi possível carregar mais capítulos. Tente novamente.
            </p>
          )}
        </section>
        <aside>
          <div className="side-card">
            <h2>Sobre esta obra</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Formato</dt>
                <dd className="font-semibold">
                  {item.kind === "light-novel" ? "Light novel" : item.kind === "manhwa" ? "Manhwa" : "Mangá"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Idioma dos capítulos</dt>
                <dd className="font-semibold">Português (Brasil)</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Classificação</dt>
                <dd className="font-semibold">
                  {item.ageRating === "Livre"
                    ? "Livre"
                    : item.ageRating === "18+"
                      ? "18+"
                      : `${item.ageRating}+`}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
      {modal}
    </main>
  );
}
