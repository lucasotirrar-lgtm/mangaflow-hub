import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookmarkPlus, Check, ChevronRight, Languages, Play, Server, Star } from "lucide-react";
import { catalogService } from "@/services/catalog-service";
import { CatalogSkeleton, ProductState } from "@/components/product-states";
import type { CatalogItem } from "@/types/content";

export const Route = createFileRoute("/obra/$slug")({ component: Detail });

function Detail() {
  const { slug } = Route.useParams();
  const [item, setItem] = useState<CatalogItem>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setItem(undefined);
    setFailed(false);
    catalogService
      .getBySlug(slug)
      .then((value) => {
        setItem(value);
        if (!value) setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [slug]);

  if (!item)
    return (
      <main className="page-shell py-12">
        {failed ? <ProductState state="no-results" /> : <CatalogSkeleton />}
      </main>
    );
  const latest = item.chapters[0];
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
              <span className="flex items-center gap-1 font-bold text-star">
                <Star className="h-4 w-4 fill-current" />
                {item.rating}
              </span>
              <span>{item.year}</span>
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
                <Link
                  to="/ler/$slug/$chapter"
                  params={{ slug: item.slug, chapter: latest.id }}
                  className="primary-button"
                >
                  <Play />
                  Ler capítulo {latest.number}
                </Link>
              ) : (
                <span className="secondary-button cursor-not-allowed opacity-60">
                  Sem capítulo PT-BR disponível
                </span>
              )}
              <button
                className="secondary-button"
                disabled
                title="A biblioteca será liberada no próximo ciclo"
              >
                <BookmarkPlus />
                Adicionar à biblioteca
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
            <span>{item.chapters.length} em PT-BR</span>
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
    </main>
  );
}
