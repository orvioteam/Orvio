"use client";

import { useMemo, useState } from "react";
import { PencilLine, Plus, Search, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { useApp } from "@/components/providers";
import type { CustomerFormInput } from "@/lib/types";

const defaultCustomer: CustomerFormInput = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  address: "",
  postalCode: "",
  city: "",
  notes: "",
};

export default function CustomersPage() {
  const { state, saveCustomer, deleteCustomer } = useApp();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CustomerFormInput>(defaultCustomer);

  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return state.customers;
    return state.customers.filter((customer) =>
      [customer.name, customer.companyName, customer.city].some((field) =>
        field.toLowerCase().includes(normalized),
      ),
    );
  }, [query, state.customers]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    if (editingId) {
      saveCustomer(draft, editingId);
    } else {
      saveCustomer(draft);
    }

    setDraft(defaultCustomer);
    setEditingId(null);
    setFormOpen(false);
  };

  const startEdit = (customerId: string) => {
    const customer = state.customers.find((entry) => entry.id === customerId);
    if (!customer) return;
    setDraft({
      name: customer.name,
      companyName: customer.companyName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      postalCode: customer.postalCode,
      city: customer.city,
      notes: customer.notes,
    });
    setEditingId(customerId);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Kunden"
        description="Verwalten Sie alle Kunden und deren Aufträge zentral."
        action={
          <Button type="button" onClick={() => { setFormOpen((value) => !value); setEditingId(null); setDraft(defaultCustomer); }}>
            <Plus className="mr-2 h-4 w-4" /> Kunde hinzufügen
          </Button>
        }
      />

      <Card className="mb-6 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Kunden durchsuchen..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </Card>

      {formOpen ? (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <Input label="Name" value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} />
            <Input label="Firma" value={draft.companyName} onChange={(event) => setDraft((value) => ({ ...value, companyName: event.target.value }))} />
            <Input label="Telefon" value={draft.phone} onChange={(event) => setDraft((value) => ({ ...value, phone: event.target.value }))} />
            <Input label="E-Mail" type="email" value={draft.email} onChange={(event) => setDraft((value) => ({ ...value, email: event.target.value }))} />
            <Input label="Adresse" className="md:col-span-2" value={draft.address} onChange={(event) => setDraft((value) => ({ ...value, address: event.target.value }))} />
            <Input label="PLZ" value={draft.postalCode} onChange={(event) => setDraft((value) => ({ ...value, postalCode: event.target.value }))} />
            <Input label="Ort" value={draft.city} onChange={(event) => setDraft((value) => ({ ...value, city: event.target.value }))} />
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft((value) => ({ ...value, notes: event.target.value }))}
              placeholder="Notizen"
              className="md:col-span-2 min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />

            <div className="md:col-span-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => { setFormOpen(false); setEditingId(null); setDraft(defaultCustomer); }}>
                Abbrechen
              </Button>
              <Button type="submit">{editingId ? "Speichern" : "Kunde erstellen"}</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {filteredCustomers.length === 0 ? (
        <EmptyState title="Noch keine Kunden vorhanden" description="Fügen Sie Ihren ersten Kunden hinzu und verwalten Sie alles zentral in CleanFlow." action={<Button type="button" onClick={() => setFormOpen(true)}>Kunde hinzufügen</Button>} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Firma</th>
                  <th className="px-4 py-3 font-medium">Telefon</th>
                  <th className="px-4 py-3 font-medium">E-Mail</th>
                  <th className="px-4 py-3 font-medium">Ort</th>
                  <th className="px-4 py-3 font-medium">Aufträge</th>
                  <th className="px-4 py-3 font-medium text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-t border-slate-200 align-top">
                    <td className="px-4 py-4 font-medium text-slate-900">{customer.name}</td>
                    <td className="px-4 py-4 text-slate-600">{customer.companyName}</td>
                    <td className="px-4 py-4 text-slate-600">{customer.phone}</td>
                    <td className="px-4 py-4 text-slate-600">{customer.email}</td>
                    <td className="px-4 py-4 text-slate-600">{customer.city}</td>
                    <td className="px-4 py-4 text-slate-600">{state.jobs.filter((job) => job.customerId === customer.id).length}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => startEdit(customer.id)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100" aria-label={`Kunde ${customer.name} bearbeiten`}>
                          <PencilLine className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => {
                          if (window.confirm(`Kunde "${customer.name}" löschen?`)) deleteCustomer(customer.id);
                        }} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50" aria-label={`Kunde ${customer.name} löschen`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
