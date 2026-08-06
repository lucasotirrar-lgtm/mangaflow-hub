import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/components/account-page";
export const Route = createFileRoute("/biblioteca")({
  component: () => <AccountPage section="biblioteca" />,
});
