import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Bookmark, Sparkles, Star } from "lucide-react";
import { MangaCard, SectionTitle } from "@/components/manga-card";
import { CatalogSkeleton, ProductState } from "@/components/product-states";
import { catalogService } from "@/services/catalog-service";
import type { CatalogItem } from "@/types/content";
import { useAdultContent } from "@/lib/adult-content";
import { useReadingHistory } from "@/lib/reading-history";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yae House — Mangás em português" },
      {
        name: "description",
        content: "Catálogo de mangás e manhwas em português do Brasil, com leitura progressiva.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [releases, setReleases] = useState<CatalogItem[]>([]);
  const [highlights, setHighlights] = useState<CatalogItem[]>([]);
  const [adultReleases, setAdultReleases] = useState<CatalogItem[]>([]);
  const [failed, setFailed] = useState(false);
  const { adultEnabled } = useAdultContent();
  const history = useReadingHistory();
  useEffect(() => {
    let active = true;
    setFailed(false);
    catalogService
      .homeQueues()
      .then((queues) => {
        if (!active) return;
        setReleases(queues.releases);
        setHighlights(queues.highlights);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!adultEnabled) {
      setAdultReleases([]);
      return;
    }
    let active = true;
    catalogService.homeQueues(true).then((queues) => active && setAdultReleases(queues.releases));
    return () => {
      active = false;
    };
  }, [adultEnabled]);
  if (!releases.length)
    return (
      <main className="page-shell py-12">
        {failed ? (
          <ProductState
            state="error"
            action={
              <button className="secondary-button" onClick={() => window.location.reload()}>
                Tentar novamente
              </button>
            }
          />
        ) : (
          <CatalogSkeleton />
        )}
      </main>
    );
  const feature = releases[0]!;
  return (
    <main className="page-shell space-y-14 pb-28 lg:pb-12">
      <section className="hero-panel">
        <img src={feature.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        <div className="relative z-10 flex min-h-[430px] max-w-2xl flex-col justify-end p-6 sm:min-h-[520px] sm:p-10">
          <div className="mb-auto flex flex-wrap gap-2">
            <span className="eyebrow">
              <Sparkles />
              Novidade em destaque
            </span>
            <span className="age-badge">{feature.ageRating}</span>
          </div>
          <p className="text-sm font-bold text-primary">
            {feature.language} · {feature.kind === "manhwa" ? "Manhwa" : "Mangá"}
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-none sm:text-6xl">
            {feature.title}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            {feature.synopsis}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
            {feature.rating !== null && (
              <span className="flex items-center gap-1 font-bold text-star">
                <Star className="h-4 w-4 fill-current" />
                {feature.rating}
              </span>
            )}
            <span>{feature.status}</span>
            {feature.latestChapter > 0 && <span>Cap. {feature.latestChapter}</span>}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/obra/$slug" params={{ slug: feature.slug }} className="primary-button">
              <BookOpen />
              Ver obra
            </Link>
            <Link to="/descobrir" search={{ age: undefined }} className="secondary-button">
              Explorar catálogo
              <ArrowRight />
            </Link>
          </div>
        </div>
      </section>
      <section>
        <SectionTitle action="Ver catálogo" to="/mangas">
          Lançamentos recentes
        </SectionTitle>
        <div className="catalog-grid">
          {releases.slice(0, 6).map((item) => (
            <MangaCard key={item.id} manga={item} />
          ))}
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Link to="/buscar" search={{ q: "" }} className="quick-card">
          <BookOpen />
          <div>
            <strong>Explorar mangás</strong>
            <span>Encontre sua próxima leitura</span>
          </div>
          <ArrowRight />
        </Link>
        <Link to="/biblioteca" className="quick-card">
          <Bookmark />
          <div>
            <strong>Sua biblioteca</strong>
            <span>Continue de onde parou e organize favoritos</span>
          </div>
          <ArrowRight />
        </Link>
      </section>
      <section>
        <SectionTitle action="Descobrir mais" to="/descobrir">
          Atualizados recentemente
        </SectionTitle>
        <div className="catalog-grid">
          {highlights.slice(0, 12).map((item) => (
            <MangaCard key={item.id} manga={item} />
          ))}
        </div>
      </section>
      {history.length > 0 && (
        <section>
          <SectionTitle action="Ver histórico" to="/historico">
            Continuar lendo
          </SectionTitle>
          <div className="catalog-grid">
            {history.slice(0, 8).map((item) => (
              <MangaCard
                key={item.slug}
                manga={{
                  ...item,
                  progress: Math.min(
                    100,
                    Math.round((item.lastChapterNumber / Math.max(item.latestChapter, 1)) * 100),
                  ),
                }}
              />
            ))}
          </div>
        </section>
      )}
      {adultEnabled && adultReleases.length > 0 && (
        <section className="adult-zone">
          <div>
            <span className="age-badge adult">18+</span>
            <h2 className="mt-3 font-display text-2xl font-extrabold">Lista adulta</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Lançamentos adultos disponíveis neste dispositivo.
            </p>
          </div>
          <Link to="/adultos" className="secondary-button">
            Ver lista adulta
          </Link>
          <div className="catalog-grid md:col-span-2">
            {adultReleases.slice(0, 4).map((item) => (
              <MangaCard key={item.id} manga={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
