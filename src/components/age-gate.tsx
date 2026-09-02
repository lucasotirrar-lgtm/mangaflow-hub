import { useState } from "react";

export function useAgeGate() {
  const [pending, setPending] = useState<(() => void) | null>(null);
  return {
    guard: (adult: boolean, action: () => void) => {
      if (adult) setPending(() => action);
      else action();
    },
    modal: pending ? (
      <div
        className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adult-warning-title"
      >
        <div className="max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
          <h2 id="adult-warning-title" className="font-display text-xl font-extrabold">
            Conteúdo para maiores
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Este conteúdo é para maiores de idade. Deseja continuar?
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button className="secondary-button" onClick={() => setPending(null)}>
              Cancelar
            </button>
            <button
              className="primary-button"
              onClick={() => {
                const action = pending;
                setPending(null);
                action();
              }}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    ) : null,
  };
}
