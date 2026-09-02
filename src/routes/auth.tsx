import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar no painel — Yae Manga House" },
      {
        name: "description",
        content:
          "Acesse sua conta da Yae Manga House para gerenciar mangás, destaques, notícias e gêneros do site.",
      },
      { property: "og:title", content: "Entrar no painel — Yae Manga House" },
      {
        property: "og:description",
        content: "Login de administradores e leitores da Yae Manga House.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível continuar.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="font-display text-3xl font-extrabold">
        <span className="text-gradient">Acesso administrativo</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Entre com uma conta autorizada para acessar o painel de administração.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          aria-label="E-mail"
          className="w-full rounded-xl border border-input bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <input
          type="password"
          required
          minLength={6}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha"
          aria-label="Senha"
          className="w-full rounded-xl border border-input bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-full bg-gradient-primary px-6 py-3 font-display text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {carregando ? "Aguarde..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
