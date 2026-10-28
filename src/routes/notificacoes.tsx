import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/components/account-page";
export const Route = createFileRoute("/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — Yae Manga House" },
      {
        name: "description",
        content: "Novidades e lançamentos de capítulos de suas obras acompanhadas.",
      },
    ],
  }),
  component: () => <AccountPage section="notificacoes" />,
});
