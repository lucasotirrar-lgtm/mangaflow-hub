import { createFileRoute, Link } from "@tanstack/react-router";
import { BookmarkPlus, Check, ChevronRight, Languages, Play, Server, Star } from "lucide-react";
import { catalog, catalogService } from "@/services/catalog-service";
import { ProductState } from "@/components/product-states";
export const Route = createFileRoute("/obra/$slug")({ component: Detail });
function Detail() {
  const { slug } = Route.useParams();
  const item = catalog.find((x) => x.slug === slug) ?? catalogService.getCachedBySlug(slug);
  if (!item)
    return (
      <main className="page-shell">
        <ProductState state="no-results" />
      </main>
    );
  return (
    <main className="pb-28">
      <section className="detail-hero">
        <img
          src={item.hero || item.cover}
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
              {item.genres.map((x) => (
                <span className="tag" key={x}>
                  {x}
                </span>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/ler/$slug/$chapter"
                params={{ slug: item.slug, chapter: String(item.latestChapter) }}
                className="primary-button"
              >
                <Play />
                Ler capítulo {item.latestChapter}
              </Link>
              <button className="secondary-button">
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
            <span>{item.chapters.length} exibidos</span>
          </div>
          <div className="chapter-list">
            {item.chapters.map((ch) => (
              <Link
                key={ch.id}
                to="/ler/$slug/$chapter"
                params={{ slug: item.slug, chapter: String(ch.number) }}
                className="chapter-row"
              >
                <span className="chapter-number">
                  {ch.read ? <Check /> : <span>{ch.number}</span>}
                </span>
                <div>
                  <strong>Capítulo {ch.number}</strong>
                  <small>
                    {ch.title} · {ch.releasedAt}
                  </small>
                </div>
                <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
                  {ch.language}
                </span>
                <ChevronRight />
              </Link>
            ))}
          </div>
        </section>
        <aside>
          <div className="side-card">
            <h2>Fontes desta obra</h2>
            <p>O servidor escolhe a fonte principal e faz fallback quando necessário.</p>
            <div className="mt-4 space-y-2">
              {item.sources.map((source) => (
                <div className="source-row" key={source.id}>
                  <Server />
                  <div>
                    <strong>{source.label}</strong>
                    <span>
                      {source.role === "primary"
                        ? "Principal"
                        : source.role === "metadata"
                          ? "Metadados"
                          : "Alternativa"}
                    </span>
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
