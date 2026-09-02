import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

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

  async function onGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Falha ao entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/admin" });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="font-display text-3xl font-extrabold">
        <span className="text-gradient">Acesso administrativo</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Entre com uma conta autorizada para acessar o painel de administração.
      </p>

      <button
        onClick={onGoogle}
        className="mt-6 rounded-full border border-border bg-surface px-5 py-3 font-display text-sm font-bold transition-colors hover:border-primary hover:text-primary"
      >
        Continuar com o Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
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
