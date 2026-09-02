import { Link } from "@tanstack/react-router";
import { Bell, BookMarked, Heart, ListPlus, Settings, User } from "lucide-react";
import { MangaCard } from "@/components/manga-card";
import { ProductState } from "@/components/product-states";
import { useLocalLibrary, type LocalLibraryEntry } from "@/lib/local-library";
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
    BookMarked,
    "Histórico",
    "O histórico de leitura será exibido quando o progresso sincronizado estiver disponível.",
  ],
  perfil: [User, "Seu perfil", "Preferências da sua conta."],
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

export function AccountPage({ section }: { section: AccountSection }) {
  const [Icon, title, description] = meta[section];
  const { entries, remove, toggleFavorite } = useLocalLibrary();
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
      ) : section === "listas" || section === "historico" || section === "notificacoes" ? (
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
              Ao abrir uma obra adulta, o site mostra um aviso e pede confirmação.
            </p>
          </section>
        </div>
      ) : section === "perfil" ? (
        <div className="profile-card">
          <div className="profile-avatar">Y</div>
          <div>
            <h2>Leitor Yae</h2>
            <p>Entre em sua conta para sincronizar preferências entre dispositivos.</p>
          </div>
          <Link to="/auth" className="secondary-button">
            Entrar
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
