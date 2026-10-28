import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/components/account-page";
export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Yae Manga House" },
      {
        name: "description",
        content: "Ajuste tema, preferências de leitor e filtros de conteúdo da Yae Manga House.",
      },
    ],
  }),
  component: () => <AccountPage section="configuracoes" />,
});
