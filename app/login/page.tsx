"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

const loginSchema = z.object({
  email: z.string().email("Bitte geben Sie eine gültige E-Mail ein."),
  password: z.string().min(6, "Das Passwort muss mindestens 6 Zeichen haben."),
});

export default function LoginPage() {
  const router = useRouter();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    form.clearErrors("root");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        form.setError("root", {
          message: error.code === "invalid_credentials" || error.message === "Invalid login credentials"
            ? "E-Mail oder Passwort ist nicht korrekt."
            : "Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
        });
        return;
      }

      if (!data.session) {
        form.setError("root", {
          message: "Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
        });
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      form.setError("root", {
        message: "Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
      });
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid md:grid-cols-2">
          <div className="hidden bg-slate-900 p-10 text-white md:flex md:flex-col md:justify-between">
            <div>
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-lg font-bold text-white">C</div>
                <p className="text-xl font-semibold">CleanFlow</p>
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold leading-tight">Willkommen zurück</h1>
                <p className="max-w-sm text-sm text-slate-300">
                  Verwalten Sie Aufträge, Mitarbeiter und Kunden ganz einfach – mit einer klaren Tagesübersicht und sicheren Organisationen.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-200">
              <div className="mb-2 flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                <span>Mehr Sicherheit</span>
              </div>
              <p>Organisationale Datentrennung und sichere Zugriffskontrolle mit klaren Rollen.</p>
            </div>
          </div>

          <div className="flex items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-md space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">Login</p>
                <h2 className="text-3xl font-semibold text-slate-900">Anmeldung</h2>
              </div>

              <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="E-Mail"
                  type="email"
                  placeholder="name@firma.ch"
                  {...form.register("email")}
                  aria-invalid={Boolean(form.formState.errors.email)}
                  autoComplete="email"
                />
                {form.formState.errors.email ? <p className="text-xs text-rose-600">{form.formState.errors.email.message}</p> : null}

                <Input
                  label="Passwort"
                  type="password"
                  placeholder="••••••••"
                  {...form.register("password")}
                  aria-invalid={Boolean(form.formState.errors.password)}
                  autoComplete="current-password"
                />
                {form.formState.errors.password ? <p className="text-xs text-rose-600">{form.formState.errors.password.message}</p> : null}

                {form.formState.errors.root ? (
                  <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.formState.errors.root.message}</p>
                ) : null}

                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Anmeldung läuft…" : "Einloggen"} {!form.formState.isSubmitting ? <ArrowRight className="ml-2 h-4 w-4" /> : null}</Button>
              </form>

              <p className="text-center text-sm text-slate-600">
                Noch kein Konto?{' '}
                <Link href="/register" className="font-semibold text-emerald-600 hover:text-emerald-500">Konto erstellen</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
