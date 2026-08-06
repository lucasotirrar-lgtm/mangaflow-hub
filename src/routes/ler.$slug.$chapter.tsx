import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, Settings2 } from "lucide-react";
import { catalog } from "@/services/catalog-service";
export const Route = createFileRoute("/ler/$slug/$chapter")({ component: Reader });
function Reader() {
  const { slug, chapter } = Route.useParams();
  const item = catalog.find((x) => x.slug === slug);
  if (!item) return null;
  const n = Number(chapter);
  return (
    <main className="reader">
      <div className="reader-bar">
        <Link to="/obra/$slug" params={{ slug }} aria-label="Voltar à obra">
          <ArrowLeft />
        </Link>
        <div>
          <strong>{item.title}</strong>
          <span>Capítulo {chapter}</span>
        </div>
        <div className="ml-auto flex gap-1">
          <button aria-label="Preferências de leitura">
            <Settings2 />
          </button>
          <button aria-label="Tela cheia">
            <Maximize />
          </button>
        </div>
      </div>
      <div className="reader-content">
        <div className="reader-placeholder">
          <span>Página 1</span>
          <h1>Leitor preparado para o backend</h1>
          <p>
            As imagens ou páginas de texto serão entregues pelo servidor, armazenadas localmente
            quando permitido e carregadas progressivamente.
          </p>
        </div>
        <div className="reader-placeholder second">
          <span>Página 2</span>
          <p>
            Área reservada ao conteúdo do capítulo — sem URLs de provedores hardcoded no navegador.
          </p>
        </div>
      </div>
      <div className="reader-nav">
        <Link to="/ler/$slug/$chapter" params={{ slug, chapter: String(Math.max(1, n - 1)) }}>
          <ChevronLeft />
          Anterior
        </Link>
        <span>
          {n} / {item.latestChapter}
        </span>
        <Link
          to="/ler/$slug/$chapter"
          params={{ slug, chapter: String(Math.min(item.latestChapter, n + 1)) }}
        >
          Próximo
          <ChevronRight />
        </Link>
      </div>
    </main>
  );
}
