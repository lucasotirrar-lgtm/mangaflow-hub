import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/components/account-page";
export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de Leitura — Yae Manga House" },
      {
        name: "description",
        content: "Acompanhe seus últimos mangás lidos e continue de onde parou.",
      },
    ],
  }),
  component: () => <AccountPage section="historico" />,
});
