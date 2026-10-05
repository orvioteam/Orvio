"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { addDays, format, isValid, parseISO, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { useApp } from "@/components/providers";

const statusLabel = {
  scheduled: "Geplant",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
} as const;

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
  const dayJobs = state.jobs
    .filter((job) => job.date === dateKey)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const changeDate = (date: Date) => {
    const nextDate = format(date, "yyyy-MM-dd");
    router.replace(nextDate === todayKey ? "/dashboard" : `/dashboard?date=${nextDate}`, { scroll: false });
  };

  return (
    <div className="min-w-0">
      <PageHeader
        title={dateKey === todayKey ? "Heute" : "Tagesplan"}
        description={format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
        action={<Button type="button" onClick={() => router.push(`/jobs?new=1&date=${dateKey}`)}><Plus className="mr-2 h-4 w-4" /> Auftrag hinzufügen</Button>}
      />

      <Card className="mb-5 p-3 sm:p-4">
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2">
          <button type="button" aria-label="Vorheriger Tag" onClick={() => changeDate(addDays(selectedDate, -1))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"><ChevronLeft className="h-5 w-5" /></button>
          <label className="min-w-0 text-center">
            <span className="sr-only">Datum auswählen</span>
            <input type="date" value={dateKey} onChange={(event) => { if (event.target.value) changeDate(parseISO(event.target.value)); }} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-medium" />
          </label>
          <button type="button" aria-label="Nächster Tag" onClick={() => changeDate(addDays(selectedDate, 1))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </Card>

      {dayJobs.length === 0 ? (
        <EmptyState
          title={dateKey === todayKey ? "Heute sind keine Aufträge geplant" : "Keine Aufträge an diesem Tag"}
          description="Für diesen Tag sind keine Einsätze geplant."
        />
      ) : (
        <div className="space-y-2">
          {dayJobs.map((job) => {
            const customer = state.customers.find((entry) => entry.id === job.customerId);
            const employee = state.employees.find((entry) => entry.id === job.employeeId);
            return (
              <Card key={job.id} className="min-w-0 p-4 sm:p-5">
                <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                  <p className="w-16 shrink-0 text-lg font-semibold tabular-nums text-slate-900">{job.startTime}</p>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-slate-900">{customer?.companyName || customer?.name || "Kunde nicht verfügbar"}</p>
                    <p className="mt-1 break-words text-sm text-slate-600">{employee ? `${employee.firstName} ${employee.lastName}` : "Nicht zugewiesen"}</p>
                  </div>
                  <Badge status={job.status}>{statusLabel[job.status]}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-sm text-slate-500">{dayJobs.length} {dayJobs.length === 1 ? "Auftrag" : "Aufträge"} an diesem Tag</p>
    </div>
  );
}
