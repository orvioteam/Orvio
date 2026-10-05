"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BriefcaseBusiness, CalendarDays, LogOut, Settings, Users, UserRound } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers";

const navItems = [
  { href: "/dashboard", label: "Heute", icon: CalendarDays },
  { href: "/jobs", label: "Aufträge", icon: BriefcaseBusiness },
  { href: "/customers", label: "Kunden", icon: Users },
  { href: "/employees", label: "Mitarbeiter", icon: UserRound },
];

export function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeOrganization, currentUser, signOut } = useApp();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
      onNavigate?.();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Abmeldung fehlgeschlagen.");
      setIsSigningOut(false);
    }
  };

  return (
    <aside className={mobile
      ? "group flex h-full w-[min(19rem,88vw)] shrink-0 flex-col border-r border-slate-200 bg-white text-slate-800"
      : "group hidden w-[4.5rem] shrink-0 flex-col border-r border-slate-200 bg-white text-slate-800 md:flex xl:w-60"}>
      <div className="flex h-[4.25rem] items-center border-b border-slate-200 px-4 xl:px-5">
        <Link href="/dashboard" onClick={onNavigate} className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#176b4a] text-xs font-semibold tracking-wide text-white">CF</span>
          <span className={`${mobile ? "block" : "hidden xl:block"} min-w-0`}>
            <span className="block text-sm font-semibold tracking-tight text-slate-900">CleanFlow</span>
            <span className="block truncate text-xs text-slate-500">{activeOrganization?.name ?? "Einsatzplanung"}</span>
          </span>
        </Link>
      </div>

      <nav aria-label="Hauptnavigation" className="flex-1 space-y-1 px-2 py-5 xl:px-3">
        <p className={`${mobile ? "block" : "hidden xl:block"} mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400`}>Arbeitsbereich</p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              title={mobile ? undefined : label}
              className={[
                "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                isActive ? "bg-emerald-50 font-medium text-[#14563c]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              <span className={mobile ? "block" : "hidden xl:block"}>{label}</span>
            </Link>
          );
        })}
        <div className="!my-4 border-t border-slate-100" />
        <p className={`${mobile ? "block" : "hidden xl:block"} mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400`}>Konto</p>
        <Link
          href="/settings"
          onClick={onNavigate}
          aria-current={pathname === "/settings" ? "page" : undefined}
          title={mobile ? undefined : "Einstellungen"}
          className={[
            "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
            pathname === "/settings" ? "bg-emerald-50 font-medium text-[#14563c]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
          ].join(" ")}
        >
          <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          <span className={mobile ? "block" : "hidden xl:block"}>Einstellungen</span>
        </Link>
      </nav>

      <div className="border-t border-slate-200 p-3 xl:p-4">
        {signOutError ? <p role="alert" className="mb-2 break-words text-xs text-rose-700">{signOutError}</p> : null}
        <div className="flex min-w-0 items-center gap-3 px-1 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
            {currentUser?.firstName?.[0] ?? "U"}{currentUser?.lastName?.[0] ?? ""}
          </span>
          <span className={`${mobile ? "block" : "hidden xl:block"} min-w-0 flex-1`}>
            <span className="block truncate text-sm font-medium text-slate-800">{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Konto"}</span>
            <span className="block truncate text-xs text-slate-500">{currentUser?.email ?? "Nicht angemeldet"}</span>
          </span>
        </div>
        <button
          type="button"
          disabled={isSigningOut}
          onClick={() => void handleSignOut()}
          title={mobile ? undefined : "Abmelden"}
          className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-60"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          <span className={mobile ? "block" : "hidden xl:block"}>{isSigningOut ? "Abmeldung läuft…" : "Abmelden"}</span>
        </button>
      </div>
    </aside>
  );
}
