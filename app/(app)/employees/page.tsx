"use client";

import { useMemo, useState, type FormEvent } from "react";
import { PencilLine, Plus, Search } from "lucide-react";
import { Button, Card, ConfirmDelete, EmptyState, Input, PageHeader } from "@/components/ui";
import { useApp } from "@/components/providers";
import { translateError } from "@/lib/i18n";
import type { EmployeeFormInput } from "@/lib/types";

const defaultEmployee: EmployeeFormInput = {
  firstName: "", lastName: "", email: "", phone: "", color: "#10b981", active: true, notes: "",
};

export default function EmployeesPage() {
  const { state, saveEmployee, deleteEmployee, createEmployeeInvitation, language, t } = useApp();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EmployeeFormInput>(defaultEmployee);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLinks, setInviteLinks] = useState<Record<string, { url: string; expiresAt: string }>>({});
  const [copiedEmployeeId, setCopiedEmployeeId] = useState<string | null>(null);

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
      setFormError(t("Vor- und Nachname sind erforderlich."));
      return;
    }
    setIsSaving(true);
    try {
      await saveEmployee(draft, editingId ?? undefined);
      setDraft(defaultEmployee);
      setEditingId(null);
      setFormOpen(false);
    } catch (error) {
      setFormError(translateError(language, error, "Mitarbeiter konnte nicht gespeichert werden."));
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

  const handleDelete = async (employeeId: string) => {
    setActionError(null);
    setBusyId(employeeId);
    try {
      await deleteEmployee(employeeId);
    } catch (error) {
      setActionError(translateError(language, error, "Mitarbeiter konnte nicht gelöscht werden."));
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
      setActionError(translateError(language, error, "Mitarbeiterstatus konnte nicht geändert werden."));
    } finally {
      setBusyId(null);
    }
  };

  const createInvite = async (employeeId: string) => {
    setInviteBusyId(employeeId);
    setInviteError(null);
    try {
      const link = await createEmployeeInvitation(employeeId);
      setInviteLinks((previous) => ({ ...previous, [employeeId]: link }));
    } catch (error) {
      setInviteError(translateError(language, error, "Einladung konnte nicht erstellt werden."));
    } finally {
      setInviteBusyId(null);
    }
  };

  const copyInvite = async (employeeId: string) => {
    const invite = inviteLinks[employeeId];
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopiedEmployeeId(employeeId);
      setInviteError(null);
    } catch {
      setInviteError(t("Link konnte nicht kopiert werden."));
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader title={t("Mitarbeiter")} description={t("Kontaktdaten und Aktivstatus Ihres Teams verwalten.")} action={<Button type="button" onClick={openNewEmployee}><Plus className="mr-2 h-4 w-4" /> {t("Mitarbeiter hinzufügen")}</Button>} />

      <label className="relative mb-5 block max-w-xl">
        <span className="sr-only">{t("Mitarbeiter suchen")}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Name, Telefon oder E-Mail suchen...")} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
      </label>

      {actionError ? <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{actionError}</p> : null}
      {inviteError ? <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{t(inviteError)}</p> : null}

      {formOpen ? (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">{t(editingId ? "Mitarbeiter bearbeiten" : "Neuen Mitarbeiter erfassen")}</h2>
          <form onSubmit={(event) => void handleSubmit(event)} className="grid min-w-0 gap-4 md:grid-cols-2">
            <Input label={t("Vorname")} required autoFocus value={draft.firstName} onChange={(event) => setDraft((value) => ({ ...value, firstName: event.target.value }))} />
            <Input label={t("Nachname")} required value={draft.lastName} onChange={(event) => setDraft((value) => ({ ...value, lastName: event.target.value }))} />
            <Input label={t("E-Mail")} type="email" value={draft.email} onChange={(event) => setDraft((value) => ({ ...value, email: event.target.value }))} />
            <Input label={t("Telefon")} type="tel" value={draft.phone} onChange={(event) => setDraft((value) => ({ ...value, phone: event.target.value }))} />
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft((value) => ({ ...value, active: event.target.checked }))} className="h-5 w-5 accent-emerald-600" /> {t("Aktiv und für Einsätze auswählbar")}</label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2"><span>{t("Notizen")}</span><textarea value={draft.notes} onChange={(event) => setDraft((value) => ({ ...value, notes: event.target.value }))} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus-visible:border-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-100" /></label>
            {formError ? <p role="alert" className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</p> : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end md:col-span-2">
              <Button type="button" variant="secondary" onClick={() => { setFormOpen(false); setEditingId(null); setFormError(null); }}>{t("Abbrechen")}</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? t("Wird gespeichert…") : editingId ? t("Änderungen speichern") : t("Mitarbeiter hinzufügen")}</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {filteredEmployees.length === 0 ? (
        <EmptyState title={t(state.employees.length === 0 ? "Noch keine Mitarbeiter hinzugefügt." : "Keine passenden Mitarbeiter")} description={t(state.employees.length === 0 ? "Fügen Sie Ihr Team hinzu und weisen Sie Mitarbeitende Aufträgen zu." : "Passen Sie Ihre Suche an.")} action={state.employees.length > 0
          ? <Button type="button" variant="secondary" onClick={() => setQuery("")}>{t("Suche zurücksetzen")}</Button>
          : undefined} />
      ) : (
        <Card className="overflow-hidden p-0">
          {filteredEmployees.map((employee) => {
            const name = `${employee.firstName} ${employee.lastName}`;
            return <div key={employee.id} className="flex min-w-0 flex-col gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-white" style={{ backgroundColor: employee.color }}>{employee.firstName[0]}{employee.lastName[0]}</div>
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-slate-900">{name}</p>
                  <p className={`mt-0.5 text-xs ${employee.active ? "text-emerald-700" : "text-slate-500"}`}>{t(employee.active ? "Aktiv" : "Inaktiv")}</p>
                </div>
              </div>
              <div className="min-w-0 flex-1 break-words text-sm text-slate-600">
                <p>{employee.phone || employee.email || t("Keine Kontaktdaten hinterlegt")}</p>
                {employee.phone && employee.email ? <p className="mt-0.5 text-xs text-slate-500">{employee.email}</p> : null}
                {employee.notes ? <p className="mt-1 text-xs text-slate-500">{employee.notes}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Button type="button" variant="secondary" className="min-h-11 px-3" disabled={busyId === employee.id} onClick={() => void toggleActive(employee.id)}>
                  {busyId === employee.id ? t("Wird gespeichert…") : t(employee.active ? "Deaktivieren" : "Aktivieren")}
                </Button>
                {!employee.userId && employee.email ? (
                  inviteLinks[employee.id] ? (
                    <div className="w-full space-y-2 rounded-md border border-slate-200 p-3 sm:max-w-sm">
                      <p className="text-xs text-slate-600">{t("Schicken Sie diesen Link an den Mitarbeiter.")}</p>
                      <input aria-label={t("Mitarbeiter einladen")} readOnly value={inviteLinks[employee.id].url} className="min-h-10 w-full min-w-0 rounded-md border border-slate-200 px-2 text-xs" />
                      <p className="text-xs text-slate-500">{t("Einladung läuft ab am")} {new Intl.DateTimeFormat(language).format(new Date(inviteLinks[employee.id].expiresAt))}</p>
                      <Button type="button" variant="secondary" className="w-full" onClick={() => void copyInvite(employee.id)}>{t(copiedEmployeeId === employee.id ? "Link kopiert" : "Link kopieren")}</Button>
                    </div>
                  ) : (
                    <Button type="button" variant="secondary" className="min-h-11 px-3" disabled={inviteBusyId === employee.id} onClick={() => void createInvite(employee.id)}>
                      {inviteBusyId === employee.id ? t("Wird gespeichert…") : t("Einladung erstellen")}
                    </Button>
                  )
                ) : null}
                <button type="button" onClick={() => startEdit(employee.id)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2" aria-label={`${t("Mitarbeiter")} ${name} ${t("Bearbeiten")}`}><PencilLine className="h-4 w-4" /></button>
                <ConfirmDelete label={name} disabled={busyId === employee.id} onConfirm={() => void handleDelete(employee.id)} />
              </div>
            </div>;
          })}
        </Card>
      )}
    </div>
  );
}
