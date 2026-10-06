"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, format, isValid, parseISO, startOfDay } from "date-fns";
import { de, enUS, fr, it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { useApp } from "@/components/providers";

const statusLabel = {
  scheduled: "Geplant",
  in_progress: "In Arbeit",
  completed: "Erledigt",
  cancelled: "Storniert",
} as const;

export default function SchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, language, t } = useApp();
  const locale = { de, en: enUS, fr, it }[language];
  const requestedDate = searchParams.get("date");
  const parsedRequestedDate = requestedDate ? parseISO(requestedDate) : null;
  const selectedDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) && parsedRequestedDate && isValid(parsedRequestedDate)
    ? startOfDay(parsedRequestedDate)
    : startOfDay(new Date());

  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const dayJobs = useMemo(
    () => state.jobs.filter((job) => job.date === dateKey).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [dateKey, state.jobs],
  );

  const changeDate = (date: Date) => {
    router.replace(`/schedule?date=${format(date, "yyyy-MM-dd")}`, { scroll: false });
  };

  return (
    <div className="min-w-0">
      <PageHeader title={t("Tagesplan")} description={t("Alle Einsätze des gewählten Tages nach Uhrzeit.")} action={<Button type="button" onClick={() => router.push(`/jobs?new=1&date=${dateKey}`)}><Plus className="mr-2 h-4 w-4" /> {t("Auftrag planen")}</Button>} />

      <Card className="mb-5 p-3 sm:p-4">
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(10rem,14rem)_2.75rem]">
          <button type="button" aria-label={t("Vorheriger Tag")} onClick={() => changeDate(addDays(selectedDate, -1))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"><ChevronLeft className="h-5 w-5" /></button>
          <div className="min-w-0 text-center sm:text-left"><p className="text-xs text-slate-500">{t("Tagesplan")}</p><h2 className="truncate text-base font-semibold text-slate-900 sm:text-xl">{format(selectedDate, "EEEE, d. MMMM yyyy", { locale })}</h2></div>
          <label className="col-span-3 row-start-2 sm:col-span-1 sm:col-start-3 sm:row-start-1"><span className="sr-only">{t("Datum auswählen")}</span><input type="date" value={dateKey} onChange={(event) => { if (event.target.value) changeDate(parseISO(event.target.value)); }} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" /></label>
          <button type="button" aria-label={t("Nächster Tag")} onClick={() => changeDate(addDays(selectedDate, 1))} className="col-start-3 row-start-1 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 sm:col-start-4"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <button type="button" onClick={() => changeDate(new Date())} className="mt-3 min-h-11 w-full rounded-xl text-sm font-medium text-emerald-700 hover:bg-emerald-50 sm:w-auto sm:px-3">{t("Heute anzeigen")}</button>
      </Card>

      {dayJobs.length === 0 ? (
        <EmptyState title={t("Keine Einsätze an diesem Tag")} description={`${t("Für den")} ${format(selectedDate, "d. MMMM yyyy", { locale })} ${t("sind keine Aufträge geplant.")}`} action={<Link href={`/jobs?new=1&date=${dateKey}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">{t("Auftrag für diesen Tag hinzufügen")}</Link>} />
      ) : (
        <div className="space-y-3">
          {dayJobs.map((job) => {
            const customer = state.customers.find((entry) => entry.id === job.customerId);
            const employee = state.employees.find((entry) => entry.id === job.employeeId);
            return <Card key={job.id} className="min-w-0 p-4 sm:p-5">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="w-1 shrink-0 rounded-full bg-emerald-500" style={employee ? { backgroundColor: employee.color } : undefined} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-800">{job.startTime}{job.endTime ? ` – ${job.endTime}` : ""}</p>
                    <h3 className="mt-1 break-words text-lg font-semibold text-slate-900">{job.title}</h3>
                    <p className="break-words text-sm text-slate-600">{customer?.name ?? t("Kunde nicht verfügbar")}{customer?.companyName ? ` · ${customer.companyName}` : ""}</p>
                    <p className="break-words text-sm text-slate-500">{employee ? `${employee.firstName} ${employee.lastName}` : t("Nicht zugewiesen")}{job.address || customer?.address ? ` · ${job.address || customer?.address}` : ""}</p>
                    {job.notes ? <p className="mt-2 break-words text-sm text-slate-500">{job.notes}</p> : null}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <Badge status={job.status}>{t(statusLabel[job.status])}</Badge>
                  <Link href={`/jobs?search=${encodeURIComponent(job.title)}`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">{t("Auftrag öffnen")}</Link>
                </div>
              </div>
            </Card>;
          })}
        </div>
      )}
    </div>
  );
}
