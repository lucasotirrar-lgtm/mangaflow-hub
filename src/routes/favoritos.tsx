import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/components/account-page";
export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos — Yae Manga House" },
      {
        name: "description",
        content: "Suas obras favoritas salvas para acesso rápido.",
      },
    ],
  }),
  component: () => <AccountPage section="favoritos" />,
});
