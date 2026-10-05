"use client";

import { useMemo, useState } from "react";
import { PencilLine, Plus, Search, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { useApp } from "@/components/providers";
import type { JobFormInput, JobStatus } from "@/lib/types";

const defaultJob: JobFormInput = {
  customerId: "",
  employeeId: "",
  title: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  startTime: "08:00",
  endTime: "10:00",
  address: "",
  notes: "",
  status: "scheduled",
};

export default function JobsPage() {
  const { state, saveJob, deleteJob } = useApp();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<JobFormInput>(defaultJob);

  const filteredJobs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return state.jobs.filter((job) => {
      const matchesStatus = statusFilter === "all" || job.status === statusFilter;
      const customer = state.customers.find((entry) => entry.id === job.customerId);
      const employee = state.employees.find((entry) => entry.id === job.employeeId);
      const searchText = `${customer?.name ?? ""} ${employee?.firstName ?? ""} ${employee?.lastName ?? ""} ${job.title}`.toLowerCase();
      const matchesQuery = !normalized || searchText.includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [query, state.customers, state.employees, state.jobs, statusFilter]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.customerId || !draft.date || !draft.startTime) return;
    if (editingId) saveJob(draft, editingId);
    else saveJob(draft);

    setDraft(defaultJob);
    setEditingId(null);
    setFormOpen(false);
  };

  const startEdit = (jobId: string) => {
    const job = state.jobs.find((entry) => entry.id === jobId);
    if (!job) return;
    setDraft({
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
    });
    setEditingId(jobId);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Aufträge"
        description="Planen Sie Termine, weisen Sie Mitarbeiter zu und kontrollieren Sie den Status."
        action={<Button type="button" onClick={() => { setFormOpen((value) => !value); setEditingId(null); setDraft(defaultJob); }}><Plus className="mr-2 h-4 w-4" /> Auftrag hinzufügen</Button>}
      />

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative md:max-w-md md:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Aufträge suchen..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <Select label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | JobStatus)} className="md:max-w-xs">
          <option value="all">Alle</option>
          <option value="scheduled">Geplant</option>
          <option value="in_progress">In Bearbeitung</option>
          <option value="completed">Abgeschlossen</option>
          <option value="cancelled">Storniert</option>
        </Select>
      </div>

      {formOpen ? (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <Select label="Kunde" value={draft.customerId} onChange={(event) => setDraft((value) => ({ ...value, customerId: event.target.value }))}>
              <option value="">Bitte auswählen</option>
              {state.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.companyName}</option>
              ))}
            </Select>
            <Select label="Mitarbeiter" value={draft.employeeId} onChange={(event) => setDraft((value) => ({ ...value, employeeId: event.target.value }))}>
              <option value="">Optional</option>
              {state.employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>
              ))}
            </Select>
            <Input label="Titel" value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} className="md:col-span-2" />
            <Input label="Beschreibung" value={draft.description} onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))} className="md:col-span-2" />
            <Input label="Datum" type="date" value={draft.date} onChange={(event) => setDraft((value) => ({ ...value, date: event.target.value }))} />
            <Input label="Startzeit" type="time" value={draft.startTime} onChange={(event) => setDraft((value) => ({ ...value, startTime: event.target.value }))} />
            <Input label="Endzeit" type="time" value={draft.endTime} onChange={(event) => setDraft((value) => ({ ...value, endTime: event.target.value }))} />
            <Select label="Status" value={draft.status} onChange={(event) => setDraft((value) => ({ ...value, status: event.target.value as JobStatus }))}>
              <option value="scheduled">Geplant</option>
              <option value="in_progress">In Bearbeitung</option>
              <option value="completed">Abgeschlossen</option>
              <option value="cancelled">Storniert</option>
            </Select>
            <Input label="Adresse" value={draft.address} onChange={(event) => setDraft((value) => ({ ...value, address: event.target.value }))} className="md:col-span-2" />
            <textarea value={draft.notes} onChange={(event) => setDraft((value) => ({ ...value, notes: event.target.value }))} placeholder="Notizen" className="md:col-span-2 min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />

            <div className="md:col-span-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => { setFormOpen(false); setEditingId(null); setDraft(defaultJob); }}>Abbrechen</Button>
              <Button type="submit">{editingId ? "Speichern" : "Auftrag erstellen"}</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {filteredJobs.length === 0 ? (
        <EmptyState title="Keine Aufträge gefunden" description="Fügen Sie Ihren ersten Auftrag hinzu, um den Betriebsplan sauber zu verwalten." action={<Button type="button" onClick={() => setFormOpen(true)}>Auftrag hinzufügen</Button>} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Datum</th>
                  <th className="px-4 py-3 font-medium">Zeit</th>
                  <th className="px-4 py-3 font-medium">Kunde</th>
                  <th className="px-4 py-3 font-medium">Mitarbeiter</th>
                  <th className="px-4 py-3 font-medium">Auftrag</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => {
                  const customer = state.customers.find((entry) => entry.id === job.customerId);
                  const employee = state.employees.find((entry) => entry.id === job.employeeId);
                  return (
                    <tr key={job.id} className="border-t border-slate-200 align-top">
                      <td className="px-4 py-4 text-slate-600">{job.date}</td>
                      <td className="px-4 py-4 text-slate-600">{job.startTime} - {job.endTime}</td>
                      <td className="px-4 py-4 text-slate-600">{customer?.companyName ?? "Kunde"}</td>
                      <td className="px-4 py-4 text-slate-600">{employee ? `${employee.firstName} ${employee.lastName}` : "Offen"}</td>
                      <td className="px-4 py-4 text-slate-600">{job.title}</td>
                      <td className="px-4 py-4"><Badge status={job.status}>{job.status === "scheduled" ? "Geplant" : job.status === "in_progress" ? "In Bearbeitung" : job.status === "completed" ? "Abgeschlossen" : "Storniert"}</Badge></td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => startEdit(job.id)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100" aria-label={`Auftrag ${job.title} bearbeiten`}>
                            <PencilLine className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => {
                            if (window.confirm(`Auftrag "${job.title}" löschen?`)) deleteJob(job.id);
                          }} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50" aria-label={`Auftrag ${job.title} löschen`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
