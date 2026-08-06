import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function useAgeGate() {
  const [pending, setPending] = useState<null | (() => void)>(null);
  const confirmed =
    typeof window !== "undefined" && localStorage.getItem("yae-age-confirmed") === "true";
  const guard = (adult: boolean, action: () => void) => {
    if (!adult || confirmed) action();
    else setPending(() => action);
  };
  const modal = (
    <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-destructive/15">
            <ShieldAlert className="text-destructive" />
          </div>
          <DialogTitle>Conteúdo destinado a maiores de 18 anos</DialogTitle>
          <DialogDescription>
            Esta obra pode conter temas explícitos. Confirme que você tem 18 anos ou mais para
            continuar. Esta preferência fica salva apenas neste dispositivo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setPending(null)}>
            Voltar
          </Button>
          <Button
            onClick={() => {
              localStorage.setItem("yae-age-confirmed", "true");
              const action = pending;
              setPending(null);
              action?.();
            }}
          >
            Tenho 18 anos ou mais
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
  return { guard, modal };
}
