"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { de, enUS, fr, it } from "date-fns/locale";
import { PencilLine, Plus, Search } from "lucide-react";
import { Badge, Button, Card, ConfirmDelete, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { useApp } from "@/components/providers";
import { translateError } from "@/lib/i18n";
import type { Job, JobFormInput, JobStatus } from "@/lib/types";

const defaultJob = (): JobFormInput => ({
  customerId: "",
  employeeId: "",
  title: "",
  description: "",
  date: format(new Date(), "yyyy-MM-dd"),
  startTime: "08:00",
  endTime: "",
  address: "",
  notes: "",
  status: "scheduled",
});

const statusLabel: Record<JobStatus, string> = {
  scheduled: "Geplant",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
};

export default function JobsPage() {
  const searchParams = useSearchParams();
  const formRouteKey = [searchParams.get("new"), searchParams.get("date"), searchParams.get("edit")].join(":");
  return <JobsPageContent key={formRouteKey} />;
}

function jobToFormInput(job: Job): JobFormInput {
  return {
    customerId: job.customerId,
    employeeId: job.employeeId ?? "",
    title: job.title,
    description: job.description,
    date: job.date,
    startTime: job.startTime,
    endTime: job.endTime,
    address: job.address,
    notes: job.notes,
    status: job.status,
  };
}

function JobsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, saveJob, deleteJob, language, t } = useApp();
  const locale = { de, en: enUS, fr, it }[language];
  const [localQuery, setLocalQuery] = useState<string | null>(null);
  const query = localQuery ?? searchParams.get("search") ?? "";
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");
  const newJobRequested = searchParams.get("new") === "1";
  const requestedEditId = searchParams.get("edit");
  const requestedDate = searchParams.get("date");
  const requestedEditJob = state.jobs.find((job) => job.id === requestedEditId);
  const formOpen = newJobRequested || Boolean(requestedEditJob);
  const editingId = requestedEditJob?.id ?? null;
  const [draft, setDraft] = useState<JobFormInput>(() => {
    if (requestedEditJob) return jobToFormInput(requestedEditJob);
    const date = searchParams.get("date");
    const defaults = defaultJob();
    return { ...defaults, date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : defaults.date };
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);

  const filteredJobs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return state.jobs.filter((job) => {
      const matchesStatus = statusFilter === "all" || job.status === statusFilter;
      const customer = state.customers.find((entry) => entry.id === job.customerId);
      const employee = state.employees.find((entry) => entry.id === job.employeeId);
      const searchText = [
        customer?.name, customer?.companyName, customer?.email, customer?.phone, customer?.city,
        employee?.firstName, employee?.lastName, job.title, job.description, job.address, job.notes,
        job.date, job.status, statusLabel[job.status],
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && (!normalized || searchText.includes(normalized));
    }).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [query, state.customers, state.employees, state.jobs, statusFilter]);

  const openNewJob = () => {
    router.push(`/jobs?new=1${requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? `&date=${requestedDate}` : ""}`);
  };

  const closeForm = () => {
    const searchQuery = searchParams.get("search");
    router.replace(searchQuery ? `/jobs?search=${encodeURIComponent(searchQuery)}` : "/jobs", { scroll: false });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!draft.customerId) {
      setFormError(t("Bitte wählen Sie einen Kunden aus."));
      return;
    }
    if (!draft.employeeId) {
      setFormError(t("Bitte wählen Sie einen Mitarbeiter aus."));
      return;
    }
    if (draft.endTime && draft.endTime < draft.startTime) {
      setFormError(t("Die Endzeit muss nach der Startzeit liegen."));
      return;
    }

    setIsSaving(true);
    try {
      const customer = state.customers.find((entry) => entry.id === draft.customerId);
      await saveJob({
        ...draft,
        title: draft.title.trim() || customer?.companyName || customer?.name || t("Reinigungsauftrag"),
      }, editingId ?? undefined);
      closeForm();
    } catch (error) {
      setFormError(translateError(language, error, "Auftrag konnte nicht gespeichert werden."));
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (jobId: string) => router.push(`/jobs?edit=${encodeURIComponent(jobId)}`);

  const changeStatus = async (jobId: string, status: JobStatus) => {
    const job = state.jobs.find((entry) => entry.id === jobId);
    if (!job) return;
    setActionError(null);
    setBusyJobId(jobId);
    try {
      await saveJob({
        customerId: job.customerId,
        employeeId: job.employeeId ?? "",
        title: job.title,
        description: job.description,
        date: job.date,
        startTime: job.startTime,
        endTime: job.endTime,
        address: job.address,
        notes: job.notes,
        status,
      }, jobId);
    } catch (error) {
      setActionError(translateError(language, error, "Status konnte nicht geändert werden."));
    } finally {
      setBusyJobId(null);
    }
  };

  const handleDelete = async (jobId: string) => {
    setActionError(null);
    setBusyJobId(jobId);
    try {
      await deleteJob(jobId);
    } catch (error) {
      setActionError(translateError(language, error, "Auftrag konnte nicht gelöscht werden."));
    } finally {
      setBusyJobId(null);
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader
        title={t("Aufträge")}
        description={t("Alle Einsätze Ihrer Organisation.")}
        action={<Button type="button" onClick={openNewJob}><Plus className="mr-2 h-4 w-4" /> {t("Auftrag hinzufügen")}</Button>}
      />

      <div className="mb-4 max-w-xl">
        <label className="relative block">
          <span className="sr-only">{t("Aufträge suchen")}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setLocalQuery(event.target.value)} placeholder={t("Aufträge suchen...")} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
        </label>
      </div>
      <div role="group" aria-label={t("Aufträge nach Status filtern")} className="mb-5 flex flex-wrap gap-2">
        {([
          ["all", "Alle"],
          ["scheduled", "Geplant"],
          ["in_progress", "In Arbeit"],
          ["completed", "Erledigt"],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={statusFilter === value} onClick={() => setStatusFilter(value)} className={`min-h-10 rounded-md border px-3.5 text-sm font-medium transition-colors ${statusFilter === value ? "border-[#176b4a] bg-[#176b4a] text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{t(label)}</button>
        ))}
      </div>

      {actionError ? <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{actionError}</p> : null}

      {formOpen ? (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">{t(editingId ? "Auftrag bearbeiten" : "Neuen Auftrag erstellen")}</h2>
          {state.customers.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {t("Legen Sie zuerst einen Kunden an, bevor Sie einen Auftrag erstellen.")}
              <Button type="button" variant="secondary" className="mt-3 w-full sm:w-auto" onClick={() => router.push("/customers")}>{t("Kunden öffnen")}</Button>
            </div>
          ) : state.employees.filter((employee) => employee.active).length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {t("Legen Sie zuerst einen aktiven Mitarbeiter an.")}
              <Button type="button" variant="secondary" className="mt-3 w-full sm:w-auto" onClick={() => router.push("/employees")}>{t("Mitarbeiter öffnen")}</Button>
            </div>
          ) : (
            <form onSubmit={(event) => void handleSubmit(event)} className="grid min-w-0 gap-4 md:grid-cols-2">
              <Select label={t("Kunde")} required value={draft.customerId} onChange={(event) => setDraft((value) => ({ ...value, customerId: event.target.value }))}>
                <option value="">{t("Bitte auswählen")}</option>
                {state.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.companyName ? ` · ${customer.companyName}` : ` · ${t("Privat")}`}</option>)}
              </Select>
              <Input label={t("Datum")} type="date" required value={draft.date} onChange={(event) => setDraft((value) => ({ ...value, date: event.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label={t("Startzeit")} type="time" required value={draft.startTime} onChange={(event) => setDraft((value) => ({ ...value, startTime: event.target.value }))} />
                <Input label={t("Endzeit")} type="time" value={draft.endTime} onChange={(event) => setDraft((value) => ({ ...value, endTime: event.target.value }))} />
              </div>
              <Select label={t("Mitarbeiter")} required value={draft.employeeId} onChange={(event) => setDraft((value) => ({ ...value, employeeId: event.target.value }))}>
                <option value="">{t("Bitte auswählen")}</option>
                {state.employees.filter((employee) => employee.active || employee.id === draft.employeeId).map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}{employee.active ? "" : ` (${t("Inaktiv")})`}</option>)}
              </Select>
              <Input label={t("Einsatzort / Adresse")} value={draft.address} onChange={(event) => setDraft((value) => ({ ...value, address: event.target.value }))} />
              <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                <span>{t("Notizen")}</span>
                <textarea value={draft.notes} onChange={(event) => setDraft((value) => ({ ...value, notes: event.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </label>
              {editingId ? <Select label={t("Status")} value={draft.status} onChange={(event) => setDraft((value) => ({ ...value, status: event.target.value as JobStatus }))}>
                <option value="scheduled">{t("Geplant")}</option><option value="in_progress">{t("In Bearbeitung")}</option><option value="completed">{t("Abgeschlossen")}</option><option value="cancelled">{t("Storniert")}</option>
              </Select> : null}
              {formError ? <p role="alert" className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</p> : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end md:col-span-2">
                <Button type="button" variant="secondary" onClick={closeForm}>{t("Abbrechen")}</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? t("Wird gespeichert…") : editingId ? t("Änderungen speichern") : t("Auftrag erstellen")}</Button>
              </div>
            </form>
          )}
        </Card>
      ) : null}

      {filteredJobs.length === 0 ? (
        <EmptyState
          title={t(state.jobs.length === 0 ? "Noch keine Aufträge" : "Keine passenden Aufträge")}
          description={t(state.jobs.length === 0 ? "Erstellen Sie Ihren ersten Auftrag, um einen Einsatz zu planen." : "Passen Sie Suche oder Statusfilter an.")}
          action={state.jobs.length > 0
            ? <Button type="button" variant="secondary" onClick={() => { setLocalQuery(""); setStatusFilter("all"); }}>{t("Filter zurücksetzen")}</Button>
            : undefined}
        />
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {filteredJobs.map((job) => {
              const customer = state.customers.find((entry) => entry.id === job.customerId);
              const employee = state.employees.find((entry) => entry.id === job.employeeId);
              return (
                <Card key={job.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="break-words font-semibold">{customer?.companyName || customer?.name || t("Kunde nicht verfügbar")}</p></div>
                    <Badge status={job.status}>{t(statusLabel[job.status])}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <p>{format(new Date(`${job.date}T00:00:00`), "P", { locale })}</p><p>{job.startTime}{job.endTime ? `–${job.endTime}` : ""}</p>
                    <p className="col-span-2">{employee ? `${employee.firstName} ${employee.lastName}` : t("Nicht zugewiesen")}</p>
                    {job.address ? <p className="col-span-2 break-words">{job.address}</p> : null}
                  </div>
                  <Select label={t("Status ändern")} value={job.status} disabled={busyJobId === job.id} onChange={(event) => void changeStatus(job.id, event.target.value as JobStatus)}>
                    <option value="scheduled">{t("Geplant")}</option><option value="in_progress">{t("In Bearbeitung")}</option><option value="completed">{t("Abgeschlossen")}</option><option value="cancelled">{t("Storniert")}</option>
                  </Select>
                  <div className="flex gap-2 border-t border-slate-100 pt-3">
                    <Button type="button" variant="secondary" className="min-h-11 flex-1" onClick={() => startEdit(job.id)}><PencilLine className="mr-2 h-4 w-4" /> {t("Bearbeiten")}</Button>
                    <ConfirmDelete label={job.title} disabled={busyJobId === job.id} onConfirm={() => void handleDelete(job.id)} />
                  </div>
                </Card>
              );
            })}
          </div>
          <Card className="hidden overflow-hidden p-0 lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-[#f8f9f7] text-xs uppercase tracking-wide text-slate-500"><tr>{["Datum", "Zeit", "Kunde", "Mitarbeiter", "Status", "Aktionen"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{t(heading)}</th>)}</tr></thead>
                <tbody>{filteredJobs.map((job) => {
                  const customer = state.customers.find((entry) => entry.id === job.customerId);
                  const employee = state.employees.find((entry) => entry.id === job.employeeId);
                  return <tr key={job.id} className="border-t border-slate-100 align-middle hover:bg-slate-50/70">
                    <td className="px-4 py-4">{format(new Date(`${job.date}T00:00:00`), "P", { locale })}</td><td className="px-4 py-4">{job.startTime}{job.endTime ? ` – ${job.endTime}` : ""}</td>
                    <td className="px-4 py-4">{customer?.companyName || customer?.name || t("Kunde nicht verfügbar")}</td>
                    <td className="px-4 py-4">{employee ? `${employee.firstName} ${employee.lastName}` : t("Nicht zugewiesen")}</td>
                    <td className="px-4 py-4"><Select aria-label={`${t("Status")} ${job.title}`} value={job.status} disabled={busyJobId === job.id} onChange={(event) => void changeStatus(job.id, event.target.value as JobStatus)} className="min-w-40"><option value="scheduled">{t("Geplant")}</option><option value="in_progress">{t("In Bearbeitung")}</option><option value="completed">{t("Abgeschlossen")}</option><option value="cancelled">{t("Storniert")}</option></Select></td>
                    <td className="px-4 py-4"><div className="flex justify-end gap-2">
                      <button type="button" onClick={() => startEdit(job.id)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100" aria-label={`${t("Auftrag")} ${job.title} ${t("Bearbeiten")}`}><PencilLine className="h-4 w-4" /></button>
                      <ConfirmDelete label={job.title} disabled={busyJobId === job.id} onConfirm={() => void handleDelete(job.id)} />
                    </div></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
