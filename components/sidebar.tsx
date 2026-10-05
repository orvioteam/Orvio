"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, BriefcaseBusiness, CalendarDays, Settings, Users } from "lucide-react";
import { useApp } from "@/components/providers";

const navItems = [
  { href: "/dashboard", label: "Heute", icon: CalendarDays },
  { href: "/jobs", label: "Aufträge", icon: BriefcaseBusiness },
  { href: "/customers", label: "Kunden", icon: Users },
  { href: "/employees", label: "Mitarbeiter", icon: Building2 },
  { href: "/settings", label: "Einstellungen", icon: Settings },
];

export function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { activeOrganization, currentUser } = useApp();

  return (
    <aside className={mobile
      ? "flex h-full w-[min(20rem,85vw)] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-slate-900 text-slate-100"
      : "hidden w-72 shrink-0 border-r border-slate-200 bg-slate-900 text-slate-100 lg:flex lg:flex-col"}>
      <div className="border-b border-slate-800 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-sm font-semibold text-white">CF</div>
          <div>
            <p className="text-lg font-semibold text-white">CleanFlow</p>
            <p className="text-xs text-slate-400">Aufträge einfach planen</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-5">
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-800/80 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Organisation</p>
          <p className="mt-2 break-words text-sm font-semibold text-white">{activeOrganization?.name ?? "Keine Organisation"}</p>
        </div>

        <nav aria-label="Hauptnavigation" className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  isActive ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/20" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-slate-800/80 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
            {currentUser?.firstName?.[0] ?? "U"}{currentUser?.lastName?.[0] ?? "S"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Gast"}</p>
            <p className="truncate text-xs text-slate-400">{currentUser?.email ?? "Nicht angemeldet"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
