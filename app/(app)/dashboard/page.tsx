"use client";

import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowRight, BriefcaseBusiness, CalendarDays } from "lucide-react";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";
import { useApp } from "@/components/providers";

export default function DashboardPage() {
  const { state, currentUser } = useApp();
  const todayDate = format(new Date(), "yyyy-MM-dd");
  const todayJobs = state.jobs.filter((job) => job.date === todayDate);
  const employeesInUse = new Set(todayJobs.filter((job) => job.employeeId).map((job) => job.employeeId)).size;
  const openJobs = state.jobs.filter((job) => job.status !== "completed" && job.status !== "cancelled").length;
  const completedToday = state.jobs.filter((job) => job.date === todayDate && job.status === "completed").length;

  return (
    <div className="space-y-6">
      <PageHeader title={`Guten Morgen, ${currentUser ? `${currentUser.firstName}` : "Benutzer"}`} description={format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Aufträge heute" value={String(todayJobs.length)} detail="Aktuell geplant" />
        <StatCard label="Mitarbeiter im Einsatz" value={String(employeesInUse)} detail="Heute aktiv" />
        <StatCard label="Offene Aufträge" value={String(openJobs)} detail="In Bearbeitung" />
        <StatCard label="Abgeschlossen heute" value={String(completedToday)} detail="Zum Tagesabschluss" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Heute</h2>
            <Link href="/schedule" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
              Tagesplan ansehen <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {todayJobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Keine Aufträge für heute angelegt.
              </div>
            ) : (
              todayJobs.map((job) => {
                const customer = state.customers.find((entry) => entry.id === job.customerId);
                const employee = state.employees.find((entry) => entry.id === job.employeeId);

                return (
                  <div key={job.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{job.startTime}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-base font-semibold text-slate-900">{employee ? `${employee.firstName} ${employee.lastName}` : "Noch offen"}</p>
                        <Badge status={job.status}>{job.status === "scheduled" ? "Geplant" : job.status === "in_progress" ? "In Bearbeitung" : job.status === "completed" ? "Abgeschlossen" : "Storniert"}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{customer?.companyName ?? "Kunde"}</p>
                      <p className="text-sm text-slate-500">{job.title}</p>
                    </div>
                    <div className="text-sm text-slate-500 md:text-right">
                      <p>{job.startTime} - {job.endTime}</p>
                      <p className="mt-1">{customer?.name ?? "Kunde"}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><BriefcaseBusiness className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-slate-500">Schnellaktionen</p>
                <h3 className="font-semibold text-slate-900">Neue Einträge</h3>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Link href="/jobs" className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                <span>Auftrag</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/customers" className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                <span>Kunde</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/employees" className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                <span>Mitarbeiter</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold">Nächste Termine</h3>
            </div>
            {state.jobs.slice(0, 3).map((job) => (
              <div key={job.id} className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">{job.title}</p>
                <p className="text-xs text-slate-500">{job.startTime} - {job.endTime}</p>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
