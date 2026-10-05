"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/providers";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentUser, isReady } = useApp();

  useEffect(() => {
    if (isReady && !currentUser) {
      router.replace("/login");
    }
  }, [currentUser, isReady, router]);

  if (!isReady || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
          Anmeldung wird vorbereitet...
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
