"use client";

import { useMemo, useState, type FormEvent } from "react";
import { PencilLine, Plus, Search, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { useApp } from "@/components/providers";
import type { CustomerFormInput } from "@/lib/types";

const defaultCustomer: CustomerFormInput = {
  name: "", companyName: "", email: "", phone: "", address: "", postalCode: "", city: "", notes: "",
};

export default function CustomersPage() {
  const { state, saveCustomer, deleteCustomer } = useApp();
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
      setFormError("Bitte geben Sie einen Namen ein.");
      return;
    }
    setIsSaving(true);
    try {
      await saveCustomer(draft, editingId ?? undefined);
      setDraft(defaultCustomer);
      setEditingId(null);
      setFormOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Kunde konnte nicht gespeichert werden.");
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

  const handleDelete = async (customerId: string, name: string) => {
    if (!window.confirm(`Kunde "${name}" wirklich löschen? Zugehörige Aufträge verhindern das Löschen.`)) return;
    setActionError(null);
    setBusyId(customerId);
    try {
      await deleteCustomer(customerId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Kunde konnte nicht gelöscht werden.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader title="Kunden" description="Kundenkontakte und zugehörige Aufträge Ihrer Organisation." action={<Button type="button" onClick={openNewCustomer}><Plus className="mr-2 h-4 w-4" /> Kunde hinzufügen</Button>} />

      <label className="relative mb-5 block">
        <span className="sr-only">Kunden suchen</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, Firma, Ort oder Kontakt suchen..." className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
      </label>

      {actionError ? <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{actionError}</p> : null}

      {formOpen ? (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">{editingId ? "Kundendaten bearbeiten" : "Neuen Kunden erfassen"}</h2>
          <form onSubmit={(event) => void handleSubmit(event)} className="grid min-w-0 gap-4 md:grid-cols-2">
            <Input label="Name" required autoFocus value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} />
            <Input label="Firma (optional, leer = Privatkunde)" value={draft.companyName} onChange={(event) => setDraft((value) => ({ ...value, companyName: event.target.value }))} />
            <Input label="Telefon" type="tel" value={draft.phone} onChange={(event) => setDraft((value) => ({ ...value, phone: event.target.value }))} />
            <Input label="E-Mail" type="email" value={draft.email} onChange={(event) => setDraft((value) => ({ ...value, email: event.target.value }))} />
            <Input label="Adresse" value={draft.address} onChange={(event) => setDraft((value) => ({ ...value, address: event.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="PLZ" value={draft.postalCode} onChange={(event) => setDraft((value) => ({ ...value, postalCode: event.target.value }))} />
              <Input label="Ort" value={draft.city} onChange={(event) => setDraft((value) => ({ ...value, city: event.target.value }))} />
            </div>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Notizen</span>
              <textarea value={draft.notes} onChange={(event) => setDraft((value) => ({ ...value, notes: event.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>
            {formError ? <p role="alert" className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</p> : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end md:col-span-2">
              <Button type="button" variant="secondary" onClick={() => { setFormOpen(false); setEditingId(null); setFormError(null); }}>Abbrechen</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Wird gespeichert…" : editingId ? "Änderungen speichern" : "Kunde erstellen"}</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {filteredCustomers.length === 0 ? (
        <EmptyState title={state.customers.length === 0 ? "Noch keine Kunden vorhanden" : "Keine passenden Kunden"} description={state.customers.length === 0 ? "Erfassen Sie einen Kunden, um anschließend Aufträge für ihn zu planen." : "Prüfen Sie die Suchanfrage oder löschen Sie den Filter."} action={state.customers.length === 0 ? undefined : <Button type="button" variant="secondary" onClick={() => setQuery("")}>Suche zurücksetzen</Button>} />
      ) : (
        <>
          <div className="space-y-3 xl:hidden">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} className="space-y-3 p-4">
                <div className="min-w-0"><p className="break-words font-semibold">{customer.companyName || customer.name}</p>{customer.companyName ? <p className="text-sm text-slate-500">{customer.name}</p> : <p className="text-sm text-slate-500">Privatkunde</p>}</div>
                <div className="space-y-1 break-words text-sm text-slate-600">
                  {customer.phone ? <p>{customer.phone}</p> : null}{customer.email ? <p>{customer.email}</p> : null}
                  {(customer.address || customer.city) ? <p>{[customer.address, customer.postalCode, customer.city].filter(Boolean).join(", ")}</p> : null}
                  {customer.notes ? <p className="text-slate-500">{customer.notes}</p> : null}
                </div>
                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  <Button type="button" variant="secondary" className="min-h-11 flex-1" onClick={() => startEdit(customer.id)}><PencilLine className="mr-2 h-4 w-4" /> Bearbeiten</Button>
                  <Button type="button" variant="danger" className="min-h-11" disabled={busyId === customer.id} onClick={() => void handleDelete(customer.id, customer.name)} aria-label={`Kunde ${customer.name} löschen`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
          <Card className="hidden overflow-hidden p-0 xl:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600"><tr>{["Kunde", "Telefon", "E-Mail", "Adresse", "Aktionen"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead>
                <tbody>{filteredCustomers.map((customer) => <tr key={customer.id} className="border-t border-slate-200">
                  <td className="px-4 py-4 font-medium">{customer.companyName || customer.name}<span className="block text-xs text-slate-500">{customer.companyName ? customer.name : "Privatkunde"}</span></td><td className="px-4 py-4">{customer.phone || "—"}</td><td className="px-4 py-4">{customer.email || "—"}</td><td className="px-4 py-4">{[customer.address, customer.postalCode, customer.city].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => startEdit(customer.id)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100" aria-label={`Kunde ${customer.name} bearbeiten`}><PencilLine className="h-4 w-4" /></button><button type="button" disabled={busyId === customer.id} onClick={() => void handleDelete(customer.id, customer.name)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50" aria-label={`Kunde ${customer.name} löschen`}><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>)}</tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
