export function useAgeGate() {
  return {
    guard: (_adult: boolean, action: () => void) => action(),
    modal: null,
  };
}
