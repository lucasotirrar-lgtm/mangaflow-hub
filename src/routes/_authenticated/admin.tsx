import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { MangaManager } from "@/components/admin/manga-manager";
import { DestaqueManager } from "@/components/admin/destaque-manager";
import { GeneroManager, NoticiaManager } from "@/components/admin/lista-managers";
import { DashboardOverview } from "@/components/admin/dashboard-overview";

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

const abas = ["Visão geral", "Mangás", "Destaques", "Notícias", "Gêneros"] as const;

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [aba, setAba] = useState<(typeof abas)[number]>("Visão geral");

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
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
            Esta conta está autenticada, mas não possui a função de administrador. Solicite um
            convite ou a atribuição da função ao responsável pelo Supabase.
          </p>
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
            {aba === "Visão geral" && <DashboardOverview />}
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
