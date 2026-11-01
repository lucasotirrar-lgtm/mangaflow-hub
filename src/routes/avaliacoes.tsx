import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Star } from "lucide-react";

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

function AvaliacoesPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
        <span className="text-gradient">Avaliações da comunidade</span>
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Resenhas e avaliações dos leitores serão exibidas aqui em breve.
      </p>

      <div className="mt-12 flex flex-col items-center gap-5 rounded-3xl border border-border bg-surface py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Star className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Em breve</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            O sistema de avaliações está em desenvolvimento. Em breve você poderá avaliar obras, ver
            as notas da comunidade e ler resenhas dos leitores.
          </p>
        </div>
        <Link to="/descobrir" className="primary-button mt-2">
          <BookOpen className="h-4 w-4" />
          Explorar catálogo
        </Link>
      </div>
    </div>
  );
}
