"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Building2 } from "lucide-react";
import { useApp } from "@/components/providers";
import { Button, Input } from "@/components/ui";

const registerSchema = z.object({
  organizationName: z.string().min(2, "Firmenname ist erforderlich."),
  firstName: z.string().min(2, "Vorname ist erforderlich."),
  lastName: z.string().min(2, "Nachname ist erforderlich."),
  email: z.string().email("Bitte geben Sie eine gültige E-Mail ein."),
  password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
});

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, currentUser } = useApp();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    if (currentUser) {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    try {
      await signUp(values);
      router.push("/dashboard");
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error && error.message.startsWith("Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse")
          ? error.message
          : "Registrierung konnte nicht abgeschlossen werden.\nBitte versuchen Sie es erneut.\nFalls das Problem bleibt, wenden Sie sich an den Support.",
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Input label="Firmenname" placeholder="SauberPlus Reinigung" {...form.register("organizationName")} />
              {form.formState.errors.organizationName ? <p className="text-xs text-rose-600">{form.formState.errors.organizationName.message}</p> : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Vorname" placeholder="Anna" {...form.register("firstName")} />
                <Input label="Nachname" placeholder="Müller" {...form.register("lastName")} />
              </div>

              <Input label="E-Mail" type="email" placeholder="name@firma.ch" {...form.register("email")} />
              {form.formState.errors.email ? <p className="text-xs text-rose-600">{form.formState.errors.email.message}</p> : null}

              <Input label="Passwort" type="password" placeholder="Mindestens 8 Zeichen" {...form.register("password")} />
              {form.formState.errors.password ? <p className="text-xs text-rose-600">{form.formState.errors.password.message}</p> : null}

              {form.formState.errors.root ? (
                <p className="whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.formState.errors.root.message}</p>
              ) : null}

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Konto wird erstellt…" : "Konto erstellen"}
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
