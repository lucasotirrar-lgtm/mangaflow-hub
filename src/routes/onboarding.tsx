import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Check, Database, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { safeStorage } from "@/lib/safe-storage";
export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Boas-vindas — Yae Manga House" },
      {
        name: "description",
        content: "Configure sua experiência de leitura na Yae Manga House.",
      },
    ],
  }),
  component: Onboarding,
});

const PREF_KEY = "yae-onboarding-prefs";

type Prefs = {
  formatos: string[];
  fonte: string;
  faixaEtaria: string;
};

function Onboarding() {
  const navigate = useNavigate();
  const [formatos, setFormatos] = useState<string[]>(["manga", "manhwa"]);
  const [fonte, setFonte] = useState("local");
  const [faixa, setFaixa] = useState("livre");

  const toggleFormato = (f: string) =>
    setFormatos((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );

  const finish = () => {
    const prefs: Prefs = { formatos, fonte, faixaEtaria: faixa };
    safeStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    navigate({ to: "/descobrir", search: { age: undefined } });
  };

  return (
    <main className="page-shell flex min-h-[75vh] items-center justify-center pb-28">
      <section className="w-full max-w-3xl rounded-3xl border border-border bg-surface p-6 sm:p-10">
        <span className="eyebrow">Primeiros passos</span>
        <h1 className="mt-3 font-display text-4xl font-extrabold">Monte seu espaço de leitura</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Escolha suas preferências agora. Tudo poderá ser alterado depois nas configurações.
        </p>

        {/* Formatos */}
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Formatos</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { id: "manga", label: "Mangá", desc: "Quadrinhos japoneses" },
              { id: "manhwa", label: "Manhwa", desc: "Quadrinhos coreanos" },
              { id: "manhua", label: "Manhua", desc: "Quadrinhos chineses" },
            ].map(({ id, label, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleFormato(id)}
                className={`relative rounded-2xl border p-4 text-left transition-colors ${
                  formatos.includes(id)
                    ? "border-primary bg-primary/10"
                    : "border-border bg-surface hover:border-primary/50"
                }`}
              >
                {formatos.includes(id) && (
                  <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />
                )}
                <BookOpen className="h-6 w-6 text-primary" />
                <strong className="mt-5 block">{label}</strong>
                <span className="mt-1 block text-xs text-muted-foreground">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fonte */}
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Fonte preferida</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: "local", label: "Local primeiro", desc: "Servidor próprio, mais rápido" },
              { id: "fallback", label: "Com fallback", desc: "Usa fonte alternativa se necessário" },
            ].map(({ id, label, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFonte(id)}
                className={`relative rounded-2xl border p-4 text-left transition-colors ${
                  fonte === id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-surface hover:border-primary/50"
                }`}
              >
                {fonte === id && (
                  <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />
                )}
                <Database className="h-6 w-6 text-primary" />
                <strong className="mt-5 block">{label}</strong>
                <span className="mt-1 block text-xs text-muted-foreground">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Faixa Etária */}
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Faixa etária</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: "livre", label: "Livre", desc: "Oculta conteúdo adulto (+18)" },
              { id: "adulto", label: "Adulto (+18)", desc: "Exibe conteúdo 18+ no catálogo" },
            ].map(({ id, label, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFaixa(id)}
                className={`relative rounded-2xl border p-4 text-left transition-colors ${
                  faixa === id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-surface hover:border-primary/50"
                }`}
              >
                {faixa === id && (
                  <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />
                )}
                <ShieldCheck className="h-6 w-6 text-primary" />
                <strong className="mt-5 block">{label}</strong>
                <span className="mt-1 block text-xs text-muted-foreground">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Link to="/" className="secondary-button">
            Pular por agora
          </Link>
          <button type="button" onClick={finish} className="primary-button">
            Concluir e descobrir
          </button>
        </div>
      </section>
    </main>
  );
}
