import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/components/account-page";
export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Minha Biblioteca — Yae Manga House" },
      {
        name: "description",
        content: "Suas obras salvas e lista de leitura local na Yae Manga House.",
      },
    ],
  }),
  component: () => <AccountPage section="biblioteca" />,
});
