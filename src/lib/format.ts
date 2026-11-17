/**
 * Utilitários de formatação de capítulos e datas para o catálogo e leitor.
 */

export function formatChapterLabel(number: number): string {
  return number > 0 ? `Capítulo ${number}` : "Capítulo disponível";
}

export function formatReleaseDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
