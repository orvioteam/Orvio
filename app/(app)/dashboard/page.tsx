"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { de, enUS, fr, it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";
import { useApp } from "@/components/providers";
import { formatLocalizedDate, formatLocalizedDateRange, translateError } from "@/lib/i18n";
import type { Job } from "@/lib/types";

const statusLabel = {
  scheduled: "Geplant",
  in_progress: "In Arbeit",
  completed: "Erledigt",
  cancelled: "Storniert",
} as const;

type CalendarView = "day" | "week" | "month";

const getJobHour = (job: Job) => `${job.startTime.slice(0, 2)}:00`;

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, activeOrganization, currentRole, language, t, updateMyJobStatus } = useApp();
  const [statusError, setStatusError] = useState<string | null>(null);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const locale = { de, en: enUS, fr, it }[language];
  const today = startOfDay(new Date());
  const todayKey = format(today, "yyyy-MM-dd");
  const requestedDate = searchParams.get("date");
  const parsedDate = requestedDate ? parseISO(requestedDate) : null;
  const selectedDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) && parsedDate && isValid(parsedDate)
    ? startOfDay(parsedDate)
    : today;
  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const requestedView = searchParams.get("view");
  const view: CalendarView = requestedView === "week" || requestedView === "month" ? requestedView : "day";
  const dayJobs = state.jobs
    .filter((job) => job.date === dateKey)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const hourStart = Number(activeOrganization?.workdayStart.slice(0, 2) ?? "06");
  const hourEnd = Number(activeOrganization?.workdayEnd.slice(0, 2) ?? "24");
  const baseHours = Array.from({ length: Math.max(0, hourEnd - hourStart + 1) }, (_, index) =>
    `${String(hourStart + index).padStart(2, "0")}:00`,
  );
  const weekStartsOn = ((activeOrganization?.weekStartsOn ?? 1) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const weekStart = startOfWeek(selectedDate, { weekStartsOn });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekJobs = state.jobs.filter((job) => job.date >= format(weekStart, "yyyy-MM-dd") && job.date <= format(weekEnd, "yyyy-MM-dd"));
  const weekHours = Array.from(new Set([
    ...baseHours,
    ...weekJobs.map(getJobHour),
  ])).sort((a, b) => Number(a.slice(0, 2)) - Number(b.slice(0, 2)));
  const monthStart = startOfMonth(selectedDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn });
  const monthDays = eachDayOfInterval({
    start: monthGridStart,
    end: addDays(monthGridStart, 41),
  });
  const monthJobsByDate = new Map<string, number>();
  state.jobs.forEach((job) => monthJobsByDate.set(job.date, (monthJobsByDate.get(job.date) ?? 0) + 1));

  const setPlannerLocation = (date: Date, nextView: CalendarView) => {
    const nextDate = format(date, "yyyy-MM-dd");
    const params = new URLSearchParams();
    if (nextDate !== todayKey) params.set("date", nextDate);
    if (nextView !== "day") params.set("view", nextView);
    const query = params.toString();
    router.replace(query ? `/dashboard?${query}` : "/dashboard", { scroll: false });
  };

  const changePeriod = (direction: -1 | 1) => {
    const nextDate = view === "week"
      ? addWeeks(selectedDate, direction)
      : view === "month"
        ? addMonths(selectedDate, direction)
        : addDays(selectedDate, direction);
    setPlannerLocation(nextDate, view);
  };

  const periodLabel = view === "week"
    ? formatLocalizedDateRange(language, weekStart, weekEnd)
    : view === "month"
    ? format(selectedDate, "LLLL yyyy", { locale })
    : formatLocalizedDate(language, selectedDate, { dateStyle: "full" });

  const navigationLabel = view === "week" ? "Woche" : view === "month" ? "Monat" : "Tag";

  const getJobDetails = (job: Job) => {
    const customer = state.customers.find((entry) => entry.id === job.customerId);
    const employee = state.employees.find((entry) => entry.id === job.employeeId);
    return {
      customer: customer?.companyName || customer?.name || "Kunde nicht verfügbar",
      employee: employee ? `${employee.firstName} ${employee.lastName}` : "Nicht zugewiesen",
    };
  };

  if (currentRole === "employee") {
    return (
      <div className="mx-auto min-w-0 max-w-3xl">
        <PageHeader
          title={t("Meine Aufträge")}
          description={isToday(selectedDate) ? t("Heute") : formatLocalizedDate(language, selectedDate, { dateStyle: "full" })}
        />
        <div className="mb-5 flex items-center justify-between gap-3">
          <button type="button" aria-label={t("Vorheriger Tag")} onClick={() => setPlannerLocation(addDays(selectedDate, -1), "day")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">←</button>
          <p className="truncate text-center text-sm font-medium">{isToday(selectedDate) ? t("Heute") : format(selectedDate, "d. MMMM yyyy", { locale })}</p>
          <button type="button" aria-label={t("Nächster Tag")} onClick={() => setPlannerLocation(addDays(selectedDate, 1), "day")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">→</button>
        </div>
        {statusError ? <p role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{statusError}</p> : null}
        {dayJobs.length === 0 ? (
          <EmptyState title={t("Keine Aufträge geplant.")} description={t("Keine eigenen Aufträge geplant.")} />
        ) : (
          <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
            {dayJobs.map((job) => {
              const details = getJobDetails(job);
              const customer = state.customers.find((entry) => entry.id === job.customerId);
              const nextStatus = job.status === "scheduled" ? "in_progress" : job.status === "in_progress" ? "completed" : null;
              return (
                <article key={job.id} className="space-y-3 px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <time className="text-lg font-semibold tabular-nums text-slate-900">{job.startTime.slice(0, 5)}</time>
                    <Badge status={job.status}>{t(statusLabel[job.status])}</Badge>
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">{details.customer}</h2>
                    <p className="mt-1 text-sm text-slate-600">{job.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{job.address || customer?.address || "—"}</p>
                    {job.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{job.notes}</p> : null}
                  </div>
                  {nextStatus ? (
                    <button
                      type="button"
                      disabled={updatingJobId === job.id}
                      onClick={() => {
                        setStatusError(null);
                        setUpdatingJobId(job.id);
                        void updateMyJobStatus(job.id, nextStatus)
                          .catch((error: unknown) => setStatusError(translateError(language, error, "Auftragsstatus konnte nicht geändert werden.")))
                          .finally(() => setUpdatingJobId(null));
                      }}
                      className="min-h-12 w-full rounded-lg bg-[#176b4a] px-4 text-base font-semibold text-white hover:bg-[#11563b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingJobId === job.id ? t("Wird gespeichert…") : t(nextStatus === "in_progress" ? "In Arbeit" : "Erledigt")}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <PageHeader
        title={view === "day"
          ? (isToday(selectedDate) ? t("Heute") : formatLocalizedDate(language, selectedDate, { dateStyle: "full" }))
          : t(navigationLabel)}
        description={view === "day" && isToday(selectedDate) ? formatLocalizedDate(language, selectedDate) : undefined}
        action={<Button type="button" onClick={() => router.push(`/jobs?new=1&date=${dateKey}`)}><Plus className="mr-2 h-4 w-4" /> {t("Auftrag")}</Button>}
      />

      <section aria-label={t("Planungsansicht")} className="mb-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-start">
            <button type="button" aria-label={`${t("Vorherige")} ${t(navigationLabel)}`} onClick={() => changePeriod(-1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="min-w-0 flex-1 truncate text-center text-xs font-medium text-slate-800 sm:flex-none sm:px-2 sm:text-sm">{periodLabel}</p>
            <button type="button" aria-label={`${t("Nächste")} ${t(navigationLabel)}`} onClick={() => changePeriod(1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="sr-only" aria-live="polite">{periodLabel}</span>
          </div>
          <div role="group" aria-label={t("Ansicht auswählen")} className="grid grid-cols-3 rounded-lg border border-slate-200 bg-white p-1 sm:inline-flex">
            {([
              ["day", "Tag"],
              ["week", "Woche"],
              ["month", "Monat"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => setPlannerLocation(selectedDate, value)}
                className={`min-h-11 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${view === value ? "bg-[#176b4a] text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {t(label)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {view === "day" ? (
        dayJobs.length === 0 ? (
          <EmptyState
            title={isToday(selectedDate) ? t("Heute sind keine Aufträge geplant.") : t("Keine Aufträge geplant.")}
            description={t("Für diesen Tag sind keine Einsätze geplant.")}
          />
        ) : (
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {dayJobs.map((job) => {
              const details = getJobDetails(job);
              return (
                <Link key={job.id} href={`/jobs?edit=${encodeURIComponent(job.id)}`} className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-2 px-2 py-4 transition-colors hover:bg-white sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:px-3">
                  <time className="row-span-2 pt-0.5 text-sm font-semibold tabular-nums text-slate-800 sm:row-span-1">{job.startTime.slice(0, 5)}</time>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{details.customer}</p>
                    <p className="mt-1 truncate text-sm text-slate-600">{job.title}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{details.employee}{job.address ? ` · ${job.address}` : ""}</p>
                  </div>
                  <Badge status={job.status}>{t(statusLabel[job.status])}</Badge>
                </Link>
              );
            })}
          </div>
        )
      ) : null}

      {view === "week" ? (
        <div className="max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-16 px-2 py-2 text-xs font-medium text-slate-500">{t("Zeit")}</th>
                  {weekDays.map((day) => (
                    <th key={day.toISOString()} className="px-1 py-2 text-center text-xs font-medium text-slate-600">
                      <span className="block uppercase">{format(day, "EEE", { locale })}</span>
                      <span className={`mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full ${isToday(day) ? "bg-[#176b4a] text-white" : ""}`}>{format(day, "d")}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekHours.map((hour) => (
                  <tr key={hour} className="h-9 border-b border-slate-100 last:border-b-0">
                    <th scope="row" className="h-9 align-top px-2 py-1 text-[10px] font-medium tabular-nums text-slate-500">{hour}</th>
                    {weekDays.map((day) => {
                      const dayKey = format(day, "yyyy-MM-dd");
                      const cellJobs = weekJobs
                        .filter((job) => job.date === dayKey && getJobHour(job) === hour)
                        .sort((a, b) => a.startTime.localeCompare(b.startTime));
                      return (
                        <td key={dayKey} className="h-9 align-top border-l border-slate-100 p-0.5">
                          <div className="space-y-0.5">
                            {cellJobs.map((job) => {
                              const details = getJobDetails(job);
                              return (
                                <Link key={job.id} href={`/jobs?edit=${encodeURIComponent(job.id)}`} title={`${details.customer} · ${job.title} · ${details.employee}`} className="block rounded-sm bg-emerald-50 px-1 py-0.5 text-[10px] leading-3 text-emerald-950 hover:bg-emerald-100">
                                  <span className="block truncate font-semibold">{details.customer}</span>
                                  <span className="block truncate text-[9px] text-emerald-800">{job.title} · {details.employee}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
          </table>
        </div>
      ) : null}

      {view === "month" ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }).map((day) => (
              <div key={day.toISOString()} className="py-2 text-center text-[10px] font-medium uppercase text-slate-500 sm:py-3 sm:text-xs">{format(day, "EEE", { locale })}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 grid-rows-6">
            {monthDays.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const count = monthJobsByDate.get(dayKey) ?? 0;
              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => setPlannerLocation(day, "day")}
                  aria-label={`${formatLocalizedDate(language, day)}${count ? `, ${count} ${t(count === 1 ? "Auftrag" : "Aufträge")}` : ""}`}
                  className={`flex h-[4.25rem] min-w-0 flex-col overflow-hidden border-b border-r border-slate-100 p-1 text-left transition-colors hover:bg-slate-50 sm:h-[5.5rem] sm:p-2 ${!isSameMonth(day, selectedDate) ? "bg-slate-50/70 text-slate-400" : "text-slate-800"}`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday(day) ? "bg-[#176b4a] font-semibold text-white" : ""}`}>{format(day, "d")}</span>
                  {count > 0 ? (
                    <span className="mt-1 block truncate text-[9px] font-medium text-[#14563c] sm:text-xs">• {count} {t(count === 1 ? "Auftrag" : "Aufträge")}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
