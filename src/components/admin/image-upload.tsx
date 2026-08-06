import { useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadImagem } from "@/lib/cms";

export function ImageUpload({
  value,
  onChange,
  pasta,
  aspect = "aspect-[2/3]",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  pasta: string;
  aspect?: string;
}) {
  const [enviando, setEnviando] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setEnviando(true);
    try {
      onChange(await uploadImagem(file, pasta));
      toast.success("Imagem enviada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no envio da imagem.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-2">
      <label
        className={`relative grid ${aspect} w-full cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-background/50 text-center text-xs text-muted-foreground transition-colors hover:border-primary`}
      >
        {value ? (
          <img src={value} alt="Pré-visualização" className="h-full w-full object-cover" />
        ) : enviando ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <span className="flex flex-col items-center gap-2 p-4">
            <ImagePlus className="h-6 w-6 text-primary" />
            Clique para enviar uma imagem
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </label>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-semibold text-muted-foreground hover:text-primary"
        >
          Remover imagem
        </button>
      )}
    </div>
  );
}
