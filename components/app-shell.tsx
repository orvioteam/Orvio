"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useApp } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { activeOrganization, currentRole, isReady, appError, refreshData, t } = useApp();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const ownerOnlyPath = ["/jobs", "/customers", "/employees"].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const employeeRestricted = isReady && currentRole === "employee" && ownerOnlyPath;

  useEffect(() => {
    if (employeeRestricted) router.replace("/dashboard");
  }, [employeeRestricted, router]);

  return (
    <div className="flex min-h-screen min-w-0 bg-[#f7f7f4] text-slate-900">
      <Sidebar />
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label={t("Navigation")}>
          <button type="button" className="absolute inset-0 bg-slate-950/40" aria-label={t("Navigation schließen")} onClick={() => setMobileNavOpen(false)} />
          <div className="relative z-10 h-full">
            <Sidebar mobile onNavigate={() => setMobileNavOpen(false)} />
          </div>
          <button type="button" className="relative z-10 m-3 flex h-10 w-10 items-center justify-center self-start rounded-md bg-white text-slate-700" aria-label={t("Navigation schließen")} onClick={() => setMobileNavOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm md:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label={t("Navigation öffnen")} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">CleanFlow</p>
              <p className="truncate text-xs text-slate-500">{activeOrganization?.name ?? t("Arbeitsbereich")}</p>
            </div>
          </div>
          <span className="ml-3 h-2 w-2 shrink-0 rounded-full bg-emerald-700" aria-label={t("Arbeitsbereich aktiv")} />
        </header>

        <main className="mx-auto w-full min-w-0 max-w-[1440px] flex-1 p-4 pb-8 sm:p-6 md:p-8 lg:px-10">
          {!isReady ? (
            <div role="status" className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">{t("Organisationsdaten werden geladen…")}</div>
          ) : appError ? (
            <section role="alert" className="rounded-lg border border-rose-200 bg-white p-6">
              <h1 className="font-semibold text-rose-800">{t("Daten konnten nicht geladen werden")}</h1>
              <p className="mt-2 break-words text-sm text-rose-700">{appError}</p>
              <button type="button" onClick={() => void refreshData()} className="mt-4 min-h-10 rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white">{t("Erneut versuchen")}</button>
            </section>
          ) : employeeRestricted ? (
            <div role="status" className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">{t("Ansicht wird geladen…")}</div>
          ) : <Suspense fallback={<div role="status" className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">{t("Ansicht wird geladen…")}</div>}>{children}</Suspense>}
        </main>
      </div>
    </div>
  );
}
