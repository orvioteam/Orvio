"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BriefcaseBusiness, CalendarDays, LogOut, Settings, Users, UserRound } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers";
import { translateError } from "@/lib/i18n";

export function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeOrganization, currentRole, currentUser, language, signOut, t } = useApp();
  const navItems = currentRole === "owner"
    ? [
      { href: "/dashboard", label: "Heute", icon: CalendarDays },
      { href: "/jobs", label: "Aufträge", icon: BriefcaseBusiness },
      { href: "/customers", label: "Kunden", icon: Users },
      { href: "/employees", label: "Mitarbeiter", icon: UserRound },
    ]
    : currentRole === "employee"
      ? [{ href: "/dashboard", label: "Meine Aufträge", icon: CalendarDays }]
      : [];
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
      setSignOutError(translateError(language, error, "Abmeldung fehlgeschlagen."));
      setIsSigningOut(false);
    }
  };

  return (
    <aside className={mobile
      ? "group flex h-full w-[min(19rem,88vw)] shrink-0 flex-col border-r border-slate-200 bg-white text-slate-800"
      : "group hidden w-[4.5rem] shrink-0 flex-col border-r border-slate-200 bg-white text-slate-800 md:flex xl:w-60"}>
      <div className="flex h-[4.25rem] items-center border-b border-slate-200 px-4 xl:px-5">
        <Link href="/dashboard" onClick={onNavigate} className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#176b4a] text-xs font-semibold tracking-wide text-white">OV</span>
          <span className={`${mobile ? "block" : "hidden xl:block"} min-w-0`}>
            <span className="block text-sm font-semibold tracking-tight text-slate-900">Orvio</span>
            <span className="block truncate text-xs text-slate-500">{activeOrganization?.name ?? t("Planung")}</span>
          </span>
        </Link>
      </div>

      <nav aria-label={t("Hauptnavigation")} className="flex-1 space-y-1 px-2 py-5 xl:px-3">
        <p className={`${mobile ? "block" : "hidden xl:block"} mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400`}>{t("Arbeitsbereich")}</p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              title={mobile ? undefined : t(label)}
              className={[
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2",
                isActive ? "bg-emerald-50 font-medium text-[#14563c]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              <span className={mobile ? "block" : "hidden xl:block"}>{t(label)}</span>
            </Link>
          );
        })}
        <div className="!my-4 border-t border-slate-100" />
        <p className={`${mobile ? "block" : "hidden xl:block"} mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400`}>{t("Konto")}</p>
        <Link
          href="/settings"
          onClick={onNavigate}
          aria-current={pathname === "/settings" ? "page" : undefined}
          title={mobile ? undefined : t("Einstellungen")}
          className={[
            "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2",
            pathname === "/settings" ? "bg-emerald-50 font-medium text-[#14563c]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
          ].join(" ")}
        >
          <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          <span className={mobile ? "block" : "hidden xl:block"}>{t("Einstellungen")}</span>
        </Link>
      </nav>

      <div className="border-t border-slate-200 p-3 xl:p-4">
        {signOutError ? <p role="alert" className="mb-2 break-words text-xs text-rose-700">{signOutError}</p> : null}
        <div className="flex min-w-0 items-center gap-3 px-1 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
            {currentUser?.firstName?.[0] ?? "U"}{currentUser?.lastName?.[0] ?? ""}
          </span>
          <span className={`${mobile ? "block" : "hidden xl:block"} min-w-0 flex-1`}>
            <span className="block truncate text-sm font-medium text-slate-800">{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : t("Konto")}</span>
            <span className="block truncate text-xs text-slate-500">            {currentUser?.email ?? t("Nicht angemeldet")}</span>
          </span>
        </div>
        <button
          type="button"
          disabled={isSigningOut}
          onClick={() => void handleSignOut()}
          title={mobile ? undefined : t("Abmelden")}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          <span className={mobile ? "block" : "hidden xl:block"}>{t(isSigningOut ? "Abmeldung läuft…" : "Abmelden")}</span>
        </button>
      </div>
    </aside>
  );
}
