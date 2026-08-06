import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchDestaques, type DestaqueRow } from "@/lib/cms";
import { ImageUpload } from "./image-upload";

type Form = Omit<DestaqueRow, "id"> & { id?: string };

const vazio: Form = {
  title: "",
  synopsis: "",
  image_url: null,
  rank_label: "1º",
  rating: 4.5,
  status: "Em andamento",
  genres: [],
  sort_order: 0,
};

const input =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function DestaqueManager() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["cms", "destaques"], queryFn: fetchDestaques });
  const [form, setForm] = useState<Form | null>(null);

  const salvar = useMutation({
    mutationFn: async (f: Form) => {
      const payload = { ...f, rating: Number(f.rating), sort_order: Number(f.sort_order) };
      delete (payload as { id?: string }).id;
      if (f.id) {
        const { error } = await supabase.from("destaques").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("destaques").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Destaque salvo.");
      setForm(null);
      void qc.invalidateQueries({ queryKey: ["cms"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("destaques").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Destaque excluído.");
      void qc.invalidateQueries({ queryKey: ["cms"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="card-surface p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold">Destaques ({data.length})</h2>
          <button
            onClick={() => setForm({ ...vazio })}
            className="flex items-center gap-1 rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Novo
          </button>
        </div>
        <ul className="space-y-2">
          {data.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-2"
            >
              {d.image_url ? (
                <img src={d.image_url} alt="" className="h-14 w-24 rounded-md object-cover" />
              ) : (
                <span className="grid h-14 w-24 place-items-center rounded-md bg-surface-2 text-[10px] text-muted-foreground">
                  sem imagem
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold">{d.title}</p>
                <p className="text-xs text-muted-foreground">
                  {d.rank_label} lugar · nota {d.rating}
                </p>
              </div>
              <button
                aria-label="Editar"
                onClick={() => setForm({ ...d })}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-primary"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                aria-label="Excluir"
                onClick={() => excluir.mutate(d.id)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum destaque cadastrado — o banner da página inicial usa o conteúdo de exemplo.
            </p>
          )}
        </ul>
      </div>

      {form && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate(form);
          }}
          className="card-surface space-y-3 p-4"
        >
          <h3 className="font-display font-extrabold">
            {form.id ? "Editar destaque" : "Novo destaque"}
          </h3>
          <ImageUpload
            value={form.image_url}
            pasta="destaques"
            aspect="aspect-video"
            onChange={(url) => setForm({ ...form, image_url: url })}
          />
          <input
            className={input}
            required
            placeholder="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className={input}
            rows={4}
            placeholder="Sinopse"
            value={form.synopsis}
            onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className={input}
              placeholder="Posição (1º)"
              value={form.rank_label}
              onChange={(e) => setForm({ ...form, rank_label: e.target.value })}
            />
            <input
              className={input}
              type="number"
              step="0.1"
              min="0"
              max="5"
              placeholder="Nota"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
            />
            <select
              className={input}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option>Em andamento</option>
              <option>Completo</option>
            </select>
            <input
              className={input}
              type="number"
              placeholder="Ordem"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            />
          </div>
          <input
            className={input}
            placeholder="Gêneros separados por vírgula"
            value={form.genres.join(", ")}
            onChange={(e) =>
              setForm({
                ...form,
                genres: e.target.value
                  .split(",")
                  .map((g) => g.trim())
                  .filter(Boolean),
              })
            }
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={salvar.isPending}
              className="flex-1 rounded-full bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-full border border-border px-4 py-2 text-sm font-bold text-muted-foreground"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
