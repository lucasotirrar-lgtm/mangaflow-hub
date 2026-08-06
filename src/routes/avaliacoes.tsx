import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { populares } from "@/data/manga";

export const Route = createFileRoute("/avaliacoes")({
  head: () => ({
    meta: [
      { title: "Avaliações da comunidade — Yae Manga House" },
      {
        name: "description",
        content:
          "As avaliações mais bem votadas da comunidade Yae Manga House sobre mangás e manhwas em destaque.",
      },
      { property: "og:title", content: "Avaliações da comunidade — Yae Manga House" },
      {
        property: "og:description",
        content: "Leia as resenhas mais votadas dos leitores da Yae Manga House.",
      },
    ],
  }),
  component: AvaliacoesPage,
});

const resenhas = [
  {
    usuario: "Sakura_Yume",
    texto:
      "A ambientação é impecável e o ritmo do romance é bem construído. Os capítulos mais recentes elevaram bastante o drama.",
    nota: 5,
  },
  {
    usuario: "KageNoRyu",
    texto:
      "Arte espetacular, especialmente nas cenas noturnas. A protagonista tem uma das melhores evoluções que já li em manhwa.",
    nota: 4.5,
  },
  {
    usuario: "MikaLeitora",
    texto:
      "Comecei sem esperar nada e li 60 capítulos numa noite. O humor equilibra muito bem os momentos pesados.",
    nota: 4.8,
  },
  {
    usuario: "Tetsuo.42",
    texto:
      "O worldbuilding é denso, mas as explicações vêm no tempo certo. Recomendo para quem gosta de fantasia sombria.",
    nota: 4.6,
  },
];

function AvaliacoesPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
        <span className="text-gradient">Avaliações mais votadas</span>
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        O que a comunidade está dizendo sobre os títulos do momento.
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {resenhas.map((r, i) => {
          const manga = populares[i % populares.length]!;
          return (
            <article key={r.usuario} className="card-surface flex gap-4 p-4">
              <img
                src={manga.cover}
                alt={`Capa de ${manga.title}`}
                loading="lazy"
                width={640}
                height={900}
                className="h-32 w-22 shrink-0 rounded-lg object-cover"
              />
              <div>
                <h2 className="font-display text-base font-bold">{manga.title}</h2>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 font-bold text-star">
                    <Star className="h-3 w-3 fill-current" /> {r.nota}
                  </span>
                  <span className="text-muted-foreground">por {r.usuario}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {r.texto}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
