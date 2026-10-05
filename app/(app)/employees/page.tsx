"use client";

import { useMemo, useState } from "react";
import { PencilLine, Plus, Search, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { useApp } from "@/components/providers";
import type { EmployeeFormInput } from "@/lib/types";

const defaultEmployee: EmployeeFormInput = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  color: "#10b981",
  active: true,
  notes: "",
};

export default function EmployeesPage() {
  const { state, saveEmployee, deleteEmployee } = useApp();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EmployeeFormInput>(defaultEmployee);

  const filteredEmployees = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return state.employees;
    return state.employees.filter((employee) =>
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(normalized),
    );
  }, [query, state.employees]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.firstName.trim() || !draft.lastName.trim()) return;
    if (editingId) saveEmployee(draft, editingId);
    else saveEmployee(draft);

    setDraft(defaultEmployee);
    setEditingId(null);
    setFormOpen(false);
  };

  const startEdit = (employeeId: string) => {
    const employee = state.employees.find((entry) => entry.id === employeeId);
    if (!employee) return;
    setDraft({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      color: employee.color,
      active: employee.active,
      notes: employee.notes,
    });
    setEditingId(employeeId);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader title="Mitarbeiter" description="Verwalten Sie Ihr Team und sehen Sie sofort, wer aktiv ist." action={<Button type="button" onClick={() => { setFormOpen((value) => !value); setEditingId(null); setDraft(defaultEmployee); }}><Plus className="mr-2 h-4 w-4" /> Mitarbeiter</Button>} />

      <Card className="mb-6 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Mitarbeiter suchen..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </Card>

      {formOpen ? (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <Input label="Vorname" value={draft.firstName} onChange={(event) => setDraft((value) => ({ ...value, firstName: event.target.value }))} />
            <Input label="Nachname" value={draft.lastName} onChange={(event) => setDraft((value) => ({ ...value, lastName: event.target.value }))} />
            <Input label="E-Mail" type="email" value={draft.email} onChange={(event) => setDraft((value) => ({ ...value, email: event.target.value }))} />
            <Input label="Telefon" value={draft.phone} onChange={(event) => setDraft((value) => ({ ...value, phone: event.target.value }))} />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Farbe</label>
              <input type="color" value={draft.color} onChange={(event) => setDraft((value) => ({ ...value, color: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white p-1" />
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={draft.active} onChange={(event) => setDraft((value) => ({ ...value, active: event.target.checked }))} />
              Aktiv
            </label>
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft((value) => ({ ...value, notes: event.target.value }))}
              placeholder="Notizen"
              className="md:col-span-2 min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />

            <div className="md:col-span-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => { setFormOpen(false); setEditingId(null); setDraft(defaultEmployee); }}>Abbrechen</Button>
              <Button type="submit">{editingId ? "Speichern" : "Mitarbeiter hinzufügen"}</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {filteredEmployees.length === 0 ? (
        <EmptyState title="Noch keine Mitarbeiter" description="Fügen Sie Ihr Team hinzu und planen Sie die nächste Woche besser." action={<Button type="button" onClick={() => setFormOpen(true)}>Mitarbeiter hinzufügen</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredEmployees.map((employee) => (
            <Card key={employee.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: employee.color }}>
                    {employee.firstName[0]}{employee.lastName[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{employee.firstName} {employee.lastName}</p>
                    <p className="text-xs text-slate-500">{employee.active ? "Aktiv" : "Inaktiv"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => startEdit(employee.id)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100" aria-label={`Mitarbeiter ${employee.firstName} ${employee.lastName} bearbeiten`}>
                    <PencilLine className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => {
                    if (window.confirm(`Mitarbeiter "${employee.firstName} ${employee.lastName}" löschen?`)) deleteEmployee(employee.id);
                  }} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50" aria-label={`Mitarbeiter ${employee.firstName} ${employee.lastName} löschen`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <p>{employee.phone}</p>
                <p>{employee.email}</p>
                <p>{employee.notes || "Keine Notizen"}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
