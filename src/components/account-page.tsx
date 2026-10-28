import { Link } from "@tanstack/react-router";
import { Bell, BookMarked, BookOpen, Heart, ListPlus, Play, Settings, Trash2, User } from "lucide-react";
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

export function AccountPage({ section }: { section: AccountSection }) {
  const [Icon, title, description] = meta[section];
  const { entries, remove, toggleFavorite } = useLocalLibrary();
  const history = useReadingHistory();
  const { adultEnabled, setAdultEnabled } = useAdultContent();
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
        <div className="settings-grid">
          <section className="side-card">
            <h2>Leitura</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ajustes de leitura serão salvos quando a sincronização de conta for habilitada.
            </p>
          </section>
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
      ) : section === "perfil" ? (
        <div className="profile-card">
          <div className="profile-avatar">Y</div>
          <div>
            <h2>Leitor Yae</h2>
            <p className="text-sm text-muted-foreground">
              Seu espaço pessoal, biblioteca e histórico de leitura estão salvos neste dispositivo.
            </p>
          </div>
          <Link to="/configuracoes" className="secondary-button">
            Configurações
          </Link>
        </div>
      ) : (
        <Link to="/admin" className="secondary-button">
          Abrir administração
        </Link>
      )}
    </main>
  );
}
