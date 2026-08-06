import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchGeneros, fetchNoticias } from "@/lib/cms";
import { ImageUpload } from "./image-upload";

const input =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function NoticiaManager() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["cms", "noticias"], queryFn: fetchNoticias });
  const [texto, setTexto] = useState("");

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("noticias")
        .insert({ texto, sort_order: data.length });
      if (error) throw error;
    },
    onSuccess: () => {
      setTexto("");
      toast.success("Notícia adicionada.");
      void qc.invalidateQueries({ queryKey: ["cms"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("noticias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cms"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="card-surface max-w-3xl space-y-4 p-4">
      <h2 className="font-display text-lg font-extrabold">Notícias do letreiro</h2>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (texto.trim()) criar.mutate();
        }}
      >
        <input
          className={input}
          placeholder="Nova notícia"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button className="flex items-center gap-1 rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </form>
      <ul className="space-y-2">
        {data.map((n) => (
          <li
            key={n.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3 text-sm"
          >
            <span className="flex-1">{n.texto}</span>
            <button
              aria-label="Excluir"
              onClick={() => excluir.mutate(n.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Sem notícias cadastradas — o letreiro usa o conteúdo de exemplo.
          </p>
        )}
      </ul>
    </div>
  );
}

export function GeneroManager() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["cms", "generos"], queryFn: fetchGeneros });
  const [nome, setNome] = useState("");
  const [imagem, setImagem] = useState<string | null>(null);

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("generos")
        .insert({ nome, image_url: imagem, sort_order: data.length });
      if (error) throw error;
    },
    onSuccess: () => {
      setNome("");
      setImagem(null);
      toast.success("Gênero adicionado.");
      void qc.invalidateQueries({ queryKey: ["cms"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atualizarImagem = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string | null }) => {
      const { error } = await supabase.from("generos").update({ image_url: url }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cms"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("generos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cms"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <form
        className="card-surface max-w-md space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (nome.trim()) criar.mutate();
        }}
      >
        <h2 className="font-display text-lg font-extrabold">Novo gênero</h2>
        <ImageUpload value={imagem} onChange={setImagem} pasta="generos" aspect="aspect-[4/3]" />
        <input
          className={input}
          placeholder="Nome do gênero"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <button className="w-full rounded-full bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          Adicionar
        </button>
      </form>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {data.map((g) => (
          <div key={g.id} className="card-surface space-y-2 p-3">
            <ImageUpload
              value={g.image_url}
              pasta="generos"
              aspect="aspect-[4/3]"
              onChange={(url) => atualizarImagem.mutate({ id: g.id, url })}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-display text-sm font-bold">{g.nome}</span>
              <button
                aria-label="Excluir"
                onClick={() => excluir.mutate(g.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {data.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Sem gêneros cadastrados — o site usa a lista de exemplo.
        </p>
      )}
    </div>
  );
}
