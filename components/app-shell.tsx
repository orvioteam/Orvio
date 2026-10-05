"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Calendar, Menu, Plus, Search } from "lucide-react";
import { useApp } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeOrganization, currentUser } = useApp();

  const pageTitle = {
    "/dashboard": "Übersicht",
    "/schedule": "Kalender",
    "/jobs": "Aufträge",
    "/customers": "Kunden",
    "/employees": "Mitarbeiter",
    "/settings": "Einstellungen",
  }[pathname ?? "/dashboard"] ?? "CleanFlow";

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6">
            <div className="flex items-center gap-3 lg:hidden">
              <button type="button" className="rounded-lg border border-slate-200 p-2 text-slate-600">
                <Menu className="h-5 w-5" />
              </button>
              <p className="text-lg font-semibold">CleanFlow</p>
            </div>

            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 md:flex">
              <Search className="h-4 w-4" />
              <span>Schnellsuche</span>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <button type="button" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
                <Bell className="h-4 w-4" />
              </button>
              <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                  {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Benutzer"}</p>
                  <p className="text-xs text-slate-500">{activeOrganization?.name ?? "Organisation"}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">{pageTitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Calendar className="h-4 w-4" />
                Heute
              </button>
              <Link href="/jobs" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                <Plus className="h-4 w-4" />
                Auftrag hinzufügen
              </Link>
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
