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
    <footer className="mt-20 border-t border-border bg-surface/50 pb-24 lg:pb-0">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div>
          <Link to="/" className="font-display text-2xl font-extrabold">
            <span className="text-gradient">Yae Manga House</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Seu catálogo pessoal de mangás, manhwas e light novels, com fontes unificadas e
            progresso de leitura em um só lugar.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="font-display text-base font-bold">{column.title}</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {column.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="inline-flex min-h-11 items-center transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground lg:px-8">
        © {new Date().getFullYear()} Yae Manga House · Projeto pessoal.
      </div>
    </footer>
  );
}
