import { Link } from "@tanstack/react-router";
import { Bell, BookMarked, BookOpen, Heart, ListPlus, Play, Settings, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { MangaCard } from "@/components/manga-card";
import { ProductState } from "@/components/product-states";
import { useLocalLibrary, type LocalLibraryEntry } from "@/lib/local-library";
import {
  clearReadingHistory,
  removeReadingHistory,
  useReadingHistory,
  type ReadingEntry,
} from "@/lib/reading-history";
import { useAdultContent } from "@/lib/adult-content";
import { safeStorage } from "@/lib/safe-storage";
import type { CatalogItem } from "@/types/content";

const meta = {
  biblioteca: [BookMarked, "Minha biblioteca", "Obras salvas neste dispositivo."],
  favoritos: [Heart, "Favoritos", "Obras marcadas como favoritas neste dispositivo."],
  listas: [
    ListPlus,
    "Minhas listas",
    "Listas sincronizadas serão disponibilizadas em uma próxima atualização.",
  ],
  historico: [
    BookOpen,
    "Histórico de leitura",
    "Obras e capítulos lidos recentemente neste dispositivo.",
  ],
  perfil: [User, "Seu perfil", "Preferências e armazenamento local."],
  configuracoes: [Settings, "Configurações", "Preferências de aparência e leitura."],
  notificacoes: [Bell, "Notificações", "Avisos de capítulos e do sistema."],
  admin: [Settings, "Administração", "Use o painel administrativo autenticado."],
} as const;
export type AccountSection = keyof typeof meta;

function toCard(entry: LocalLibraryEntry): CatalogItem {
  return {
    ...entry,
    id: entry.slug,
    synopsis: "",
    rating: null,
    year: null,
    genres: [],
    language: "Português (BR)",
    chapterCount: 0,
    chapters: [],
  };
}

function formatReadDate(isoString: string) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

// ─── Reader preferences ────────────────────────────────────────────────────
const READER_PREF_KEY = "mangaflow-reader-preferences";

type ReaderPrefs = {
  mode?: "cascade" | "paged";
  width?: "narrow" | "normal" | "wide" | "full";
  background?: "dark" | "light" | "sepia";
};

function useReaderPrefs() {
  const [prefs, setPrefsState] = useState<ReaderPrefs>(() => {
    try {
      const raw = safeStorage.getItem(READER_PREF_KEY);
      return raw ? (JSON.parse(raw) as ReaderPrefs) : {};
    } catch {
      return {};
    }
  });

  const update = (patch: Partial<ReaderPrefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      safeStorage.setItem(READER_PREF_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { prefs, update };
}

// ─── Profile section with real stats ───────────────────────────────────────
function ProfileSection() {
  const { entries } = useLocalLibrary();
  const history = useReadingHistory();
  const favorites = entries.filter((e) => e.favorite);
  const lastRead = history[0];

  return (
    <div className="space-y-6">
      <div className="profile-card">
        <div className="profile-avatar">Y</div>
        <div className="flex-1">
          <h2>Leitor Yae</h2>
          <p className="text-sm text-muted-foreground">
            Biblioteca e histórico salvos localmente neste dispositivo.
          </p>
        </div>
        <Link to="/configuracoes" className="secondary-button">
          Configurações
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Obras salvas", value: entries.length },
          { label: "Favoritos", value: favorites.length },
          { label: "Capítulos lidos", value: history.length },
        ].map(({ label, value }) => (
          <div key={label} className="side-card text-center">
            <p className="font-display text-3xl font-extrabold text-primary">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {lastRead && (
        <div className="side-card flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Última leitura
            </p>
            <p className="mt-1 truncate font-display font-bold">{lastRead.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {lastRead.lastChapterNumber > 0
                ? `Capítulo ${lastRead.lastChapterNumber}`
                : "Capítulo disponível"}
              {lastRead.lastReadAt && ` · ${formatReadDate(lastRead.lastReadAt)}`}
            </p>
          </div>
          <Link
            to="/ler/$slug/$chapter"
            params={{ slug: lastRead.slug, chapter: lastRead.lastChapterId }}
            className="primary-button text-xs"
          >
            <Play className="h-3.5 w-3.5" />
            Continuar
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Settings section with reader prefs ────────────────────────────────────
function ConfigSection() {
  const { adultEnabled, setAdultEnabled } = useAdultContent();
  const { prefs, update } = useReaderPrefs();

  return (
    <div className="settings-grid">
      {/* Reader preferences */}
      <section className="side-card space-y-4">
        <h2>Leitura</h2>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Modo de exibição
          </p>
          <div className="flex gap-2">
            {(["cascade", "paged"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => update({ mode: m })}
                className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                  (prefs.mode ?? "cascade") === m
                    ? "border-primary bg-primary/10 font-bold text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {m === "cascade" ? "Cascata (scroll)" : "Paginado"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Largura da página
          </p>
          <div className="flex flex-wrap gap-2">
            {(["narrow", "normal", "wide", "full"] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => update({ width: w })}
                className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                  (prefs.width ?? "normal") === w
                    ? "border-primary bg-primary/10 font-bold text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {{ narrow: "Estreita", normal: "Normal", wide: "Larga", full: "Total" }[w]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Fundo do leitor
          </p>
          <div className="flex gap-2">
            {(["dark", "light", "sepia"] as const).map((bg) => (
              <button
                key={bg}
                type="button"
                onClick={() => update({ background: bg })}
                className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                  (prefs.background ?? "dark") === bg
                    ? "border-primary bg-primary/10 font-bold text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {{ dark: "Escuro", light: "Claro", sepia: "Sépia" }[bg]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Adult content */}
      <section className="side-card">
        <h2>Conteúdo adulto</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ao ativar, a lista adulta fica disponível e não mostra aviso novamente neste
          dispositivo. Ao desligar, obras adultas deixam de aparecer no site.
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={adultEnabled}
          className="secondary-button mt-4"
          onClick={() => setAdultEnabled(!adultEnabled)}
        >
          {adultEnabled ? "Conteúdo adulto ligado" : "Conteúdo adulto desligado"}
        </button>
      </section>
    </div>
  );
}

// ─── Main AccountPage ───────────────────────────────────────────────────────
export function AccountPage({ section }: { section: AccountSection }) {
  const [Icon, title, description] = meta[section];
  const { entries, remove, toggleFavorite } = useLocalLibrary();
  const history = useReadingHistory();
  const visible = section === "favoritos" ? entries.filter((entry) => entry.favorite) : entries;
  const isCollection = section === "biblioteca" || section === "favoritos";
  return (
    <main className="page-shell pb-28">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            <Icon />
            Espaço pessoal
          </span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {section === "historico" && history.length > 0 && (
          <button
            type="button"
            onClick={clearReadingHistory}
            className="secondary-button text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpar histórico
          </button>
        )}
      </div>
      {isCollection ? (
        visible.length ? (
          <div className="space-y-6">
            <div className="catalog-grid">
              {visible.map((entry) => (
                <MangaCard manga={toCard(entry)} key={entry.slug} />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {visible.map((entry) => (
                <div
                  key={entry.slug}
                  className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <span className="max-w-48 truncate">{entry.title}</span>
                  <button className="text-primary" onClick={() => toggleFavorite(entry.slug)}>
                    {entry.favorite ? "Remover favorito" : "Favoritar"}
                  </button>
                  <button className="text-destructive" onClick={() => remove(entry.slug)}>
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ProductState state="empty" />
        )
      ) : section === "historico" ? (
        history.length ? (
          <div className="space-y-6">
            <div className="catalog-grid">
              {history.map((item) => (
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
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Detalhes de leitura
              </h2>
              <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
                {history.map((item) => (
                  <div
                    key={item.slug}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <strong className="block truncate font-display text-base font-bold text-foreground">
                        {item.title}
                      </strong>
                      <span className="text-xs text-muted-foreground">
                        Último lido:{" "}
                        {item.lastChapterNumber > 0
                          ? `Capítulo ${item.lastChapterNumber}`
                          : "Capítulo disponível"}
                        {item.lastPage && item.lastPage > 1 ? ` (Pág. ${item.lastPage})` : ""}
                        {item.lastReadAt && ` · ${formatReadDate(item.lastReadAt)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to="/ler/$slug/$chapter"
                        params={{ slug: item.slug, chapter: item.lastChapterId }}
                        className="primary-button text-xs py-2 px-3 min-h-0"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Continuar
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeReadingHistory(item.slug)}
                        aria-label={`Remover ${item.title} do histórico`}
                        className="secondary-button text-xs py-2 px-3 min-h-0 text-muted-foreground hover:text-destructive"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ProductState
            state="empty"
            action={
              <Link to="/descobrir" className="primary-button mt-4">
                Explorar catálogo
              </Link>
            }
          />
        )
      ) : section === "listas" || section === "notificacoes" ? (
        <ProductState state="empty" />
      ) : section === "configuracoes" ? (
        <ConfigSection />
      ) : section === "perfil" ? (
        <ProfileSection />
      ) : (
        <Link to="/admin" className="secondary-button">
          Abrir administração
        </Link>
      )}
    </main>
  );
}
