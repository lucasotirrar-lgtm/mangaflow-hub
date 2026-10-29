import { Link } from "@tanstack/react-router";

const columns = [
  {
    title: "Navegar",
    items: [
      { label: "Início", to: "/" },
      { label: "Descobrir", to: "/descobrir" },
      { label: "Catálogo", to: "/mangas" },
      { label: "Buscar", to: "/buscar" },
    ],
  },
  {
    title: "Sua conta",
    items: [
      { label: "Biblioteca", to: "/biblioteca" },
      { label: "Favoritos", to: "/favoritos" },
      { label: "Histórico", to: "/historico" },
      { label: "Notificações", to: "/notificacoes" },
    ],
  },
  {
    title: "Produto",
    items: [
      { label: "Configurações", to: "/configuracoes" },
      { label: "Perfil", to: "/perfil" },
      { label: "Entrar", to: "/auth" },
      { label: "Administração", to: "/admin" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-surface/50 pb-24 lg:pb-0">
      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div>
          <Link to="/" className="font-display text-xl font-extrabold">
            <span className="text-gradient">Yae Manga House</span>
          </Link>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Seu catálogo pessoal de mangás, manhwas e light novels, com fontes unificadas e
            progresso de leitura em um só lugar.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="font-display text-base font-bold">{column.title}</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {column.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="inline-flex min-h-9 items-center transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-3 text-center text-[11px] leading-relaxed text-muted-foreground lg:px-8">
        <p>© {new Date().getFullYear()} Yae Manga House · Projeto independente, sem vínculo oficial com autores ou editoras.</p>
        <p className="mx-auto mt-1 max-w-4xl">
          Obras, personagens e marcas pertencem aos respectivos titulares. A inclusão de uma obra não implica vínculo ou endosso oficial; informações e disponibilidade podem variar.
        </p>
      </div>
    </footer>
  );
}
