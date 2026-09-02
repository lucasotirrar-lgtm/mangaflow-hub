import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, RefreshCw, Settings2 } from "lucide-react";
import { catalogService } from "@/services/catalog-service";
import type { Chapter } from "@/types/content";
import { rememberReading } from "@/lib/reading-history";

export const Route = createFileRoute("/ler/$slug/$chapter")({ component: Reader });

type ReaderPreferences = {
  width: "700px" | "900px" | "1200px" | "100%";
  gap: 0 | 8 | 16;
  background: "soft" | "black";
};

const defaultPreferences: ReaderPreferences = {
  width: "900px",
  gap: 0,
  background: "soft",
};

function Reader() {
  const { slug, chapter } = Route.useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [pages, setPages] = useState<Array<{ index: number; url: string }>>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [siblings, setSiblings] = useState<Chapter[]>([]);
  const [failedImages, setFailedImages] = useState<number[]>([]);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState<ReaderPreferences>(defaultPreferences);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("mangaflow-reader-preferences");
      if (saved) setPreferences({ ...defaultPreferences, ...JSON.parse(saved) });
    } catch {
      window.localStorage.removeItem("mangaflow-reader-preferences");
    }
  }, []);

  const updatePreferences = (next: Partial<ReaderPreferences>) => {
    setPreferences((current) => {
      const value = { ...current, ...next };
      window.localStorage.setItem("mangaflow-reader-preferences", JSON.stringify(value));
      return value;
    });
  };

  const load = useCallback(async () => {
    let active = true;
    setError("");
    setLoading(true);
    setPages([]);
    setTitle("");
    setChapterNumber("");
    setFailedImages([]);
    try {
      const selected = await catalogService.chapter(chapter);
      if (selected.workSlug !== slug) throw new Error("Capítulo não encontrado");
      const [result, chapterList, work] = await Promise.all([
        catalogService.pages(chapter),
        catalogService.chapters(slug, 1, 100),
        catalogService.getBySlug(slug),
      ]);
      if (!active) return;
      setTitle(selected.workTitle);
      setChapterNumber(selected.number > 0 ? String(selected.number) : "Disponível");
      setPages(result.pages);
      setSiblings(chapterList.results);
      if (work) rememberReading(work, chapter, selected.number);
    } catch (reason) {
      if (active)
        setError(reason instanceof Error ? reason.message : "Não foi possível carregar o capítulo");
    } finally {
      if (active) setLoading(false);
    }
    return () => {
      active = false;
    };
  }, [chapter, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const index = siblings.findIndex((item) => item.id === chapter);
  const previous = index >= 0 ? siblings[index + 1] : undefined;
  const next = index > 0 ? siblings[index - 1] : undefined;
  const move = (target: Chapter | undefined) => {
    if (target) navigate({ to: "/ler/$slug/$chapter", params: { slug, chapter: target.id } });
  };

  return (
    <main className={`reader ${preferences.background === "black" ? "reader-black" : ""}`}>
      <div className="reader-bar">
        <Link to="/obra/$slug" params={{ slug }} aria-label="Voltar à obra">
          <ArrowLeft />
        </Link>
        <div>
          <strong>{title || "Carregando capítulo"}</strong>
          <span>{chapterNumber ? `Capítulo ${chapterNumber}` : ""}</span>
        </div>
        <div className="ml-auto flex gap-1">
          <button aria-label="Recarregar capítulo" onClick={() => void load()}>
            <RefreshCw />
          </button>
          <button
            aria-label="Tela cheia"
            onClick={() => document.documentElement.requestFullscreen?.()}
          >
            <Maximize />
          </button>
          <button
            aria-label="Preferências de leitura"
            aria-expanded={preferencesOpen}
            onClick={() => setPreferencesOpen((open) => !open)}
          >
            <Settings2 />
          </button>
        </div>
      </div>
      {preferencesOpen && (
        <section className="reader-settings" aria-label="Preferências de leitura">
          <label>
            Largura
            <select
              value={preferences.width}
              onChange={(event) =>
                updatePreferences({ width: event.target.value as ReaderPreferences["width"] })
              }
            >
              <option value="700px">Compacta</option>
              <option value="900px">Padrão</option>
              <option value="1200px">Larga</option>
              <option value="100%">Tela inteira</option>
            </select>
          </label>
          <label>
            Espaçamento
            <select
              value={preferences.gap}
              onChange={(event) =>
                updatePreferences({ gap: Number(event.target.value) as ReaderPreferences["gap"] })
              }
            >
              <option value={0}>Sem espaço</option>
              <option value={8}>Pequeno</option>
              <option value={16}>Confortável</option>
            </select>
          </label>
          <label>
            Fundo
            <select
              value={preferences.background}
              onChange={(event) =>
                updatePreferences({
                  background: event.target.value as ReaderPreferences["background"],
                })
              }
            >
              <option value="soft">Suave</option>
              <option value="black">Preto</option>
            </select>
          </label>
        </section>
      )}
      <div
        className="reader-content"
        style={{ maxWidth: preferences.width, gap: `${preferences.gap}px` }}
      >
        {error ? (
          <div className="reader-placeholder">
            <h1>Capítulo indisponível</h1>
            <p>{error}</p>
            <button className="primary-button mt-5" onClick={() => void load()}>
              <RefreshCw />
              Tentar novamente
            </button>
          </div>
        ) : loading ? (
          <div className="reader-placeholder">
            <span>CARREGANDO</span>
            <h1>Preparando páginas em português</h1>
            <p>As páginas são salvas no servidor antes de serem exibidas.</p>
          </div>
        ) : pages.length ? (
          pages.map((page) =>
            failedImages.includes(page.index) ? (
              <div key={page.index} className="reader-placeholder second">
                <h2>Página {page.index + 1} indisponível</h2>
                <button
                  className="secondary-button mt-4"
                  onClick={() =>
                    setFailedImages((items) => items.filter((item) => item !== page.index))
                  }
                >
                  Tentar carregar
                </button>
              </div>
            ) : (
              <img
                key={page.index}
                src={page.url}
                alt={`Página ${page.index + 1}`}
                loading={page.index < 2 ? "eager" : "lazy"}
                className="mx-auto block max-w-full"
                onError={() => setFailedImages((items) => [...items, page.index])}
              />
            ),
          )
        ) : (
          <div className="reader-placeholder">
            <h1>Capítulo sem páginas disponíveis</h1>
            <p>Volte à obra e tente outro capítulo enquanto a fonte é atualizada.</p>
          </div>
        )}
      </div>
      <div className="reader-nav">
        <button className="secondary-button" onClick={() => move(previous)} disabled={!previous}>
          <ChevronLeft />
          Capítulo anterior
        </button>
        <span>{pages.length ? `${pages.length} páginas` : ""}</span>
        <button className="secondary-button" onClick={() => move(next)} disabled={!next}>
          Próximo capítulo
          <ChevronRight />
        </button>
      </div>
    </main>
  );
}
