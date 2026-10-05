"use client";

import { Suspense, useState } from "react";
import { Menu, X } from "lucide-react";
import { useApp } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { activeOrganization, isReady, appError, refreshData } = useApp();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen min-w-0 bg-slate-50 text-slate-900">
      <Sidebar />
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-slate-950/50" aria-label="Navigation schliessen" onClick={() => setMobileNavOpen(false)} />
          <div className="relative z-10 h-full">
            <Sidebar mobile onNavigate={() => setMobileNavOpen(false)} />
          </div>
          <button type="button" className="relative z-10 m-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-700" aria-label="Navigation schliessen" onClick={() => setMobileNavOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white">
          <div className="flex min-h-16 items-center gap-3 px-4 py-3 md:px-6">
            <button type="button" aria-label="Navigation öffnen" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 lg:hidden">
              <p className="truncate text-base font-semibold">CleanFlow</p>
              <p className="truncate text-xs text-slate-500">{activeOrganization?.name ?? "Organisation wird geladen"}</p>
            </div>
            <p className="hidden truncate text-sm font-medium text-slate-600 lg:block">{activeOrganization?.name ?? "Organisation wird geladen"}</p>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 pb-8 md:p-6">
          {!isReady ? (
            <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Organisationsdaten werden geladen…</div>
          ) : appError ? (
            <section role="alert" className="rounded-2xl border border-rose-200 bg-white p-6">
              <h1 className="font-semibold text-rose-800">Daten konnten nicht geladen werden</h1>
              <p className="mt-2 break-words text-sm text-rose-700">{appError}</p>
              <button type="button" onClick={() => void refreshData()} className="mt-4 min-h-11 rounded-xl bg-rose-700 px-4 py-2 text-sm font-medium text-white">Erneut versuchen</button>
            </section>
          ) : <Suspense fallback={<div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Ansicht wird geladen…</div>}>{children}</Suspense>}
        </main>
      </div>
    </div>
  );
}
