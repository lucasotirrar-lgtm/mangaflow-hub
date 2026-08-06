import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Clock3, Database, Sparkles, Star } from "lucide-react";
import { MangaCard, SectionTitle } from "@/components/manga-card";
import { catalog } from "@/services/catalog-service";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yae House — Seu universo de mangás e novels" },
      {
        name: "description",
        content:
          "Catálogo pessoal de mangás, manhwas e light novels com leitura e progresso sincronizados.",
      },
    ],
  }),
  component: Home,
});
function Home() {
  const feature = catalog[0]!;
  return (
    <main className="page-shell space-y-14 pb-28 lg:pb-12">
      <section className="hero-panel">
        <img
          src={feature.hero || feature.cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        <div className="relative z-10 flex min-h-[430px] max-w-2xl flex-col justify-end p-6 sm:min-h-[520px] sm:p-10">
          <div className="mb-auto flex flex-wrap gap-2">
            <span className="eyebrow">
              <Sparkles />
              Destaque da semana
            </span>
            <span className="age-badge">{feature.ageRating}</span>
          </div>
          <p className="text-sm font-bold text-primary">
            {feature.sources[0]?.label ?? "Biblioteca local"} ·{" "}
            {feature.kind === "manhwa" ? "Manhwa" : "Mangá"}
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-none sm:text-6xl">
            {feature.title}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            {feature.synopsis}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1 font-bold text-star">
              <Star className="h-4 w-4 fill-current" />
              {feature.rating}
            </span>
            <span>{feature.status}</span>
            <span>Cap. {feature.latestChapter}</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/obra/$slug" params={{ slug: feature.slug }} className="primary-button">
              <BookOpen />
              Continuar leitura
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
          Continue de onde parou
        </SectionTitle>
        <div className="catalog-grid">
          {catalog
            .filter((x) => x.progress)
            .slice(0, 4)
            .map((item) => (
              <MangaCard key={item.id} manga={item} />
            ))}
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Link to="/biblioteca" className="quick-card">
          <BookOpen />
          <div>
            <strong>Sua biblioteca</strong>
            <span>3 obras em andamento</span>
          </div>
          <ArrowRight />
        </Link>
        <Link to="/historico" className="quick-card">
          <Clock3 />
          <div>
            <strong>Histórico de leitura</strong>
            <span>Retome os capítulos recentes</span>
          </div>
          <ArrowRight />
        </Link>
        <Link to="/configuracoes" className="quick-card">
          <Database />
          <div>
            <strong>Fontes conectadas</strong>
            <span>3 ativas · 1 indisponível</span>
          </div>
          <ArrowRight />
        </Link>
      </section>
      <section>
        <SectionTitle action="Descobrir mais" to="/descobrir">
          Em alta agora
        </SectionTitle>
        <div className="catalog-grid">
          {catalog.map((item) => (
            <MangaCard key={item.id} manga={item} />
          ))}
        </div>
      </section>
      <section className="adult-zone">
        <div>
          <span className="age-badge adult">18+</span>
          <h2 className="mt-3 font-display text-2xl font-extrabold">Espaço adulto separado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Obras maduras aparecem identificadas e exigem confirmação explícita antes do acesso.
          </p>
        </div>
        <Link to="/descobrir" search={{ age: "18+" }} className="secondary-button">
          Explorar com filtros
        </Link>
      </section>
    </main>
  );
}
