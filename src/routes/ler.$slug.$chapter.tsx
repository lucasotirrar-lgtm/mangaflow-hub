import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, Settings2 } from "lucide-react";
import { catalogService } from "@/services/catalog-service";

export const Route = createFileRoute("/ler/$slug/$chapter")({ component: Reader });

function Reader() {
  const { slug, chapter } = Route.useParams();
  const [title, setTitle] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [pages, setPages] = useState<Array<{ index: number; url: string }>>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    catalogService
      .getBySlug(slug)
      .then(async (work) => {
        const selected = work?.chapters.find((item) => item.id === chapter);
        if (!work || !selected) throw new Error("Capítulo não encontrado");
        setTitle(work.title);
        setChapterNumber(String(selected.number));
        const result = await catalogService.pages(chapter);
        setPages(result.pages);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Não foi possível carregar o capítulo"),
      );
  }, [chapter, slug]);
  return (
    <main className="reader">
      <div className="reader-bar">
        <Link to="/obra/$slug" params={{ slug }} aria-label="Voltar à obra">
          <ArrowLeft />
        </Link>
        <div>
          <strong>{title || "Carregando capítulo"}</strong>
          <span>{chapterNumber ? `Capítulo ${chapterNumber}` : ""}</span>
        </div>
        <div className="ml-auto flex gap-1">
          <button aria-label="Preferências de leitura">
            <Settings2 />
          </button>
          <button
            aria-label="Tela cheia"
            onClick={() => document.documentElement.requestFullscreen?.()}
          >
            <Maximize />
          </button>
        </div>
      </div>
      <div className="reader-content">
        {error ? (
          <div className="reader-placeholder">
            <h1>Capítulo indisponível</h1>
            <p>{error}</p>
          </div>
        ) : pages.length ? (
          pages.map((page) => (
            <img
              key={page.index}
              src={page.url}
              alt={`Página ${page.index + 1}`}
              loading={page.index < 2 ? "eager" : "lazy"}
              className="mx-auto block max-w-full"
            />
          ))
        ) : (
          <div className="reader-placeholder">
            <span>CARREGANDO</span>
            <h1>Preparando páginas em português</h1>
            <p>As páginas são salvas no servidor antes de serem exibidas.</p>
          </div>
        )}
      </div>
      <div className="reader-nav">
        <Link to="/obra/$slug" params={{ slug }}>
          <ChevronLeft />
          Voltar à obra
        </Link>
        <span>{pages.length ? `${pages.length} páginas` : ""}</span>
        <Link to="/obra/$slug" params={{ slug }}>
          Lista de capítulos
          <ChevronRight />
        </Link>
      </div>
    </main>
  );
}
