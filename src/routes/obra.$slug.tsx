import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookmarkPlus, Check, ChevronRight, Languages, Play, Server, Star } from "lucide-react";
import { catalogService } from "@/services/catalog-service";
import { CatalogSkeleton, ProductState } from "@/components/product-states";
import type { CatalogItem } from "@/types/content";
import { useAgeGate } from "@/components/age-gate";
import { useLocalLibrary } from "@/lib/local-library";
import { useAdultContent } from "@/lib/adult-content";

export const Route = createFileRoute("/obra/$slug")({ component: Detail });

function Detail() {
  const { slug } = Route.useParams();
  const [item, setItem] = useState<CatalogItem>();
  const [failed, setFailed] = useState(false);
  const [chapterPage, setChapterPage] = useState(1);
  const [chapterTotal, setChapterTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const { guard, modal } = useAgeGate();
  const { add, entries } = useLocalLibrary();
  const { adultEnabled } = useAdultContent();

  useEffect(() => {
    setItem(undefined);
    setFailed(false);
    Promise.all([catalogService.getBySlug(slug), catalogService.chapters(slug)])
      .then(([value, chapters]) => {
        setItem(value ? { ...value, chapters: chapters.results } : undefined);
        setChapterPage(1);
        setChapterTotal(chapters.total);
        if (!value) setFailed(true);
      })
      .catch(() => setFailed(true));
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
  const latest = item.chapters[0];
  const inLibrary = entries.some((entry) => entry.slug === item.slug);
  return (
    <main className="pb-28">
      <section className="detail-hero">
        <img
          src={item.cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25 blur-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/40" />
        <div className="relative mx-auto grid max-w-[1200px] gap-7 px-4 py-10 sm:grid-cols-[220px_1fr] lg:px-8 lg:py-16">
          <img
            src={item.cover}
            alt={`Capa de ${item.title}`}
            className="mx-auto aspect-[2/3] w-44 rounded-2xl object-cover shadow-2xl sm:w-full"
          />
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
              {latest ? (
                <button
                  className="primary-button"
                  onClick={() =>
                    guard(item.ageRating === "18+", () =>
                      window.location.assign(
                        `/ler/${encodeURIComponent(item.slug)}/${encodeURIComponent(latest.id)}`,
                      ),
                    )
                  }
                >
                  <Play /> Ler capítulo {latest.number}
                </button>
              ) : (
                <span className="secondary-button cursor-not-allowed opacity-60">
                  Sem capítulo PT-BR disponível
                </span>
              )}
              <button className="secondary-button" disabled={inLibrary} onClick={() => add(item)}>
                <BookmarkPlus />
                {inLibrary ? "Na biblioteca" : "Adicionar à biblioteca"}
              </button>
            </div>
          </div>
        </div>
      </section>
      <div className="page-shell grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="section-heading">
            <div>
              <span>CAPÍTULOS</span>
              <h2>Últimas atualizações</h2>
            </div>
            <span>{chapterTotal} em PT-BR</span>
          </div>
          {item.chapters.length ? (
            <div className="chapter-list">
              {item.chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  to="/ler/$slug/$chapter"
                  params={{ slug: item.slug, chapter: chapter.id }}
                  className="chapter-row"
                >
                  <span className="chapter-number">
                    {chapter.read ? <Check /> : <span>{chapter.number}</span>}
                  </span>
                  <div>
                    <strong>Capítulo {chapter.number}</strong>
                    <small>
                      {chapter.title} · {chapter.releasedAt}
                    </small>
                  </div>
                  <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
                    {chapter.language}
                  </span>
                  <ChevronRight />
                </Link>
              ))}
            </div>
          ) : (
            <ProductState state="empty" />
          )}
          {item.chapters.length < chapterTotal && (
            <button className="secondary-button mt-5" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Carregando…" : "Carregar mais capítulos"}
            </button>
          )}
          {loadMoreError && (
            <p className="mt-3 text-sm text-destructive">
              Não foi possível carregar mais capítulos. Tente novamente.
            </p>
          )}
        </section>
        <aside>
          <div className="side-card">
            <h2>Fontes desta obra</h2>
            <p>Capítulos PT-BR e imagens são entregues pelo servidor próprio.</p>
            <div className="mt-4 space-y-2">
              {item.sources.map((source) => (
                <div className="source-row" key={source.id}>
                  <Server />
                  <div>
                    <strong>{source.label}</strong>
                    <span>{source.role === "primary" ? "Principal" : "Metadados"}</span>
                  </div>
                  <i className={source.available ? "online" : "offline"}>
                    {source.available ? "Disponível" : "Indisponível"}
                  </i>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
      {modal}
    </main>
  );
}
