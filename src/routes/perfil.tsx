import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/components/account-page";
export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu Perfil — Yae Manga House" },
      {
        name: "description",
        content: "Gerencie sua conta e preferências na Yae Manga House.",
      },
    ],
  }),
  component: () => <AccountPage section="perfil" />,
});
