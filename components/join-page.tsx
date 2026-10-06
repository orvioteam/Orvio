"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { useApp } from "@/components/providers";
import { createClient } from "@/lib/supabase/client";

type InvitationDetails = {
  invitation_status: "valid" | "expired" | "accepted";
  employee_email: string;
  first_name: string;
  last_name: string;
  organization_name: string;
  expires_at: string;
};

const translateInvitationError = (message: string) => ({
  "Invitation is invalid or expired": "Einladung ist ungültig oder abgelaufen.",
  "Invitation already used": "Diese Einladung wurde bereits verwendet.",
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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
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
      const { data, error: invitationError } = await supabase.rpc("get_employee_invitation", { p_token: token });
      if (invitationError) throw new Error(invitationError.message);
      const invite = (Array.isArray(data) ? data[0] : data) as InvitationDetails | null;
      if (!invite) throw new Error("Einladung ist ungültig oder abgelaufen.");
      if (invite.invitation_status === "expired") {
        throw new Error("Einladung ist ungültig oder abgelaufen.");
      }
      if (invite.invitation_status === "accepted") {
        throw new Error("Diese Einladung wurde bereits verwendet.");
      }
      if (!invite.employee_email) throw new Error("Einladung ist ungültig oder abgelaufen.");
      if (!active) return;

      setInvitation(invite);
      setFullName(`${invite.first_name} ${invite.last_name}`.trim());
      setEmail(invite.employee_email);

      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError && authError.name !== "AuthSessionMissingError") {
        throw new Error(authError.message);
      }
      if (active && authData?.session?.user) await acceptInvitation();
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
    if (email.trim().toLowerCase() !== invitation.employee_email.trim().toLowerCase()) {
      setError(t("Bitte verwenden Sie die E-Mail-Adresse, an die die Einladung gesendet wurde."));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: invitation.employee_email,
        password,
        options: {
          data: { full_name: fullName.trim() },
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
    <main className="min-h-screen bg-white px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-md">
          <Link href="/" className="mb-10 inline-flex items-center text-lg font-semibold tracking-tight text-slate-900">Orvio</Link>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("Team beitreten")}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("Sie wurden eingeladen, einem Team beizutreten.")}</p>
          {invitation ? (
            <p className="mt-5 text-sm text-slate-700"><span className="font-medium">{t("Firma")}:</span> {invitation.organization_name}</p>
          ) : null}
          {error ? <p role="alert" className="mt-5 break-words rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{t(error)}</p> : null}
          {confirmationRequired ? (
            <div role="status" className="mt-5 space-y-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p>{t("Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.")}</p>
              <Link className="font-medium underline" href={`/login?next=${encodeURIComponent(`/join/${token}`)}`}>{t("Anmelden")}</Link>
            </div>
          ) : invitation ? (
            <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
              <Input label={t("Name")} name="fullName" autoComplete="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} />
              <Input label={t("E-Mail")} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              <Input label={t("Passwort")} name="password" type="password" autoComplete="new-password" minLength={8} required />
              <p className="text-xs text-slate-500">{t("Einladung läuft ab am")} {new Date(invitation.expires_at).toLocaleDateString()}</p>
              <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? t("Wird gespeichert…") : t("Konto erstellen")}</Button>
              <p className="text-center text-sm text-slate-600">{t("Sie haben bereits ein Konto?")}{" "}<Link className="font-medium text-emerald-800 underline" href={`/login?next=${encodeURIComponent(`/join/${token}`)}`}>{t("Anmelden")}</Link></p>
            </form>
          ) : !error ? (
            <p role="status" className="mt-5 text-sm text-slate-600">{t("Ansicht wird geladen…")}</p>
          ) : null}
      </div>
    </main>
  );
}
