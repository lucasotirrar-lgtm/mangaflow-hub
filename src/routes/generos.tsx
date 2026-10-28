import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { covers } from "@/data/manga";
import { fallback, fetchGeneros } from "@/lib/cms";

export const Route = createFileRoute("/generos")({
  head: () => ({
    meta: [
      { title: "Gêneros de mangá e manhwa — Yae Manga House" },
      {
        name: "description",
        content:
          "Explore mangás e manhwas por gênero: romance, ação, fantasia, isekai, terror, escolar e muito mais.",
      },
      { property: "og:title", content: "Gêneros de mangá e manhwa — Yae Manga House" },
      {
        name: "og:description",
        content: "Navegue por todos os gêneros disponíveis na biblioteca da Yae Manga House.",
      },
    ],
  }),
  component: GenerosPage,
});

function GenerosPage() {
  const { data: rows } = useQuery({ queryKey: ["cms", "generos"], queryFn: fetchGeneros });
  const generos =
    rows && rows.length > 0
      ? rows.map((g) => ({ nome: g.nome, image: g.image_url }))
      : fallback.generos.map((nome, i) => ({ nome, image: covers[i % covers.length]! }));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
        <span className="text-gradient">Gêneros</span>
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Escolha um gênero e descubra centenas de títulos com capítulos atualizados diariamente.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {generos.map((g) => (
          <Link
            key={g.nome}
            to="/buscar"
            search={{ q: g.nome, page: 1 }}
            className="group relative block overflow-hidden rounded-xl border border-border transition-transform hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src={g.image ?? ""}
              alt={`Gênero ${g.nome}`}
              loading="lazy"
              width={640}
              height={900}
              className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 veil" />
            <h2 className="absolute inset-x-0 bottom-0 p-4 font-display text-lg font-extrabold transition-colors group-hover:text-primary">
              {g.nome}
            </h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
