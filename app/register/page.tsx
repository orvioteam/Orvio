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

export default function RegisterPage() {
  const router = useRouter();
  const { refreshData } = useApp();
  const [confirmationRequired, setConfirmationRequired] = useState(false);

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
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: `${values.firstName} ${values.lastName}`.trim(),
          },
        },
      });

      if (error) {
        form.setError("root", {
          message: "Registrierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
        });
        return;
      }

      if (!data.user) {
        form.setError("root", {
          message: "Registrierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
        });
        return;
      }

      if (!data.session) {
        setConfirmationRequired(true);
        return;
      }

      const user = data.session.user;
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
        throw new Error(`Organisation konnte nicht erstellt werden: ${organizationError.message}`);
      }

      const { error: membershipError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          role: "owner",
        });
      if (membershipError) {
        throw new Error(`Owner-Mitgliedschaft konnte nicht erstellt werden: ${membershipError.message}`);
      }

      await refreshData();
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
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
