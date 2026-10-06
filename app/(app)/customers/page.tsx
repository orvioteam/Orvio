"use client";

import { useMemo, useState, type FormEvent } from "react";
import { PencilLine, Plus, Search } from "lucide-react";
import { Button, Card, ConfirmDelete, EmptyState, Input, PageHeader } from "@/components/ui";
import { useApp } from "@/components/providers";
import { translateError } from "@/lib/i18n";
import type { CustomerFormInput } from "@/lib/types";

const defaultCustomer: CustomerFormInput = {
  name: "", companyName: "", email: "", phone: "", address: "", postalCode: "", city: "", notes: "",
};

export default function CustomersPage() {
  const { state, saveCustomer, deleteCustomer, language, t } = useApp();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CustomerFormInput>(defaultCustomer);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return state.customers;
    return state.customers.filter((customer) =>
      [customer.name, customer.companyName, customer.email, customer.phone, customer.address, customer.postalCode, customer.city, customer.notes]
        .some((field) => field.toLowerCase().includes(normalized)),
    );
  }, [query, state.customers]);

  const openNewCustomer = () => {
    setDraft(defaultCustomer);
    setEditingId(null);
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!draft.name.trim()) {
      setFormError(t("Bitte geben Sie einen Namen ein."));
      return;
    }
    setIsSaving(true);
    try {
      await saveCustomer(draft, editingId ?? undefined);
      setDraft(defaultCustomer);
      setEditingId(null);
      setFormOpen(false);
    } catch (error) {
      setFormError(translateError(language, error, "Kunde konnte nicht gespeichert werden."));
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (customerId: string) => {
    const customer = state.customers.find((entry) => entry.id === customerId);
    if (!customer) return;
    setDraft({
      name: customer.name, companyName: customer.companyName, email: customer.email, phone: customer.phone,
      address: customer.address, postalCode: customer.postalCode, city: customer.city, notes: customer.notes,
    });
    setEditingId(customerId);
    setFormError(null);
    setFormOpen(true);
  };

  const handleDelete = async (customerId: string) => {
    setActionError(null);
    setBusyId(customerId);
    try {
      await deleteCustomer(customerId);
    } catch (error) {
      setActionError(translateError(language, error, "Kunde konnte nicht gelöscht werden."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader title={t("Kunden")} description={t("Kundenkontakte und zugehörige Aufträge Ihrer Organisation.")} action={<Button type="button" onClick={openNewCustomer}><Plus className="mr-2 h-4 w-4" /> {t("Kunde hinzufügen")}</Button>} />

      <label className="relative mb-5 block max-w-xl">
        <span className="sr-only">{t("Kunden suchen")}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Name, Firma, Ort oder Kontakt suchen...")} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
      </label>

      {actionError ? <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{actionError}</p> : null}

      {formOpen ? (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">{t(editingId ? "Kundendaten bearbeiten" : "Neuen Kunden erfassen")}</h2>
          <form onSubmit={(event) => void handleSubmit(event)} className="grid min-w-0 gap-4 md:grid-cols-2">
            <Input label={t("Name")} required autoFocus value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} />
            <Input label={t("Firma (optional, leer = Privatkunde)")} value={draft.companyName} onChange={(event) => setDraft((value) => ({ ...value, companyName: event.target.value }))} />
            <Input label={t("Telefon")} type="tel" value={draft.phone} onChange={(event) => setDraft((value) => ({ ...value, phone: event.target.value }))} />
            <Input label={t("E-Mail")} type="email" value={draft.email} onChange={(event) => setDraft((value) => ({ ...value, email: event.target.value }))} />
            <Input label={t("Adresse")} value={draft.address} onChange={(event) => setDraft((value) => ({ ...value, address: event.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label={t("PLZ")} value={draft.postalCode} onChange={(event) => setDraft((value) => ({ ...value, postalCode: event.target.value }))} />
              <Input label={t("Ort")} value={draft.city} onChange={(event) => setDraft((value) => ({ ...value, city: event.target.value }))} />
            </div>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>{t("Notizen")}</span>
              <textarea value={draft.notes} onChange={(event) => setDraft((value) => ({ ...value, notes: event.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>
            {formError ? <p role="alert" className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</p> : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end md:col-span-2">
              <Button type="button" variant="secondary" onClick={() => { setFormOpen(false); setEditingId(null); setFormError(null); }}>{t("Abbrechen")}</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? t("Wird gespeichert…") : editingId ? t("Änderungen speichern") : t("Kunde erstellen")}</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {filteredCustomers.length === 0 ? (
        <EmptyState title={t(state.customers.length === 0 ? "Keine Kunden vorhanden." : "Keine passenden Kunden")} description={t(state.customers.length === 0 ? "Fügen Sie Ihren ersten Kunden hinzu, um Aufträge planen zu können." : "Prüfen Sie Ihre Suche oder setzen Sie sie zurück.")} action={state.customers.length > 0
          ? <Button type="button" variant="secondary" onClick={() => setQuery("")}>{t("Suche zurücksetzen")}</Button>
          : undefined} />
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} className="space-y-3 p-4">
                <div className="min-w-0"><p className="break-words font-semibold">{customer.companyName || customer.name}</p>{customer.companyName ? <p className="text-sm text-slate-500">{customer.name}</p> : <p className="text-sm text-slate-500">{t("Privatkunde")}</p>}</div>
                <div className="space-y-1 break-words text-sm text-slate-600">
                  {customer.phone ? <p>{customer.phone}</p> : null}{customer.email ? <p>{customer.email}</p> : null}
                  {(customer.address || customer.city) ? <p>{[customer.address, customer.postalCode, customer.city].filter(Boolean).join(", ")}</p> : null}
                  {customer.notes ? <p className="text-slate-500">{customer.notes}</p> : null}
                </div>
                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  <Button type="button" variant="secondary" className="min-h-11 flex-1" onClick={() => startEdit(customer.id)}><PencilLine className="mr-2 h-4 w-4" /> {t("Bearbeiten")}</Button>
                  <ConfirmDelete label={customer.name} disabled={busyId === customer.id} onConfirm={() => void handleDelete(customer.id)} />
                </div>
              </Card>
            ))}
          </div>
          <Card className="hidden overflow-hidden p-0 lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#f8f9f7] text-xs uppercase tracking-wide text-slate-500"><tr>{["Kunde", "Telefon", "E-Mail", "Adresse", "Aktionen"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{t(heading)}</th>)}</tr></thead>
                <tbody>{filteredCustomers.map((customer) => <tr key={customer.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-4 font-medium">{customer.companyName || customer.name}<span className="block text-xs text-slate-500">{customer.companyName ? customer.name : t("Privatkunde")}</span></td><td className="px-4 py-4">{customer.phone || "—"}</td><td className="px-4 py-4">{customer.email || "—"}</td><td className="px-4 py-4">{[customer.address, customer.postalCode, customer.city].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => startEdit(customer.id)} className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100" aria-label={`${t("Kunde")} ${customer.name} ${t("Bearbeiten")}`}><PencilLine className="h-4 w-4" /></button><ConfirmDelete label={customer.name} disabled={busyId === customer.id} onConfirm={() => void handleDelete(customer.id)} /></div></td>
                </tr>)}</tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
