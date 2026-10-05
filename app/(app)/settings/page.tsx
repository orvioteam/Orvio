"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { useApp } from "@/components/providers";
import type { Organization } from "@/lib/types";

export default function SettingsPage() {
  const { activeOrganization, currentUser, updateOrganization, signOut } = useApp();
  return (
    <SettingsForm
      key={activeOrganization?.id ?? "no-organization"}
      organization={activeOrganization}
      user={currentUser}
      updateOrganization={updateOrganization}
      signOut={signOut}
    />
  );
}

function SettingsForm({
  organization,
  user,
  updateOrganization,
  signOut,
}: {
  organization: Organization | null;
  user: { firstName: string; lastName: string; email: string } | null;
  updateOrganization: (name: string, phone: string, email: string, address: string) => Promise<Organization>;
  signOut: () => Promise<void>;
}) {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState(organization?.name ?? "");
  const [organizationEmail, setOrganizationEmail] = useState(organization?.email ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateOrganization(organizationName, organization?.phone ?? "", organizationEmail, organization?.address ?? "");
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Firmendaten konnten nicht gespeichert werden.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setError(null);
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Abmeldung fehlgeschlagen.");
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader title="Einstellungen" description="Organisation und Benutzerkonto verwalten." />
      <div className="grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <Card className="space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Organisation</h2>
            <p className="mt-1 text-sm text-slate-500">Die Angaben Ihrer Reinigungsfirma.</p>
          </div>
          <form onSubmit={(event) => void handleSave(event)} className="space-y-4">
            <Input label="Organisationsname" required value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} />
            <Input label="Kontakt-E-Mail" type="email" value={organizationEmail} onChange={(event) => setOrganizationEmail(event.target.value)} />
            {error ? <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
            {saved ? <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Firmendaten wurden gespeichert.</p> : null}
            <Button type="submit" disabled={isSaving}>{isSaving ? "Wird gespeichert…" : "Änderungen speichern"}</Button>
          </form>
        </Card>

        <Card className="flex flex-col">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Benutzerkonto</h2>
            <p className="mt-1 text-sm text-slate-500">Angemeldetes Konto und Sitzung.</p>
          </div>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="mt-1 font-medium text-slate-800">{user ? `${user.firstName} ${user.lastName}`.trim() : "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">E-Mail</dt>
              <dd className="mt-1 break-all font-medium text-slate-800">{user?.email || "—"}</dd>
            </div>
          </dl>
          <div className="mt-auto border-t border-slate-200 pt-5">
            <Button type="button" variant="secondary" disabled={isSigningOut} onClick={() => void handleSignOut()}>
              {isSigningOut ? "Abmeldung läuft…" : "Abmelden"}
            </Button>
          </div>
          </Card>
        </div>
    </div>
  );
}
