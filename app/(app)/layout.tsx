import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (process.env.NODE_ENV === "development") {
    console.info("[auth-debug] DASHBOARD: server getUser result", JSON.stringify({
      userPresent: Boolean(data.user),
      userId: data.user?.id.slice(0, 8) ?? null,
      errorMessage: error?.message ?? null,
    }));
  }

  const isMissingSession = error instanceof Error && error.name === "AuthSessionMissingError";
  if (error && !isMissingSession) {
    console.error("Supabase session verification failed in protected layout.", error.message);
    throw new Error("Die Sitzung konnte nicht überprüft werden. Bitte laden Sie die Seite erneut.");
  }

  if (isMissingSession || !data.user) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[auth-debug] DASHBOARD: server layout redirecting to /login");
    }
    redirect("/login");
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[auth-debug] DASHBOARD: server layout accepted authenticated user", {
      userId: data.user.id.slice(0, 8),
    });
  }

  return <AppShell>{children}</AppShell>;
}
