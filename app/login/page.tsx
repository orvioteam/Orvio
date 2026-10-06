"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";
import { useApp } from "@/components/providers";

const createLoginSchema = (t: (message: string) => string) => z.object({
  email: z.string().email(t("Bitte geben Sie eine gültige E-Mail ein.")),
  password: z.string().min(6, t("Das Passwort muss mindestens 6 Zeichen haben.")),
});

export default function LoginPage() {
  const router = useRouter();
  const { t } = useApp();
  const loginSchema = createLoginSchema(t);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    form.clearErrors("root");
    const nextPath = new URLSearchParams(window.location.search).get("next");
    const inviteReturnPath = nextPath && /^\/join\/[A-Za-z0-9_-]+$/.test(nextPath) ? nextPath : null;
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        if (inviteReturnPath && process.env.NODE_ENV === "development") {
          console.info("[employee-invite] AUTH", {
            message: error.message,
            code: error.code ?? null,
            status: error.status ?? null,
            details: "details" in error ? error.details : null,
            hint: "hint" in error ? error.hint : null,
          });
        }
        form.setError("root", {
          message: error.code === "invalid_credentials" || error.message === "Invalid login credentials"
            ? t("E-Mail oder Passwort ist nicht korrekt.")
            : t("Anmeldedaten konnten nicht überprüft werden."),
        });
        return;
      }

      if (!data.session) {
        form.setError("root", {
          message: t("Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut."),
        });
        return;
      }

      if (inviteReturnPath && process.env.NODE_ENV === "development") {
        console.info("[employee-invite] AUTH", { status: "succeeded" });
      }
      router.replace(inviteReturnPath ?? "/dashboard");
      router.refresh();
    } catch {
      form.setError("root", {
        message: t("Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut."),
      });
    }
  };

  return (
    <main className="grid min-h-screen bg-white md:grid-cols-2">
      <section className="flex min-h-[32vh] flex-col justify-between border-b border-slate-200 bg-[#f4f5f1] px-6 py-6 sm:px-10 md:min-h-screen md:border-b-0 md:border-r md:px-12 md:py-10 lg:px-20">
        <Link href="/" className="flex w-fit items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#176b4a] text-xs font-semibold tracking-wide text-white">OV</span>
          <span className="text-base font-semibold tracking-tight text-slate-900">Orvio</span>
        </Link>
        <div className="max-w-md py-8 md:py-0">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-[#176b4a]">{t("Einsatzplanung für mobile Teams")}</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">{t("Aufträge einfach planen.")}</h1>
          <p className="mt-5 max-w-sm text-base leading-7 text-slate-600">{t("Kunden, Mitarbeitende und Einsätze übersichtlich an einem Ort organisieren.")}</p>
        </div>
        <p className="hidden text-xs text-slate-500 md:block">{t("Ruhig planen. Verlässlich arbeiten.")}</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10 md:px-12 lg:px-20">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="text-sm font-medium text-[#176b4a]">{t("Willkommen zurück")}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{t("Anmelden")}</h2>
            <p className="mt-2 text-sm text-slate-500">{t("Melden Sie sich an, um Ihren Arbeitsbereich zu öffnen.")}</p>
          </div>

          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Input
                label={t("E-Mail")}
                type="email"
                placeholder="name@example.com"
                {...form.register("email")}
                aria-invalid={Boolean(form.formState.errors.email)}
                autoComplete="email"
              />
              {form.formState.errors.email ? <p className="mt-1.5 text-xs text-rose-700">{form.formState.errors.email.message}</p> : null}
            </div>

            <div>
              <Input
                label={t("Passwort")}
                type="password"
                placeholder={t("Passwort eingeben")}
                {...form.register("password")}
                aria-invalid={Boolean(form.formState.errors.password)}
                autoComplete="current-password"
              />
              {form.formState.errors.password ? <p className="mt-1.5 text-xs text-rose-700">{form.formState.errors.password.message}</p> : null}
            </div>

            {form.formState.errors.root ? (
              <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{form.formState.errors.root.message}</p>
            ) : null}

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? t("Anmeldung läuft…") : t("Anmelden")} {!form.formState.isSubmitting ? <ArrowRight className="ml-2 h-4 w-4" /> : null}</Button>
          </form>

          <p className="mt-7 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
            {t("Noch kein Konto?")}{" "}
            <Link href="/register" className="font-medium text-[#176b4a] hover:underline">{t("Registrieren")}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
