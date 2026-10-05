"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Building2 } from "lucide-react";
import { useApp } from "@/components/providers";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

const registerSchema = z.object({
  organizationName: z.string().min(2, "Firmenname ist erforderlich."),
  firstName: z.string().min(2, "Vorname ist erforderlich."),
  lastName: z.string().min(2, "Nachname ist erforderlich."),
  email: z.string().email("Bitte geben Sie eine gültige E-Mail ein."),
  password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
});

type SignupDebugStatus = {
  signup: string;
  user: string;
  session: string;
  organization: string;
  membership: string;
  redirect: string;
};

const initialSignupDebugStatus: SignupDebugStatus = {
  signup: "Wartet",
  user: "Wartet",
  session: "Wartet",
  organization: "Wartet",
  membership: "Wartet",
  redirect: "Wartet",
};

function logSupabaseError(step: string, error: {
  message: string;
  code?: string;
}) {
  if (process.env.NODE_ENV !== "development") return;

  console.error(`[auth-debug] ${step} ERROR`, {
    message: error.message,
    code: error.code ?? null,
    details: "details" in error && typeof error.details === "string" ? error.details : null,
    hint: "hint" in error && typeof error.hint === "string" ? error.hint : null,
  });
}

export default function RegisterPage() {
  const router = useRouter();
  const { refreshData } = useApp();
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [debugStatus, setDebugStatus] = useState(initialSignupDebugStatus);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      organizationName: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    setConfirmationRequired(false);
    form.clearErrors("root");
    setDebugStatus({
      signup: "Läuft",
      user: "Wartet",
      session: "Wartet",
      organization: "Wartet",
      membership: "Wartet",
      redirect: "Wartet",
    });
    let currentStep = "SIGN_UP";

    try {
      const supabase = createClient();
      if (process.env.NODE_ENV === "development") {
        console.info("[auth-debug] SIGN_UP START");
      }
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: `${values.firstName} ${values.lastName}`.trim(),
          },
        },
      });
      if (process.env.NODE_ENV === "development") {
        console.info("[auth-debug] SIGN_UP RESULT", {
          hasUser: Boolean(data.user),
          hasSession: Boolean(data.session),
          errorMessage: error?.message ?? null,
          errorCode: error?.code ?? null,
          errorDetails: error && "details" in error && typeof error.details === "string" ? error.details : null,
          errorHint: error && "hint" in error && typeof error.hint === "string" ? error.hint : null,
        });
      }

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.info("[auth-debug] USER NOT VERIFIED; signup returned an auth error");
          console.info("[auth-debug] SESSION NOT VERIFIED; signup returned an auth error");
        }
        logSupabaseError("SIGN_UP AUTH", error);
        setDebugStatus((status) => ({ ...status, signup: "AUTH ERROR" }));
        form.setError("root", {
          message: "Registrierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
        });
        return;
      }

      if (!data.user) {
        setDebugStatus((status) => ({ ...status, signup: "AUTH ERROR", user: "FEHLER: kein User zurückgegeben" }));
        form.setError("root", {
          message: "Registrierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
        });
        return;
      }

      setDebugStatus((status) => ({ ...status, signup: "OK", user: "OK" }));
      if (process.env.NODE_ENV === "development") {
        console.info("[auth-debug] USER OK", { userId: `${data.user.id.slice(0, 8)}…` });
      }

      if (!data.session) {
        if (process.env.NODE_ENV === "development") {
          console.info("[auth-debug] SESSION OK: no session is the expected email-confirmation path");
          console.info("[auth-debug] SESSION MISSING; email confirmation required");
        }
        setDebugStatus((status) => ({ ...status, session: "E-Mail-Bestätigung erforderlich" }));
        setConfirmationRequired(true);
        return;
      }

      const user = data.session.user;
      setDebugStatus((status) => ({ ...status, session: "OK" }));
      if (process.env.NODE_ENV === "development") {
        console.info("[auth-debug] SESSION OK", { userId: `${user.id.slice(0, 8)}…` });
      }
      currentStep = "ORGANIZATION";
      if (process.env.NODE_ENV === "development") {
        console.info("[auth-debug] ORGANIZATION START", {
          createdByUserId: `${user.id.slice(0, 8)}…`,
        });
      }
      const { data: organization, error: organizationError } = await supabase
        .from("organizations")
        .insert({
          name: values.organizationName.trim(),
          email: values.email.trim(),
          created_by: user.id,
        })
        .select("id")
        .single();
      if (organizationError) {
        logSupabaseError("ORGANIZATION", organizationError);
        setDebugStatus((status) => ({ ...status, organization: "FEHLER" }));
        form.setError("root", {
          message: "Organisation konnte nicht erstellt werden. Bitte versuchen Sie es erneut.",
        });
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.info("[auth-debug] ORGANIZATION OK", {
          organizationId: `${organization.id.slice(0, 8)}…`,
        });
      }
      setDebugStatus((status) => ({ ...status, organization: "OK" }));
      currentStep = "MEMBERSHIP";
      if (process.env.NODE_ENV === "development") {
        console.info("[auth-debug] MEMBERSHIP START", {
          organizationId: `${organization.id.slice(0, 8)}…`,
          userId: `${user.id.slice(0, 8)}…`,
          role: "owner",
        });
      }
      const { error: membershipError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          role: "owner",
        });
      if (membershipError) {
        logSupabaseError("MEMBERSHIP", membershipError);
        setDebugStatus((status) => ({ ...status, membership: "FEHLER" }));
        form.setError("root", {
          message: "Owner-Mitgliedschaft konnte nicht erstellt werden. Bitte versuchen Sie es erneut.",
        });
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.info("[auth-debug] MEMBERSHIP OK");
      }
      setDebugStatus((status) => ({ ...status, membership: "OK" }));
      currentStep = "SUCCESS";
      await refreshData();
      if (process.env.NODE_ENV === "development") {
        console.info("[auth-debug] SIGN_UP SUCCESS");
        console.info("[auth-debug] REDIRECT START");
      }
      setDebugStatus((status) => ({ ...status, redirect: "router.replace(/dashboard) aufgerufen" }));
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error(`[auth-debug] ${currentStep} UNEXPECTED ERROR`, {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
      setDebugStatus((status) => ({
        ...status,
        ...(currentStep === "SIGN_UP" ? { signup: "FEHLER" } : {}),
        ...(currentStep === "ORGANIZATION" ? { organization: "FEHLER" } : {}),
        ...(currentStep === "MEMBERSHIP" ? { membership: "FEHLER" } : {}),
        ...(currentStep === "SUCCESS" ? { redirect: "FEHLER" } : {}),
      }));
      form.setError("root", {
        message: error instanceof Error
          ? error.message
          : "Registrierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
      });
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid md:grid-cols-2">
          <div className="border-b border-slate-200 bg-slate-50 p-8 md:border-r md:border-b-0">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white">C</div>
              <p className="text-xl font-semibold text-slate-900">CleanFlow</p>
            </div>
            <div className="space-y-4">
              <div className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">
                <Building2 className="mr-2 h-4 w-4" />
                Organisation gründen
              </div>
              <h1 className="text-4xl font-semibold text-slate-900">Konto erstellen</h1>
              <p className="text-slate-600">Richten Sie Ihre Organisation ein und beginnen Sie mit der modernen Planung Ihrer Reinigungsfirma.</p>
            </div>
          </div>

          <div className="p-6 md:p-10">
            <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {process.env.NODE_ENV === "development" ? (
                <section aria-label="Registrierungs-Diagnose" className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  <p className="font-semibold">Registrierungs-Diagnose (nur Development)</p>
                  <p>SIGN_UP: {debugStatus.signup}</p>
                  <p>USER: {debugStatus.user}</p>
                  <p>SESSION: {debugStatus.session}</p>
                  <p>ORGANIZATION: {debugStatus.organization}</p>
                  <p>MEMBERSHIP: {debugStatus.membership}</p>
                  <p>REDIRECT: {debugStatus.redirect}</p>
                </section>
              ) : null}
              <Input label="Firmenname" autoComplete="organization" placeholder="SauberPlus Reinigung" {...form.register("organizationName")} />
              {form.formState.errors.organizationName ? <p className="text-xs text-rose-600">{form.formState.errors.organizationName.message}</p> : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Input label="Vorname" autoComplete="given-name" placeholder="Anna" {...form.register("firstName")} aria-invalid={Boolean(form.formState.errors.firstName)} />
                  {form.formState.errors.firstName ? <p className="mt-1 text-xs text-rose-600">{form.formState.errors.firstName.message}</p> : null}
                </div>
                <div>
                  <Input label="Nachname" autoComplete="family-name" placeholder="Müller" {...form.register("lastName")} aria-invalid={Boolean(form.formState.errors.lastName)} />
                  {form.formState.errors.lastName ? <p className="mt-1 text-xs text-rose-600">{form.formState.errors.lastName.message}</p> : null}
                </div>
              </div>

              <Input label="E-Mail" type="email" autoComplete="email" placeholder="name@firma.ch" {...form.register("email")} aria-invalid={Boolean(form.formState.errors.email)} />
              {form.formState.errors.email ? <p className="text-xs text-rose-600">{form.formState.errors.email.message}</p> : null}

              <Input label="Passwort" type="password" autoComplete="new-password" placeholder="Mindestens 8 Zeichen" {...form.register("password")} aria-invalid={Boolean(form.formState.errors.password)} />
              {form.formState.errors.password ? <p className="text-xs text-rose-600">{form.formState.errors.password.message}</p> : null}

              {confirmationRequired ? (
                <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.
                </p>
              ) : null}

              {form.formState.errors.root ? (
                <p role="alert" className="whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.formState.errors.root.message}</p>
              ) : null}

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Konto wird erstellt…" : "Registrieren"}
                {!form.formState.isSubmitting ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Bereits ein Konto? <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-500">Anmelden</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
