import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { claimFirstAdmin } from "@/lib/admin.functions";
import { MangaManager } from "@/components/admin/manga-manager";
import { DestaqueManager } from "@/components/admin/destaque-manager";
import { GeneroManager, NoticiaManager } from "@/components/admin/lista-managers";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel de administração — Yae Manga House" },
      {
        name: "description",
        content:
          "Gerencie mangás, capas, capítulos, destaques, notícias e gêneros da Yae Manga House.",
      },
      { property: "og:title", content: "Painel de administração — Yae Manga House" },
      {
        property: "og:description",
        content: "Área restrita para gerenciar o conteúdo do site.",
      },
    ],
  }),
  component: AdminPage,
});

const abas = ["Mangás", "Destaques", "Notícias", "Gêneros"] as const;

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [aba, setAba] = useState<(typeof abas)[number]>("Mangás");
  const claim = useServerFn(claimFirstAdmin);

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function tornarAdmin() {
    try {
      const res = await claim({});
      if (res.granted) {
        toast.success("Você agora é administrador!");
        window.location.reload();
      } else {
        toast.error("O site já possui um administrador.");
      }
    } catch {
      toast.error("Não foi possível conceder o acesso.");
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">
            <span className="text-gradient">Painel</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <button
          onClick={sair}
          className="rounded-full border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary"
        >
          Sair
        </button>
      </div>

      {isAdmin === false && (
        <div className="card-surface mt-8 max-w-xl space-y-3 p-5">
          <h2 className="font-display text-lg font-extrabold">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground">
            Sua conta ainda não é administradora. Se você é o dono do site e ninguém assumiu o
            painel ainda, clique abaixo para se tornar o administrador.
          </p>
          <button
            onClick={tornarAdmin}
            className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Tornar-me administrador
          </button>
        </div>
      )}

      {isAdmin && (
        <>
          <div className="no-scrollbar mt-8 flex gap-2 overflow-x-auto pb-2">
            {abas.map((a) => (
              <button
                key={a}
                onClick={() => setAba(a)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${
                  aba === a
                    ? "border-transparent bg-gradient-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {aba === "Mangás" && <MangaManager />}
            {aba === "Destaques" && <DestaqueManager />}
            {aba === "Notícias" && <NoticiaManager />}
            {aba === "Gêneros" && <GeneroManager />}
          </div>
        </>
      )}
    </div>
  );
}
