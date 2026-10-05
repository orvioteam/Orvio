"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useApp } from "@/components/providers";
import { Button, Input } from "@/components/ui";

const loginSchema = z.object({
  email: z.string().email("Bitte geben Sie eine gültige E-Mail ein."),
  password: z.string().min(6, "Das Passwort muss mindestens 6 Zeichen haben."),
});

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { signIn, currentUser } = useApp();
  const [authDebug, setAuthDebug] = useState({
    submit: "wartet",
    signIn: "wartet",
    session: "wartet",
    redirect: "wartet",
    proxy: "wartet",
    dashboard: "wartet",
  });

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (currentUser) {
      if (process.env.NODE_ENV === "development") {
        console.info("[auth-debug] REDIRECT: currentUser effect requested /dashboard", {
          pathname,
          userId: currentUser.id.slice(0, 8),
        });
      }
      router.replace("/dashboard");
    }
  }, [currentUser, pathname, router]);

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    form.clearErrors("root");
    let stage = "SIGN_IN";
    if (process.env.NODE_ENV === "development") {
      console.info("[auth-debug] SUBMIT: handleSubmit reached", { pathname });
      setAuthDebug({
        submit: "handleSubmit aufgerufen",
        signIn: "signInWithPassword wird aufgerufen",
        session: "warte auf Supabase-Antwort",
        redirect: "wartet",
        proxy: "warte auf Request /dashboard",
        dashboard: "warte auf Proxy-Entscheidung",
      });
    }
    try {
      await signIn(values.email, values.password);
      if (process.env.NODE_ENV === "development") {
        console.info("[auth-debug] SESSION: client sign-in completed and getUser identity verified");
        setAuthDebug((status) => ({
          ...status,
          signIn: "abgeschlossen",
          session: "vorhanden und per getUser bestätigt",
        }));
        stage = "REDIRECT";
      }
      if (process.env.NODE_ENV === "development") {
        console.info("[auth-debug] REDIRECT: calling router.replace", { pathname, target: "/dashboard" });
        setAuthDebug((status) => ({ ...status, redirect: "router.replace(/dashboard) aufgerufen" }));
      }
      router.replace("/dashboard");
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        const message = error instanceof Error ? error.message : "Unbekannter Fehler";
        console.error(`[auth-debug] ${stage}: failed`, { pathname, message });
        setAuthDebug((status) => ({
          ...status,
          signIn: stage === "SIGN_IN" ? `fehlgeschlagen: ${message}` : status.signIn,
          session: stage === "SIGN_IN" ? "nicht bestätigt" : status.session,
          redirect: stage === "REDIRECT" ? `fehlgeschlagen: ${message}` : status.redirect,
        }));
      }
      form.setError("root", {
        message: error instanceof Error && (
          error.message === "E-Mail oder Passwort ist nicht korrekt."
          || error.message === "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse."
        )
          ? error.message
          : "Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
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
                {process.env.NODE_ENV === "development" ? (
                  <section aria-label="Auth Debug" className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                    <p className="font-semibold">Auth Debug: submit → signIn → session → redirect</p>
                    <p>SUBMIT: {authDebug.submit}</p>
                    <p>SIGN_IN: {authDebug.signIn}</p>
                    <p>SESSION: {authDebug.session}</p>
                    <p>REDIRECT: {authDebug.redirect}</p>
                    <p>PROXY: {authDebug.proxy} (Details im Server-Log)</p>
                    <p>DASHBOARD: {authDebug.dashboard} (Details im Server-Log)</p>
                    <p>PATH: {pathname}</p>
                  </section>
                ) : null}
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
