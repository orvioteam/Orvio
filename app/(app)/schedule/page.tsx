"use client";

import { useMemo, useState } from "react";
import { addDays, format, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui";
import { useApp } from "@/components/providers";

export default function SchedulePage() {
  const { state } = useApp();
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));

  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const dayJobs = useMemo(
    () => state.jobs.filter((job) => job.date === dateKey).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [dateKey, state.jobs],
  );

  return (
    <div>
      <PageHeader title="Kalender" description="Tagesübersicht mit allen geplanten Einsätzen." />

      <Card className="mb-6 p-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setSelectedDate((date) => addDays(date, -1))} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="text-sm text-slate-500">Tag</p>
            <h2 className="text-xl font-semibold text-slate-900">{format(selectedDate, "d. MMMM yyyy", { locale: de })}</h2>
          </div>
          <button type="button" onClick={() => setSelectedDate((date) => addDays(date, 1))} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </Card>

      <div className="space-y-4">
        {dayJobs.length === 0 ? (
          <Card className="p-8 text-center text-sm text-slate-500">Keine Einsätze für diesen Tag geplant.</Card>
        ) : (
          dayJobs.map((job) => {
            const customer = state.customers.find((entry) => entry.id === job.customerId);
            const employee = state.employees.find((entry) => entry.id === job.employeeId);
            return (
              <Card key={job.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{job.startTime}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <p className="text-lg font-semibold text-slate-900">{employee ? `${employee.firstName} ${employee.lastName}` : "Offen"}</p>
                    <Badge status={job.status}>{job.status === "scheduled" ? "Geplant" : job.status === "in_progress" ? "In Bearbeitung" : job.status === "completed" ? "Abgeschlossen" : "Storniert"}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{customer?.companyName ?? "Kunde"}</p>
                  <p className="text-sm text-slate-500">{job.title}</p>
                </div>
                <div className="text-sm text-slate-500 md:text-right">
                  <p>{job.startTime} - {job.endTime}</p>
                  <p>{customer?.address ?? job.address}</p>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
