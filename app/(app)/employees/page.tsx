"use client";

import { useMemo, useState, type FormEvent } from "react";
import { PencilLine, Plus, Search, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { useApp } from "@/components/providers";
import type { EmployeeFormInput } from "@/lib/types";

const defaultEmployee: EmployeeFormInput = {
  firstName: "", lastName: "", email: "", phone: "", color: "#10b981", active: true, notes: "",
};

export default function EmployeesPage() {
  const { state, saveEmployee, deleteEmployee } = useApp();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EmployeeFormInput>(defaultEmployee);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredEmployees = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return state.employees;
    return state.employees.filter((employee) =>
      [employee.firstName, employee.lastName, employee.email, employee.phone, employee.notes, employee.active ? "aktiv" : "inaktiv"]
        .some((field) => field.toLowerCase().includes(normalized)),
    );
  }, [query, state.employees]);

  const openNewEmployee = () => {
    setDraft(defaultEmployee);
    setEditingId(null);
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      setFormError("Vor- und Nachname sind erforderlich.");
      return;
    }
    setIsSaving(true);
    try {
      await saveEmployee(draft, editingId ?? undefined);
      setDraft(defaultEmployee);
      setEditingId(null);
      setFormOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Mitarbeiter konnte nicht gespeichert werden.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (employeeId: string) => {
    const employee = state.employees.find((entry) => entry.id === employeeId);
    if (!employee) return;
    setDraft({
      firstName: employee.firstName, lastName: employee.lastName, email: employee.email,
      phone: employee.phone, color: employee.color, active: employee.active, notes: employee.notes,
    });
    setEditingId(employeeId);
    setFormError(null);
    setFormOpen(true);
  };

  const handleDelete = async (employeeId: string, name: string) => {
    if (!window.confirm(`Mitarbeiter "${name}" wirklich löschen?`)) return;
    setActionError(null);
    setBusyId(employeeId);
    try {
      await deleteEmployee(employeeId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Mitarbeiter konnte nicht gelöscht werden.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (employeeId: string) => {
    const employee = state.employees.find((entry) => entry.id === employeeId);
    if (!employee) return;
    setActionError(null);
    setBusyId(employeeId);
    try {
      await saveEmployee({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        color: employee.color,
        active: !employee.active,
        notes: employee.notes,
      }, employee.id);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Mitarbeiterstatus konnte nicht geändert werden.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader title="Mitarbeiter" description="Kontaktdaten und Aktivstatus Ihres Teams verwalten." action={<Button type="button" onClick={openNewEmployee}><Plus className="mr-2 h-4 w-4" /> Mitarbeiter hinzufügen</Button>} />

      <label className="relative mb-5 block">
        <span className="sr-only">Mitarbeiter suchen</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, Telefon, E-Mail oder Notiz suchen..." className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
      </label>

      {actionError ? <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{actionError}</p> : null}

      {formOpen ? (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">{editingId ? "Mitarbeiter bearbeiten" : "Neuen Mitarbeiter erfassen"}</h2>
          <form onSubmit={(event) => void handleSubmit(event)} className="grid min-w-0 gap-4 md:grid-cols-2">
            <Input label="Vorname" required autoFocus value={draft.firstName} onChange={(event) => setDraft((value) => ({ ...value, firstName: event.target.value }))} />
            <Input label="Nachname" required value={draft.lastName} onChange={(event) => setDraft((value) => ({ ...value, lastName: event.target.value }))} />
            <Input label="E-Mail" type="email" value={draft.email} onChange={(event) => setDraft((value) => ({ ...value, email: event.target.value }))} />
            <Input label="Telefon" type="tel" value={draft.phone} onChange={(event) => setDraft((value) => ({ ...value, phone: event.target.value }))} />
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft((value) => ({ ...value, active: event.target.checked }))} className="h-5 w-5 accent-emerald-600" /> Aktiv und für Einsätze auswählbar</label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2"><span>Notizen</span><textarea value={draft.notes} onChange={(event) => setDraft((value) => ({ ...value, notes: event.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
            {formError ? <p role="alert" className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</p> : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end md:col-span-2">
              <Button type="button" variant="secondary" onClick={() => { setFormOpen(false); setEditingId(null); setFormError(null); }}>Abbrechen</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Wird gespeichert…" : editingId ? "Änderungen speichern" : "Mitarbeiter hinzufügen"}</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {filteredEmployees.length === 0 ? (
        <EmptyState title={state.employees.length === 0 ? "Noch keine Mitarbeiter" : "Keine passenden Mitarbeiter"} description={state.employees.length === 0 ? "Fügen Sie Ihr Team hinzu und weisen Sie Mitarbeiter Aufträgen zu." : "Passen Sie Ihre Suche an."} action={state.employees.length === 0 ? undefined : <Button type="button" variant="secondary" onClick={() => setQuery("")}>Suche zurücksetzen</Button>} />
      ) : (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredEmployees.map((employee) => {
            const name = `${employee.firstName} ${employee.lastName}`;
            return <Card key={employee.id} className="min-w-0 space-y-4 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: employee.color }}>{employee.firstName[0]}{employee.lastName[0]}</div>
                  <div className="min-w-0"><p className="break-words font-semibold text-slate-900">{name}</p><p className={`text-xs ${employee.active ? "text-emerald-700" : "text-slate-500"}`}>{employee.active ? "Aktiv" : "Inaktiv"}</p></div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => startEdit(employee.id)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100" aria-label={`Mitarbeiter ${name} bearbeiten`}><PencilLine className="h-4 w-4" /></button>
                  <button type="button" disabled={busyId === employee.id} onClick={() => void handleDelete(employee.id, name)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50" aria-label={`Mitarbeiter ${name} löschen`}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="space-y-1 break-words text-sm text-slate-600">
                {employee.phone ? <p>{employee.phone}</p> : null}{employee.email ? <p>{employee.email}</p> : null}
                {employee.notes ? <p className="pt-1 text-slate-500">{employee.notes}</p> : null}
              </div>
              <Button type="button" variant="secondary" className="w-full" disabled={busyId === employee.id} onClick={() => void toggleActive(employee.id)}>
                {employee.active ? "Deaktivieren" : "Aktivieren"}
              </Button>
            </Card>;
          })}
        </div>
      )}
    </div>
  );
}
