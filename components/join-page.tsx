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

type InviteDiagnosticError = {
  message: string;
  code?: string;
  status?: number;
  details?: string | null;
  hint?: string | null;
};

function logInviteDiagnostic(stage: string, values: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.info(`[employee-invite] ${stage}`, values);
  }
}

function describeInviteError(error: InviteDiagnosticError) {
  return {
    message: error.message,
    code: error.code ?? null,
    status: error.status ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

const translateInvitationError = (message: string) => ({
  "Invitation is invalid or expired": "Einladung ist ungültig oder abgelaufen.",
  "Invitation already used": "Diese Einladung wurde bereits verwendet.",
  "Signed-in email does not match this invitation": "Die E-Mail-Adresse stimmt nicht mit der Einladung überein.",
  "Account already belongs to another organization": "Dieses Konto gehört bereits zu einer anderen Organisation.",
  "Account cannot join this employee invitation": "Dieses Konto kann diese Mitarbeitereinladung nicht annehmen.",
  "Employee is already linked to another account": "Dieser Mitarbeiter ist bereits mit einem anderen Konto verknüpft.",
  "Authentication required": "Bitte melden Sie sich an, um die Einladung anzunehmen.",
  "INVITE_ACCEPT: Invitation is invalid or expired": "Einladung ist ungültig oder abgelaufen.",
  "INVITE_ACCEPT: Invitation already used": "Diese Einladung wurde bereits verwendet.",
  "INVITE_ACCEPT: Signed-in email does not match this invitation": "Die E-Mail-Adresse stimmt nicht mit der Einladung überein.",
  "EMPLOYEE_LINK: Employee does not belong to the invitation organization": "Der Mitarbeiterdatensatz gehört nicht zur Organisation dieser Einladung.",
  "EMPLOYEE_LINK: Employee is already linked to another account": "Dieser Mitarbeiter ist bereits mit einem anderen Konto verknüpft.",
  "EMPLOYEE_LINK: Employee account could not be linked": "Das Mitarbeiterkonto konnte nicht mit dem Mitarbeiterdatensatz verknüpft werden.",
  "MEMBERSHIP: Account already belongs to another organization": "Dieses Konto gehört bereits zu einer anderen Organisation.",
  "MEMBERSHIP: Account already has a non-employee role in this organization": "Dieses Konto besitzt in der Organisation bereits eine andere Rolle.",
  "MEMBERSHIP: Employee membership could not be created": "Die Mitarbeiter-Mitgliedschaft konnte nicht erstellt werden.",
  "MEMBERSHIP: Employee membership was not created": "Die Mitarbeiter-Mitgliedschaft wurde nicht bestätigt.",
  "MEMBERSHIP: Invitation acceptance did not return an organization.": "Die Organisation zur Einladung konnte nicht ermittelt werden.",
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
    logInviteDiagnostic("INVITE_ACCEPT", { status: "started" });
    const { data: organizationId, error: acceptError } = await supabase.rpc("accept_employee_invitation", { p_token: token });
    if (acceptError) {
      const stage = acceptError.message.startsWith("EMPLOYEE_LINK:")
        ? "EMPLOYEE_LINK"
        : acceptError.message.startsWith("MEMBERSHIP:")
          ? "MEMBERSHIP"
          : "INVITE_ACCEPT";
      logInviteDiagnostic(stage, describeInviteError(acceptError));
      throw new Error(acceptError.message);
    }
    logInviteDiagnostic("INVITE_ACCEPT", { status: "succeeded" });
    logInviteDiagnostic("EMPLOYEE_LINK", { status: "succeeded" });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      const message = authError?.message ?? "Authentication required";
      logInviteDiagnostic("AUTH", authError
        ? describeInviteError(authError)
        : { message, code: null, status: null, details: null, hint: null });
      throw new Error(message);
    }
    if (!organizationId) {
      const message = "MEMBERSHIP: Invitation acceptance did not return an organization.";
      logInviteDiagnostic("MEMBERSHIP", {
        message,
        code: null,
        status: null,
        details: "The acceptance RPC returned no organization identifier.",
        hint: "Check the deployed invitation acceptance migration.",
      });
      throw new Error(message);
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (membershipError || membership?.role !== "employee") {
      const diagnostic = membershipError
        ? describeInviteError(membershipError)
        : {
          message: "Employee membership was not found after acceptance.",
          code: null,
          status: null,
          details: "No employee membership exists for the authenticated user in the invitation organization.",
          hint: "Apply the latest employee invitation acceptance migration.",
        };
      logInviteDiagnostic("MEMBERSHIP", diagnostic);
      throw new Error("MEMBERSHIP: Employee membership was not created");
    }
    logInviteDiagnostic("MEMBERSHIP", { status: "verified" });

    const refreshError = await refreshData();
    if (refreshError) {
      logInviteDiagnostic("MEMBERSHIP", {
        message: refreshError,
        code: null,
        status: null,
        details: null,
        hint: null,
      });
      throw new Error(refreshError);
    }
    router.replace("/dashboard");
    router.refresh();
    logInviteDiagnostic("REDIRECT", { status: "requested", destination: "/dashboard" });
  }, [refreshData, router, supabase, token]);

  useEffect(() => {
    let active = true;
    void (async () => {
      logInviteDiagnostic("INVITE_OPEN", { status: "started" });
      const { data, error: invitationError } = await supabase.rpc("get_employee_invitation", { p_token: token });
      if (invitationError) {
        logInviteDiagnostic("INVITE_OPEN", describeInviteError(invitationError));
        throw new Error(invitationError.message);
      }
      const invite = (Array.isArray(data) ? data[0] : data) as InvitationDetails | null;
      if (!invite) throw new Error("Einladung ist ungültig oder abgelaufen.");
      logInviteDiagnostic("INVITE_OPEN", { status: invite.invitation_status });
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
        logInviteDiagnostic("AUTH", describeInviteError(authError));
        throw new Error(authError.message);
      }
      logInviteDiagnostic("AUTH", { status: authData?.session?.user ? "authenticated" : "anonymous" });
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
      if (signUpError) {
        logInviteDiagnostic("AUTH", describeInviteError(signUpError));
        throw new Error(signUpError.message);
      }
      logInviteDiagnostic("AUTH", { status: data.session ? "succeeded" : "email_confirmation_required" });
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
