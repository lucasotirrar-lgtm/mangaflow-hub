import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  BookMarked,
  Compass,
  Heart,
  Home,
  Library,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const nav = [
  { to: "/", label: "Início", icon: Home },
  { to: "/descobrir", label: "Descobrir", icon: Compass },
  { to: "/mangas", label: "Catálogo", icon: Library },
  { to: "/biblioteca", label: "Biblioteca", icon: BookMarked },
  { to: "/listas", label: "Listas", icon: Heart },
];
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    const stored = localStorage.getItem("yae-theme");
    const value = stored ? stored === "dark" : true;
    setDark(value);
    document.documentElement.classList.toggle("dark", value);
  }, []);
  const toggle = () => {
    const value = !dark;
    setDark(value);
    document.documentElement.classList.toggle("dark", value);
    localStorage.setItem("yae-theme", value ? "dark" : "light");
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate({ to: "/buscar", search: { q: query.trim() } });
  };
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="logo-mark">Y</span>
            <span className="hidden font-display text-lg font-extrabold sm:block">
              Yae <span className="text-gradient">House</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {nav.slice(0, 3).map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                activeProps={{ className: "nav-link active" }}
                className="nav-link"
              >
                {label}
              </Link>
            ))}
          </nav>
          <form onSubmit={submit} className="relative ml-auto hidden w-full max-w-md md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar no catálogo"
              placeholder="Buscar título, gênero ou autor"
              className="w-full rounded-full border border-input bg-surface/80 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </form>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <button
              onClick={toggle}
              aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
              className="icon-button"
            >
              {dark ? <Sun /> : <Moon />}
            </button>
            <Link to="/notificacoes" aria-label="Notificações" className="icon-button relative">
              <Bell />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            </Link>
            <Link to="/perfil" aria-label="Perfil" className="icon-button">
              <User />
            </Link>
            <button
              onClick={() => setOpen(!open)}
              aria-label="Abrir menu"
              className="icon-button lg:hidden"
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-border p-3 lg:hidden">
            <form onSubmit={submit} className="relative mb-3 md:hidden">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar no catálogo"
                className="w-full rounded-xl border bg-surface py-3 pl-10 pr-3"
              />
            </form>
            <div className="grid grid-cols-2 gap-1">
              {[
                ...nav,
                { to: "/historico", label: "Histórico", icon: BookMarked },
                { to: "/configuracoes", label: "Configurações", icon: Settings },
              ].map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl p-3 text-sm font-bold text-muted-foreground hover:bg-surface hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>
      <nav className="bottom-nav lg:hidden">
        {nav.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeProps={{ className: "bottom-link active" }}
            className="bottom-link"
          >
            <Icon />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
