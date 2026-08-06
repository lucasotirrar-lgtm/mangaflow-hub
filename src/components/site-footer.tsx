import { Link } from "@tanstack/react-router";

const colunas = [
  { titulo: "Navegar", itens: ["Início", "Gêneros", "Todos os mangás", "Lançamentos"] },
  { titulo: "Comunidade", itens: ["Avaliações", "Perfil do usuário", "Marcadores", "Notificações"] },
  { titulo: "Sobre", itens: ["Quem somos", "Contato", "Termos de uso", "Privacidade"] },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-surface/50">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div>
          <Link to="/" className="font-display text-2xl font-extrabold">
            <span className="text-gradient">Yae Manga House</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Sua biblioteca completa de anime, mangá e manhwa. Leia, acompanhe capítulos e
            descubra novas histórias todos os dias.
          </p>
        </div>
        {colunas.map((c) => (
          <div key={c.titulo}>
            <h3 className="font-display text-base font-bold">{c.titulo}</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {c.itens.map((i) => (
                <li key={i} className="transition-colors hover:text-primary">
                  {i}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground lg:px-8">
        © {new Date().getFullYear()} Yae Manga House. Todos os direitos reservados.
      </div>
    </footer>
  );
}
