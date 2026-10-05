import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  const isMissingSession = error instanceof Error && error.name === "AuthSessionMissingError";
  if (error && !isMissingSession) {
    console.error("Supabase session verification failed in protected layout.", error);
    throw new Error("Die Sitzung konnte nicht überprüft werden. Bitte laden Sie die Seite erneut.");
  }

  if (isMissingSession || !data.user) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
