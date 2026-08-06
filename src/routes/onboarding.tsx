import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Check, Database, ShieldCheck } from "lucide-react";
export const Route = createFileRoute("/onboarding")({ component: Onboarding });
function Onboarding() {
  return (
    <main className="page-shell flex min-h-[75vh] items-center justify-center pb-28">
      <section className="w-full max-w-3xl rounded-3xl border border-border bg-surface p-6 sm:p-10">
        <span className="eyebrow">Primeiros passos</span>
        <h1 className="mt-3 font-display text-4xl font-extrabold">Monte seu espaço de leitura</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Escolha suas preferências agora. Tudo poderá ser alterado depois nas configurações.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Choice icon={BookOpen} title="Formatos" text="Mangá, manhwa e light novel" />
          <Choice icon={Database} title="Fontes" text="Local primeiro, com fallback" />
          <Choice
            icon={ShieldCheck}
            title="Faixa etária"
            text="Controle explícito de conteúdo 18+"
          />
        </div>
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Link to="/" className="secondary-button">
            Pular por agora
          </Link>
          <Link to="/descobrir" search={{ age: undefined }} className="primary-button">
            Concluir e descobrir
          </Link>
        </div>
      </section>
    </main>
  );
}
function Choice({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof BookOpen;
  title: string;
  text: string;
}) {
  return (
    <button className="relative rounded-2xl border border-primary bg-primary/10 p-4 text-left">
      <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />
      <Icon className="h-6 w-6 text-primary" />
      <strong className="mt-5 block">{title}</strong>
      <span className="mt-1 block text-xs text-muted-foreground">{text}</span>
    </button>
  );
}
