"use client";

import { useState } from "react";
import { Badge, Button, Card, Input, PageHeader } from "@/components/ui";
import { useApp } from "@/components/providers";

export default function SettingsPage() {
  const { currentUser, activeOrganization, updateOrganization } = useApp();
  const [organizationName, setOrganizationName] = useState(activeOrganization?.name ?? "");
  const [organizationPhone, setOrganizationPhone] = useState(activeOrganization?.phone ?? "");
  const [organizationEmail, setOrganizationEmail] = useState(activeOrganization?.email ?? "");
  const [organizationAddress, setOrganizationAddress] = useState(activeOrganization?.address ?? "");

  const handleSave = () => {
    updateOrganization(organizationName, organizationPhone, organizationEmail, organizationAddress);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Einstellungen" description="Anpassungen für Ihre Organisation und Ihr Profil." />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Firma</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Firmeninformationen</h2>
          </div>
          <Input label="Firmenname" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} />
          <Input label="Adresse" value={organizationAddress} onChange={(event) => setOrganizationAddress(event.target.value)} />
          <Input label="Telefon" value={organizationPhone} onChange={(event) => setOrganizationPhone(event.target.value)} />
          <Input label="E-Mail" value={organizationEmail} onChange={(event) => setOrganizationEmail(event.target.value)} />
          <Button type="button" onClick={handleSave}>Speichern</Button>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Profil</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Benutzerprofil</h2>
          </div>
          <Input label="Vorname" defaultValue={currentUser?.firstName ?? ""} />
          <Input label="Nachname" defaultValue={currentUser?.lastName ?? ""} />
          <Input label="E-Mail" defaultValue={currentUser?.email ?? ""} />
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Billing</p>
          <Badge>Noch nicht eingerichtet</Badge>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Aktueller Tarif</h3>
          <p className="mt-2 text-sm text-slate-600">Stripe-Integration und Abonnementlogik sind als Architektur vorbereitet, aber noch nicht aktiviert.</p>
        </div>
      </Card>
    </div>
  );
}
