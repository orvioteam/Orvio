"use client";

import clsx from "clsx";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { useApp } from "@/components/providers";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-11 items-center justify-center !rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        {
          "bg-[#176b4a] text-white hover:bg-[#11563b] active:bg-[#0e4932]": variant === "primary",
          "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100": variant === "secondary",
          "text-slate-700 hover:bg-slate-100 active:bg-slate-200": variant === "ghost",
          "bg-rose-700 text-white hover:bg-rose-800": variant === "danger",
        },
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const field = (
    <input
      className={clsx(
        "w-full !rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100",
        className,
      )}
      {...props}
    />
  );

  if (!label) return field;

  return (
    <label className="block space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {field}
    </label>
  );
}

export function Select({ className, label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; children: React.ReactNode }) {
  const field = (
    <select
      className={clsx(
        "w-full !rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );

  if (!label) return field;

  return (
    <label className="block space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {field}
    </label>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("!rounded-xl border border-slate-200 bg-white p-5", className)} {...props} />;
}

export function Badge({ children, status }: { children: React.ReactNode; status?: "scheduled" | "in_progress" | "completed" | "cancelled" }) {
  const palette = {
    scheduled: "bg-slate-100 text-slate-700",
    in_progress: "bg-amber-50 text-amber-800",
    completed: "bg-emerald-50 text-emerald-800",
    cancelled: "bg-rose-50 text-rose-700",
  };

  return (
    <span className={clsx("inline-flex items-center rounded-md px-2 py-1 text-xs font-medium", status ? palette[status] : "bg-slate-100 text-slate-700")}>
      {children}
    </span>
  );
}

export function ConfirmDelete({ label, disabled, onConfirm }: { label: string; disabled?: boolean; onConfirm: () => void }) {
  const { t } = useApp();
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsConfirming(true)}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
        aria-label={`${t("Löschen")} ${label}`}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only">{t("Löschen")}</span>
      </button>
      {isConfirming ? (
        <span role="group" aria-label={`${t("Löschen bestätigen")} ${label}`} className="inline-flex items-center gap-1">
          <span className="hidden text-xs text-slate-600 sm:inline">{t("Löschen?")}</span>
          <button type="button" onClick={() => setIsConfirming(false)} className="min-h-9 rounded-md border border-slate-200 px-2 text-xs font-medium text-slate-600 hover:bg-slate-100">{t("Nein")}</button>
          <button type="button" disabled={disabled} onClick={() => { setIsConfirming(false); onConfirm(); }} className="min-h-9 rounded-md bg-rose-700 px-2 text-xs font-medium text-white hover:bg-rose-800 disabled:opacity-50">{t("Ja")}</button>
        </span>
      ) : null}
    </span>
  );
}

export function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="space-y-2">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="flex items-end justify-between gap-3">
        <span className="text-3xl font-semibold tracking-tight text-slate-900">{value}</span>
      </div>
      {detail ? <p className="text-xs text-slate-500">{detail}</p> : null}
    </Card>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-center justify-center rounded-lg border-dashed bg-transparent px-5 py-14 text-center shadow-none">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.8rem]">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">{action}</div> : null}
    </div>
  );
}
