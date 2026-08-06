import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/components/account-page";
export const Route = createFileRoute("/notificacoes")({
  component: () => <AccountPage section="notificacoes" />,
});
