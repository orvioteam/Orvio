"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
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
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";
import { useApp } from "@/components/providers";
import type { Job } from "@/lib/types";

const statusLabel = {
  scheduled: "Geplant",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
} as const;

type CalendarView = "day" | "week" | "month";

const getJobHour = (job: Job) => `${job.startTime.slice(0, 2)}:00`;

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state } = useApp();
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
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekJobs = state.jobs.filter((job) => job.date >= format(weekStart, "yyyy-MM-dd") && job.date <= format(weekEnd, "yyyy-MM-dd"));
  const weekHours = Array.from(new Set([
    ...Array.from({ length: 14 }, (_, index) => `${String(index + 6).padStart(2, "0")}:00`),
    ...weekJobs.map(getJobHour),
  ])).sort();
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
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

  const changeDate = (direction: -1 | 1) => {
    setPlannerLocation(addDays(selectedDate, direction), view);
  };

  const getJobDetails = (job: Job) => {
    const customer = state.customers.find((entry) => entry.id === job.customerId);
    const employee = state.employees.find((entry) => entry.id === job.employeeId);
    return {
      customer: customer?.companyName || customer?.name || "Kunde nicht verfügbar",
      employee: employee ? `${employee.firstName} ${employee.lastName}` : "Nicht zugewiesen",
    };
  };

  return (
    <div className="min-w-0">
      <PageHeader
        title={isToday(selectedDate) ? "Heute" : format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
        action={<Button type="button" onClick={() => router.push(`/jobs?new=1&date=${dateKey}`)}><Plus className="mr-2 h-4 w-4" /> Auftrag</Button>}
      />

      <section aria-label="Planungsansicht" className="mb-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-start">
            <button type="button" aria-label="Vorheriger Tag" onClick={() => changeDate(-1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="min-w-0 flex-1 truncate text-center text-sm font-medium text-slate-800 sm:flex-none sm:px-2">{format(selectedDate, "d. MMMM yyyy", { locale: de })}</p>
            <button type="button" aria-label="Nächster Tag" onClick={() => changeDate(1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div role="group" aria-label="Ansicht auswählen" className="grid grid-cols-3 rounded-lg border border-slate-200 bg-white p-1 sm:inline-flex">
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
                className={`min-h-9 rounded-md px-3 text-sm font-medium transition-colors ${view === value ? "bg-[#176b4a] text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {view === "day" ? (
        dayJobs.length === 0 ? (
          <EmptyState title="Keine Aufträge geplant." description="Für diesen Tag sind keine Einsätze geplant." />
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
                  <Badge status={job.status}>{statusLabel[job.status]}</Badge>
                </Link>
              );
            })}
          </div>
        )
      ) : null}

      {view === "week" ? (
        weekJobs.length === 0 ? (
          <EmptyState title="Keine Aufträge geplant." description="In dieser Woche sind keine Einsätze geplant." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-16 px-3 py-3 text-xs font-medium text-slate-500">Zeit</th>
                  {weekDays.map((day) => (
                    <th key={day.toISOString()} className="px-2 py-3 text-center text-xs font-medium text-slate-600">
                      <span className="block uppercase">{format(day, "EEE", { locale: de })}</span>
                      <span className={`mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full ${isToday(day) ? "bg-[#176b4a] text-white" : ""}`}>{format(day, "d")}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekHours.map((hour) => (
                  <tr key={hour} className="border-b border-slate-100 last:border-b-0">
                    <th scope="row" className="align-top px-3 py-3 text-xs font-medium tabular-nums text-slate-500">{hour}</th>
                    {weekDays.map((day) => {
                      const dayKey = format(day, "yyyy-MM-dd");
                      const cellJobs = weekJobs
                        .filter((job) => job.date === dayKey && getJobHour(job) === hour)
                        .sort((a, b) => a.startTime.localeCompare(b.startTime));
                      return (
                        <td key={dayKey} className="align-top border-l border-slate-100 p-1.5">
                          <div className="space-y-1">
                            {cellJobs.map((job) => {
                              const details = getJobDetails(job);
                              return (
                                <Link key={job.id} href={`/jobs?edit=${encodeURIComponent(job.id)}`} className="block rounded-md bg-emerald-50 px-2 py-1.5 text-[11px] leading-4 text-emerald-950 hover:bg-emerald-100">
                                  <span className="block truncate font-semibold">{details.customer}</span>
                                  <span className="block truncate">{job.title}</span>
                                  <span className="block truncate text-emerald-800">{details.employee}</span>
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
        )
      ) : null}

      {view === "month" ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }).map((day) => (
              <div key={day.toISOString()} className="py-2 text-center text-[10px] font-medium uppercase text-slate-500 sm:py-3 sm:text-xs">{format(day, "EEE", { locale: de })}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const count = monthJobsByDate.get(dayKey) ?? 0;
              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => setPlannerLocation(day, "day")}
                  aria-label={`${format(day, "d. MMMM yyyy", { locale: de })}${count ? `, ${count} ${count === 1 ? "Auftrag" : "Aufträge"}` : ""}`}
                  className={`min-h-[4.5rem] border-b border-r border-slate-100 p-1.5 text-left transition-colors hover:bg-slate-50 sm:min-h-24 sm:p-3 ${!isSameMonth(day, selectedDate) ? "bg-slate-50/70 text-slate-400" : "text-slate-800"}`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday(day) ? "bg-[#176b4a] font-semibold text-white" : ""}`}>{format(day, "d")}</span>
                  {count > 0 ? (
                    <span className="mt-1 block truncate text-[9px] font-medium text-[#14563c] sm:text-xs">• {count} {count === 1 ? "Auftrag" : "Aufträge"}</span>
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
