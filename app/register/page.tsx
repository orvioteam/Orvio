"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useApp } from "@/components/providers";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

const createRegisterSchema = (t: (message: string) => string) => z.object({
  organizationName: z.string().min(2, t("Firmenname ist erforderlich.")),
  firstName: z.string().min(2, t("Vorname ist erforderlich.")),
  lastName: z.string().min(2, t("Nachname ist erforderlich.")),
  email: z.string().email(t("Bitte geben Sie eine gültige E-Mail ein.")),
  password: z.string().min(8, t("Das Passwort muss mindestens 8 Zeichen lang sein.")),
});

export default function RegisterPage() {
  const router = useRouter();
  const { refreshData, t } = useApp();
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const registerSchema = createRegisterSchema(t);

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
    let stage: "auth" | "provision" | "redirect" = "auth";

    if (process.env.NODE_ENV === "development") {
      console.info("[signup] START");
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: `${values.firstName} ${values.lastName}`.trim(),
            organization_name: values.organizationName.trim(),
          },
        },
      });

      if (process.env.NODE_ENV === "development") {
        console.info("[signup] AUTH RESULT", JSON.stringify({
          hasUser: Boolean(data.user),
          hasSession: Boolean(data.session),
          errorMessage: error?.message ?? null,
          errorCode: error?.code ?? null,
          errorStatus: error?.status ?? null,
        }, null, 2));
      }

      if (error) {
        form.setError("root", {
          message: t("Registrierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut."),
        });
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.info("[signup] USER", JSON.stringify({
          hasUser: Boolean(data.user),
          userIdPresent: Boolean(data.user?.id),
        }, null, 2));
      }

      if (!data.user) {
        form.setError("root", {
          message: t("Registrierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut."),
        });
        return;
      }

      if (!data.session) {
        if (process.env.NODE_ENV === "development") {
          console.info("[signup] CONFIRMATION_REQUIRED");
        }
        setConfirmationRequired(true);
        return;
      }

      stage = "provision";
      if (process.env.NODE_ENV === "development") {
        console.info("[signup] PROVISION START");
      }

      const provisioningError = await refreshData(values.organizationName, true);
      if (provisioningError) {
        if (process.env.NODE_ENV === "development") {
          console.error("[signup] PROVISION ERROR", provisioningError);
        }
        form.setError("root", {
          message: t("Die Registrierung konnte abgeschlossen werden, aber die Organisation konnte nicht eingerichtet werden. Bitte versuchen Sie es erneut."),
        });
        return;
      }

      stage = "redirect";
      router.replace("/dashboard");
      router.refresh();
      if (process.env.NODE_ENV === "development") {
        console.info("[signup] REDIRECT", "/dashboard");
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[signup] ${stage.toUpperCase()} ERROR`, message);
      }
      form.setError("root", {
        message: stage === "provision"
          ? t("Die Registrierung konnte abgeschlossen werden, aber die Organisation konnte nicht eingerichtet werden. Bitte versuchen Sie es erneut.")
          : t("Registrierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut."),
      });
    }
  };

  return (
    <main className="grid min-h-screen bg-white md:grid-cols-2">
      <section className="flex min-h-[30vh] flex-col justify-between border-b border-slate-200 bg-[#f4f5f1] px-6 py-6 sm:px-10 md:min-h-screen md:border-b-0 md:border-r md:px-12 md:py-10 lg:px-20">
        <Link href="/" className="flex w-fit items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#176b4a] text-xs font-semibold tracking-wide text-white">OV</span>
          <span className="text-base font-semibold tracking-tight text-slate-900">Orvio</span>
        </Link>
        <div className="max-w-md py-8 md:py-0">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-[#176b4a]">{t("Einfach organisiert")}</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">{t("Aufträge einfach planen.")}</h1>
          <p className="mt-5 max-w-sm text-base leading-7 text-slate-600">{t("Die Einsatzplanung für mobile Teams. Kunden, Mitarbeitende und Aufträge an einem Ort.")}</p>
        </div>
        <p className="hidden text-xs text-slate-500 md:block">{t("Ruhig planen. Verlässlich arbeiten.")}</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10 md:px-12 lg:px-16">
        <div className="w-full max-w-md">
          <div className="mb-7">
            <p className="text-sm font-medium text-[#176b4a]">{t("Orvio starten")}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{t("Konto erstellen")}</h2>
            <p className="mt-2 text-sm text-slate-500">{t("Erstellen Sie Ihr Konto und organisieren Sie Ihre Aufträge einfacher.")}</p>
          </div>

          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input label={t("Firmenname")} autoComplete="organization" placeholder={t("Name Ihres Unternehmens")} {...form.register("organizationName")} />
              {form.formState.errors.organizationName ? <p className="mt-1.5 text-xs text-rose-700">{form.formState.errors.organizationName.message}</p> : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Input label={t("Vorname")} autoComplete="given-name" placeholder={t("Vorname")} {...form.register("firstName")} aria-invalid={Boolean(form.formState.errors.firstName)} />
                {form.formState.errors.firstName ? <p className="mt-1.5 text-xs text-rose-700">{form.formState.errors.firstName.message}</p> : null}
              </div>
              <div>
                <Input label={t("Nachname")} autoComplete="family-name" placeholder={t("Nachname")} {...form.register("lastName")} aria-invalid={Boolean(form.formState.errors.lastName)} />
                {form.formState.errors.lastName ? <p className="mt-1.5 text-xs text-rose-700">{form.formState.errors.lastName.message}</p> : null}
              </div>
            </div>

            <div>
              <Input label={t("E-Mail")} type="email" autoComplete="email" placeholder="name@example.com" {...form.register("email")} aria-invalid={Boolean(form.formState.errors.email)} />
              {form.formState.errors.email ? <p className="mt-1.5 text-xs text-rose-700">{form.formState.errors.email.message}</p> : null}
            </div>

            <div>
              <Input label={t("Passwort")} type="password" autoComplete="new-password" placeholder={t("Mindestens 8 Zeichen")} {...form.register("password")} aria-invalid={Boolean(form.formState.errors.password)} />
              {form.formState.errors.password ? <p className="mt-1.5 text-xs text-rose-700">{form.formState.errors.password.message}</p> : null}
            </div>

            {confirmationRequired ? (
              <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                {t("Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.")}
              </p>
            ) : null}

            {form.formState.errors.root ? (
              <p role="alert" className="whitespace-pre-line rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{form.formState.errors.root.message}</p>
            ) : null}

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t("Konto wird erstellt…") : t("Konto erstellen")}
              {!form.formState.isSubmitting ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
            </Button>
          </form>

          <p className="mt-7 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
            {t("Bereits ein Konto?")} <Link href="/login" className="font-medium text-[#176b4a] hover:underline">{t("Anmelden")}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
