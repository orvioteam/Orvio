"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { useApp } from "@/components/providers";
import type { Organization } from "@/lib/types";

export default function SettingsPage() {
  const { activeOrganization, updateOrganization, signOut } = useApp();
  return (
    <SettingsForm
      key={activeOrganization?.id ?? "no-organization"}
      organization={activeOrganization}
      updateOrganization={updateOrganization}
      signOut={signOut}
    />
  );
}

function SettingsForm({
  organization,
  updateOrganization,
  signOut,
}: {
  organization: Organization | null;
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
      <PageHeader title="Einstellungen" description="Unternehmensname, E-Mail und Abmeldung." />
      <Card className="max-w-2xl space-y-6 p-4 sm:p-6">
        <form onSubmit={(event) => void handleSave(event)} className="space-y-4">
          <Input label="Unternehmensname" required value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} />
          <Input label="E-Mail" type="email" value={organizationEmail} onChange={(event) => setOrganizationEmail(event.target.value)} />
          {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
          {saved ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Firmendaten wurden gespeichert.</p> : null}
          <Button type="submit" disabled={isSaving}>{isSaving ? "Wird gespeichert…" : "Änderungen speichern"}</Button>
        </form>
        <div className="border-t border-slate-100 pt-5">
          <Button type="button" variant="secondary" disabled={isSigningOut} onClick={() => void handleSignOut()}>
            {isSigningOut ? "Abmeldung läuft…" : "Abmelden"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
