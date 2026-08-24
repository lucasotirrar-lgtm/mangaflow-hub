import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminDashboardStats = {
  generatedAt: string;
  health: {
    api: boolean;
    database: boolean;
    worker: boolean;
    storage: boolean;
    storageWarning: boolean;
    providerCircuitOpen: boolean;
  };
  catalog: {
    databaseTotal: number;
    siteVisible: number;
    adultHidden: number;
    updatedAt: string | null;
  };
  chapters: {
    total: number;
    worksWithChapters: number;
    withPageCount: number;
    coveragePercent: number;
    updatedAt: string | null;
  };
  assets: {
    total: number;
    available: number;
    bytes: number;
    covers: number;
    chapterPages: number;
    updatedAt: string | null;
  };
  storage: {
    dataBytes: number;
    databaseBytes: number;
    diskTotalBytes: number;
    diskFreeBytes: number;
    diskUsedPercent: number;
    assetLimitBytes: number;
    minimumFreeBytes: number;
    warningFreeBytes: number;
  };
  sync: {
    provider: string;
    status: string;
    importedLastRun: number;
    lastStartedAt: string | null;
    lastFinishedAt: string | null;
    ageSeconds: number | null;
    failures24h: number;
    runs24h: number;
    requests24h: number;
    changed24h: number;
    error: string | null;
    offset: number;
    providerTotal: number;
    stateUpdatedAt: string | null;
    providerFailures: number;
    providerNextRetryAt: string | null;
  };
  adultSync: {
    status: string;
    importedLastRun: number;
    lastFinishedAt: string | null;
    ageSeconds: number | null;
    offset: number;
    providerTotal: number;
    stateUpdatedAt: string | null;
  };
};

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) throw roleError;
    if (!role) throw new Error("Acesso administrativo necessário");

    const token = process.env["MANGAFLOW_ADMIN_TOKEN"];
    if (!token) throw new Error("Token interno do painel não configurado");
    const baseUrl = (process.env["MANGAFLOW_API_URL"] || "https://manga.vexclaud.site").replace(
      /\/$/,
      "",
    );
    const response = await fetch(`${baseUrl}/api/v1/admin/dashboard`, {
      headers: { "x-admin-token": token },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Painel interno indisponível (${response.status})`);
    return (await response.json()) as AdminDashboardStats;
  });

/**
 * Concede o papel de administrador ao usuário logado caso o site
 * ainda não possua nenhum administrador (primeiro acesso).
 */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) throw countError;

    if ((count ?? 0) > 0) return { granted: false };

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw error;

    return { granted: true };
  });
