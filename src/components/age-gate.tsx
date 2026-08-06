/**
 * Uso pessoal: a classificação etária continua visível, mas não bloqueia a navegação.
 * O componente mantém a mesma interface para que a confirmação possa voltar no futuro.
 */
export function useAgeGate() {
  return {
    guard: (_adult: boolean, action: () => void) => action(),
    modal: null,
  };
}
