"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { useApp } from "@/components/providers";
import { createClient } from "@/lib/supabase/client";

type InvitationDetails = {
  employee_email: string;
  first_name: string;
  last_name: string;
  expires_at: string;
};

const translateInvitationError = (message: string) => ({
  "Invitation is invalid or expired": "Einladung ist ungültig oder abgelaufen.",
  "Signed-in email does not match this invitation": "Die E-Mail-Adresse stimmt nicht mit der Einladung überein.",
  "Account already belongs to another organization": "Dieses Konto gehört bereits zu einer anderen Organisation.",
  "Account cannot join this employee invitation": "Dieses Konto kann diese Mitarbeitereinladung nicht annehmen.",
  "Employee is already linked to another account": "Dieser Mitarbeiter ist bereits mit einem anderen Konto verknüpft.",
  "Authentication required": "Bitte melden Sie sich an, um die Einladung anzunehmen.",
}[message] ?? message);

export function JoinPageClient({ token }: { token: string }) {
  const router = useRouter();
  const { refreshData, t } = useApp();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const acceptInvitation = useCallback(async () => {
    const { error: acceptError } = await supabase.rpc("accept_employee_invitation", { p_token: token });
    if (acceptError) throw new Error(acceptError.message);
    const refreshError = await refreshData();
    if (refreshError) throw new Error(refreshError);
    router.replace("/dashboard");
    router.refresh();
  }, [refreshData, router, supabase, token]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      if (authData.user) {
        await acceptInvitation();
        return;
      }

      const { data, error: invitationError } = await supabase.rpc("get_employee_invitation", { p_token: token });
      if (invitationError) throw new Error(invitationError.message);
      const invite = (Array.isArray(data) ? data[0] : data) as InvitationDetails | null;
      if (!invite?.employee_email) throw new Error("Einladung ist ungültig oder abgelaufen.");
      if (active) setInvitation(invite);
    })().catch((loadError: unknown) => {
      if (active) setError(t(translateInvitationError(loadError instanceof Error ? loadError.message : "Einladung ist ungültig oder abgelaufen.")));
    });
    return () => { active = false; };
  }, [acceptInvitation, supabase, t, token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invitation) return;
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    setIsSubmitting(true);
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: invitation.employee_email,
        password,
        options: {
          data: { full_name: `${invitation.first_name} ${invitation.last_name}`.trim() },
        },
      });
      if (signUpError) throw new Error(signUpError.message);
      if (!data.session) {
        setConfirmationRequired(true);
        return;
      }
      await acceptInvitation();
    } catch (submitError) {
      setError(t(translateInvitationError(submitError instanceof Error ? submitError.message : "Einladung ist ungültig oder abgelaufen.")));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f4] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-lg">
        <Card className="space-y-5">
          <PageHeader title={t("Team beitreten")} description={t("Schicken Sie diesen Link an den Mitarbeiter.")} />
          {error ? <p role="alert" className="break-words rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{t(error)}</p> : null}
          {confirmationRequired ? (
            <div role="status" className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p>{t("Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.")}</p>
              <Link className="font-medium underline" href={`/login?next=${encodeURIComponent(`/join/${token}`)}`}>{t("Anmelden")}</Link>
            </div>
          ) : invitation ? (
            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
              <Input label={t("Name")} value={`${invitation.first_name} ${invitation.last_name}`.trim()} readOnly />
              <Input label={t("E-Mail")} type="email" value={invitation.employee_email} readOnly />
              <Input label={t("Passwort")} name="password" type="password" autoComplete="new-password" minLength={8} required />
              <p className="text-xs text-slate-500">{t("Einladung läuft ab am")} {new Date(invitation.expires_at).toLocaleDateString()}</p>
              <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? t("Wird gespeichert…") : t("Einladung annehmen")}</Button>
            </form>
          ) : !error ? (
            <p role="status" className="text-sm text-slate-600">{t("Ansicht wird geladen…")}</p>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
