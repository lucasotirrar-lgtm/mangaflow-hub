import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/components/account-page";
export const Route = createFileRoute("/listas")({
  head: () => ({
    meta: [
      { title: "Minhas Listas — Yae Manga House" },
      {
        name: "description",
        content: "Organize suas leituras em coleções e listas personalizadas.",
      },
    ],
  }),
  component: () => <AccountPage section="listas" />,
});
