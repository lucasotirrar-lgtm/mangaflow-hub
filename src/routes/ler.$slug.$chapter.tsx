import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { catalogService } from "@/services/catalog-service";
import type { Chapter } from "@/types/content";
import {
  getSavedReadingPage,
  rememberReading,
  updateReadingPage,
} from "@/lib/reading-history";
import { safeStorage } from "@/lib/safe-storage";

export const Route = createFileRoute("/ler/$slug/$chapter")({
  head: () => ({
    meta: [
      { title: "Leitor — Yae Manga House" },
      {
        name: "description",
        content: "Leitor imersivo de alta velocidade para mangás e manhwas em português.",
      },
    ],
  }),
  component: Reader,
});

type ReaderPreferences = {
  width: "700px" | "900px" | "1200px" | "100%";
  gap: 0 | 8 | 16;
  background: "soft" | "black";
  mode: "vertical" | "horizontal-rtl" | "horizontal-ltr";
};

const defaultPreferences: ReaderPreferences = {
  width: "900px",
  gap: 0,
  background: "soft",
  mode: "vertical",
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
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageRefs = useRef<Map<number, HTMLElement>>(new Map());
  const pageHeights = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    try {
      const saved = safeStorage.getItem("mangaflow-reader-preferences");
      if (saved) setPreferences({ ...defaultPreferences, ...JSON.parse(saved) });
    } catch {
      safeStorage.removeItem("mangaflow-reader-preferences");
    }
  }, []);

  const updatePreferences = (next: Partial<ReaderPreferences>) => {
    setPreferences((current) => {
      const value = { ...current, ...next };
      try {
        safeStorage.setItem("mangaflow-reader-preferences", JSON.stringify(value));
      } catch {
        // Safe storage handles fallbacks
      }
      return value;
    });
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    let active = true;
    setError("");
    setLoading(true);
    setPages([]);
    setTitle("");
    setChapterNumber("");
    setFailedImages([]);
    pageRefs.current.clear();
    pageHeights.current.clear();

    async function fetchChapter() {
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

        const savedPage = getSavedReadingPage(slug, chapter);
        const targetPage =
          savedPage && savedPage <= result.pages.length && savedPage >= 1 ? savedPage : 1;
        setCurrentPage(targetPage);

        if (work) rememberReading(work, chapter, selected.number, targetPage);

        const chLabel = selected.number > 0 ? `Cap. ${selected.number}` : "Capítulo";
        document.title = `${selected.workTitle} — ${chLabel} | Yae Manga House`;

        if (targetPage > 1) {
          setTimeout(() => {
            const el = pageRefs.current.get(targetPage - 1);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 300);
        }
      } catch (reason) {
        if (active) {
          setError(
            reason instanceof Error ? reason.message : "Não foi possível carregar o capítulo",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchChapter();

    return () => {
      active = false;
      document.title = "Yae Manga House";
    };
  }, [chapter, reloadKey, slug]);

  const index = siblings.findIndex((item) => item.id === chapter);
  const previous = index >= 0 ? siblings[index + 1] : undefined;
  const next = index > 0 ? siblings[index - 1] : undefined;
  const move = (target: Chapter | undefined) => {
    if (target) navigate({ to: "/ler/$slug/$chapter", params: { slug, chapter: target.id } });
  };

  // Preload next chapter when approaching the end of current chapter
  useEffect(() => {
    if (!next || pages.length === 0 || loading) return;
    if (currentPage >= Math.max(1, pages.length - 2)) {
      catalogService
        .pages(next.id)
        .then((res) => {
          if (res.pages?.[0]?.url) {
            const img = new Image();
            img.src = res.pages[0].url;
          }
          if (res.pages?.[1]?.url) {
            const img = new Image();
            img.src = res.pages[1].url;
          }
        })
        .catch(() => {});
    }
  }, [currentPage, next, pages.length, loading]);

  // Persist current page in history
  useEffect(() => {
    if (pages.length > 0 && !loading && currentPage >= 1) {
      updateReadingPage(slug, chapter, currentPage);
    }
  }, [chapter, currentPage, loading, pages.length, slug]);

  // Keyboard navigation respecting active reading mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.isComposing
      ) {
        return;
      }

      if (preferences.mode === "horizontal-rtl") {
        // Manga RTL: Left advances, Right goes back
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          if (currentPage < pages.length) {
            setCurrentPage((p) => p + 1);
          } else if (next) {
            move(next);
          }
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          if (currentPage > 1) {
            setCurrentPage((p) => p - 1);
          } else if (previous) {
            move(previous);
          }
        }
      } else if (preferences.mode === "horizontal-ltr") {
        // LTR: Right advances, Left goes back
        if (e.key === "ArrowRight") {
          e.preventDefault();
          if (currentPage < pages.length) {
            setCurrentPage((p) => p + 1);
          } else if (next) {
            move(next);
          }
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          if (currentPage > 1) {
            setCurrentPage((p) => p - 1);
          } else if (previous) {
            move(previous);
          }
        }
      } else {
        // Vertical mode: Left/Right navigate chapters
        if (e.key === "ArrowLeft") {
          if (previous) {
            e.preventDefault();
            move(previous);
          }
        } else if (e.key === "ArrowRight") {
          if (next) {
            e.preventDefault();
            move(next);
          }
        }
      }

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        setPreferencesOpen((open) => !open);
      } else if (e.key === "Escape") {
        if (preferencesOpen) {
          setPreferencesOpen(false);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previous, next, preferencesOpen, preferences.mode, currentPage, pages.length]);

  // Track page reading progress via scroll in vertical mode
  useEffect(() => {
    if (pages.length === 0 || preferences.mode !== "vertical") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) {
          const indexAttr = visible[0].target.getAttribute("data-page-index");
          if (indexAttr) {
            const pageNum = Number(indexAttr) + 1;
            setCurrentPage(pageNum);
          }
        }
      },
      {
        rootMargin: "-20% 0px -40% 0px",
        threshold: 0.1,
      },
    );

    pageRefs.current.forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [pages, preferences.mode]);

  const activeSinglePage = pages[currentPage - 1];

  const handleHorizontalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftSide = clickX < rect.width * 0.45;
    const isRightSide = clickX > rect.width * 0.55;

    if (preferences.mode === "horizontal-rtl") {
      if (isLeftSide) {
        if (currentPage < pages.length) setCurrentPage((p) => p + 1);
        else if (next) move(next);
      } else if (isRightSide) {
        if (currentPage > 1) setCurrentPage((p) => p - 1);
        else if (previous) move(previous);
      }
    } else if (preferences.mode === "horizontal-ltr") {
      if (isRightSide) {
        if (currentPage < pages.length) setCurrentPage((p) => p + 1);
        else if (next) move(next);
      } else if (isLeftSide) {
        if (currentPage > 1) setCurrentPage((p) => p - 1);
        else if (previous) move(previous);
      }
    }
  };

  return (
    <main className={`reader ${preferences.background === "black" ? "reader-black" : ""}`}>
      <div className="reader-bar">
        <Link to="/obra/$slug" params={{ slug }} aria-label="Voltar à obra">
          <ArrowLeft />
        </Link>
        <div className="min-w-0 max-w-[200px] truncate sm:max-w-none">
          <strong className="block truncate">{title || "Carregando capítulo"}</strong>
          <span>{chapterNumber ? `Capítulo ${chapterNumber}` : ""}</span>
        </div>

        {siblings.length > 0 && (
          <div className="flex items-center">
            <select
              aria-label="Selecionar capítulo"
              value={chapter}
              onChange={(e) =>
                navigate({
                  to: "/ler/$slug/$chapter",
                  params: { slug, chapter: e.target.value },
                })
              }
              className="max-w-[130px] truncate rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground outline-none transition hover:border-primary/60 focus:border-primary sm:max-w-[200px] sm:text-sm"
            >
              {siblings.map((c) => (
                <option key={c.id} value={c.id} className="py-1">
                  {c.number > 0 ? `Capítulo ${c.number}` : "Capítulo disponível"}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            aria-label="Recarregar capítulo"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            <RefreshCw />
          </button>
          <button
            aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia (Atalho: F)"}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize /> : <Maximize />}
          </button>
          <button
            aria-label="Preferências de leitura (Atalho: S)"
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
            Modo de leitura
            <select
              value={preferences.mode}
              onChange={(event) =>
                updatePreferences({
                  mode: event.target.value as ReaderPreferences["mode"],
                })
              }
            >
              <option value="vertical">Cascata (Vertical / Webtoon)</option>
              <option value="horizontal-rtl">Paginado (Mangá: Direita → Esquerda)</option>
              <option value="horizontal-ltr">Paginado (Ocidental: Esquerda → Direita)</option>
            </select>
          </label>
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
          {preferences.mode === "vertical" && (
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
          )}
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

      {error ? (
        <div className="reader-placeholder">
          <h1>Capítulo indisponível</h1>
          <p>{error}</p>
          <button
            type="button"
            className="primary-button mt-5"
            onClick={() => setReloadKey((k) => k + 1)}
          >
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
      ) : pages.length === 0 ? (
        <div className="reader-placeholder">
          <h1>Capítulo sem páginas disponíveis</h1>
          <p>Volte à obra e tente outro capítulo enquanto a fonte é atualizada.</p>
        </div>
      ) : preferences.mode !== "vertical" ? (
        /* Modo Paginado (Horizontal RTL / LTR) */
        <div className="mx-auto flex min-h-[82vh] max-w-[1200px] flex-col items-center justify-center px-2 py-4">
          <div
            className="relative flex w-full cursor-pointer select-none items-center justify-center overflow-hidden"
            onClick={handleHorizontalClick}
            style={{ maxWidth: preferences.width }}
          >
            {activeSinglePage && failedImages.includes(activeSinglePage.index) ? (
              <div className="reader-placeholder second my-8 w-full rounded-2xl">
                <h2>Página {activeSinglePage.index + 1} indisponível</h2>
                <button
                  className="secondary-button mt-4"
                  onClick={() =>
                    setFailedImages((items) =>
                      items.filter((item) => item !== activeSinglePage.index),
                    )
                  }
                >
                  Tentar carregar
                </button>
              </div>
            ) : (
              activeSinglePage && (
                <img
                  src={activeSinglePage.url}
                  alt={`Página ${activeSinglePage.index + 1}`}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="max-h-[88vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
                  onError={() =>
                    setFailedImages((items) => [...items, activeSinglePage.index])
                  }
                />
              )
            )}
          </div>

          <div
            className="mt-4 flex w-full max-w-[500px] items-center gap-3 rounded-full border border-border/80 bg-background/90 px-4 py-2 shadow-lg backdrop-blur"
          >
            <button
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface"
              aria-label="Página anterior"
              disabled={currentPage <= 1 && !previous}
              onClick={() => {
                if (currentPage > 1) setCurrentPage((p) => p - 1);
                else if (previous) move(previous);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="range"
              min={1}
              max={pages.length}
              value={currentPage}
              onChange={(e) => setCurrentPage(Number(e.target.value))}
              aria-label="Navegar pelas páginas"
              className="flex-1 accent-primary"
            />
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
              {currentPage} / {pages.length}
            </span>
            <button
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface"
              aria-label="Próxima página"
              disabled={currentPage >= pages.length && !next}
              onClick={() => {
                if (currentPage < pages.length) setCurrentPage((p) => p + 1);
                else if (next) move(next);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Modo Cascata Contínua (Webtoon Vertical) */
        <div
          className="reader-content"
          style={{ maxWidth: preferences.width, gap: `${preferences.gap}px` }}
        >
          {pages.map((page) => {
            if (failedImages.includes(page.index)) {
              return (
                <div
                  key={page.index}
                  data-page-index={page.index}
                  ref={(el) => {
                    if (el) pageRefs.current.set(page.index, el);
                    else pageRefs.current.delete(page.index);
                  }}
                  className="reader-placeholder second"
                >
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
              );
            }

            return (
              <div
                key={page.index}
                data-page-index={page.index}
                ref={(el) => {
                  if (el) {
                    pageRefs.current.set(page.index, el);
                    if (el.offsetHeight > 100) {
                      pageHeights.current.set(page.index, `${el.offsetHeight}px`);
                    }
                  } else {
                    pageRefs.current.delete(page.index);
                  }
                }}
                className="w-full"
                style={{
                  minHeight: pageHeights.current.get(page.index) || "auto",
                }}
              >
                <img
                  src={page.url}
                  alt={`Página ${page.index + 1}`}
                  loading={page.index < 2 ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={page.index === 0 ? "high" : "auto"}
                  className="mx-auto block max-w-full"
                  onLoad={(e) => {
                    const h = e.currentTarget.offsetHeight;
                    if (h > 100) {
                      pageHeights.current.set(page.index, `${h}px`);
                    }
                  }}
                  onError={() => setFailedImages((items) => [...items, page.index])}
                />
              </div>
            );
          })}
        </div>
      )}

      {pages.length > 0 && !loading && preferences.mode === "vertical" && (
        <aside
          aria-live="polite"
          className="pointer-events-none fixed bottom-4 right-4 z-40 flex select-none items-center gap-1.5 rounded-full border border-border/80 bg-background/90 px-3.5 py-1.5 text-xs font-semibold shadow-lg backdrop-blur"
        >
          <span className="text-muted-foreground">Página</span>
          <span className="text-foreground">{currentPage}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground">{pages.length}</span>
        </aside>
      )}

      <div className="reader-nav">
        <button className="secondary-button" onClick={() => move(previous)} disabled={!previous}>
          <ChevronLeft />
          Capítulo anterior
        </button>
        {siblings.length > 0 ? (
          <div className="flex items-center gap-2">
            <select
              aria-label="Selecionar capítulo atual"
              value={chapter}
              onChange={(e) =>
                navigate({
                  to: "/ler/$slug/$chapter",
                  params: { slug, chapter: e.target.value },
                })
              }
              className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground outline-none transition hover:border-primary/60 focus:border-primary sm:text-sm"
            >
              {siblings.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.number > 0 ? `Capítulo ${c.number}` : "Capítulo"}
                </option>
              ))}
            </select>
            {pages.length > 0 && (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                ({pages.length} pág.)
              </span>
            )}
          </div>
        ) : (
          <span>{pages.length ? `${pages.length} páginas` : ""}</span>
        )}
        <button className="secondary-button" onClick={() => move(next)} disabled={!next}>
          Próximo capítulo
          <ChevronRight />
        </button>
      </div>
    </main>
  );
}
