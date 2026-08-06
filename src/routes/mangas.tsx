import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "@/components/catalog-page";
export const Route = createFileRoute("/mangas")({
  component: () => (
    <CatalogPage
      title="Catálogo completo"
      description="Todas as obras disponíveis nas suas fontes, em uma visão unificada."
    />
  ),
});
