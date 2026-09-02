export function useAgeGate() {
  return {
    guard: (adult: boolean, action: () => void) => {
      if (!adult || window.confirm("Este conteúdo é para maiores de idade. Deseja continuar?"))
        action();
    },
    modal: null,
  };
}
