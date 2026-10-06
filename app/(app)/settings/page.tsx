"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, Input, PageHeader, Select } from "@/components/ui";
import { useApp } from "@/components/providers";
import { languageNames, translateError } from "@/lib/i18n";
import type { AppLanguage, Organization } from "@/lib/types";

export default function SettingsPage() {
  const {
    activeOrganization,
    currentRole,
    currentUser,
    language,
    setLanguage,
    updateOrganizationSettings,
    signOut,
    changePassword,
    t,
  } = useApp();
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState(activeOrganization?.name ?? "");
  const [organizationEmail, setOrganizationEmail] = useState(activeOrganization?.email ?? "");
  const [workdayStart, setWorkdayStart] = useState(activeOrganization?.workdayStart ?? "06:00");
  const [workdayEnd, setWorkdayEnd] = useState(activeOrganization?.workdayEnd ?? "24:00");
  const [weekStartsOn, setWeekStartsOn] = useState(activeOrganization?.weekStartsOn ?? 1);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (workdayEnd <= workdayStart) {
      setError(t("Arbeitsende muss nach Arbeitsbeginn liegen."));
      return;
    }
    setIsSaving(true);
    try {
      const updated: Pick<Organization, "name" | "email" | "workdayStart" | "workdayEnd" | "weekStartsOn"> = {
        name: organizationName,
        email: organizationEmail,
        workdayStart,
        workdayEnd,
        weekStartsOn,
      };
      await updateOrganizationSettings(updated);
      setSaved(true);
    } catch (saveError) {
      setError(translateError(language, saveError, "Einstellungen konnten nicht gespeichert werden."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLanguageChange = async (nextLanguage: AppLanguage) => {
    setError(null);
    try {
      await setLanguage(nextLanguage);
    } catch (languageError) {
      setError(translateError(language, languageError, "Sprache konnte nicht gespeichert werden."));
    }
  };

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (newPassword.length < 8) {
      setError(t("Das Passwort muss mindestens 8 Zeichen lang sein."));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("Die Passwörter stimmen nicht überein."));
      return;
    }
    setIsSaving(true);
    try {
      await changePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setSaved(true);
    } catch (passwordError) {
      setError(translateError(language, passwordError, "Passwort konnte nicht geändert werden."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setError(null);
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } catch (signOutError) {
      setError(translateError(language, signOutError, "Abmeldung fehlgeschlagen."));
      setIsSigningOut(false);
    }
  };

  const weekdays = [
    [1, "Montag"], [2, "Dienstag"], [3, "Mittwoch"], [4, "Donnerstag"],
    [5, "Freitag"], [6, "Samstag"], [7, "Sonntag"],
  ] as const;
  const startTimes = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);
  const endTimes = [...startTimes.slice(1), "24:00"];

  return (
    <div className="min-w-0">
      <PageHeader title={t("Einstellungen")} description={t("Organisation und Benutzerkonto verwalten.")} />
      <div className="grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        {currentRole === "owner" ? (
          <Card className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{t("Organisation")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("Die Angaben Ihrer Organisation.")}</p>
            </div>
            <form onSubmit={(event) => void handleSave(event)} className="space-y-4">
              <Input label={t("Organisationsname")} required value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} />
              <Input label={t("Kontakt-E-Mail")} type="email" value={organizationEmail} onChange={(event) => setOrganizationEmail(event.target.value)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label={t("Arbeitsbeginn")} required value={workdayStart} onChange={(event) => setWorkdayStart(event.target.value)}>
                  {startTimes.map((time) => <option key={time} value={time}>{time}</option>)}
                </Select>
                <Select label={t("Arbeitsende")} required value={workdayEnd} onChange={(event) => setWorkdayEnd(event.target.value)}>
                  {endTimes.map((time) => <option key={time} value={time}>{time}</option>)}
                </Select>
              </div>
              <Select label={t("Wochenbeginn")} value={weekStartsOn} onChange={(event) => setWeekStartsOn(Number(event.target.value))}>
                {weekdays.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
              </Select>
              <Button type="submit" disabled={isSaving}>{isSaving ? t("Wird gespeichert…") : t("Änderungen speichern")}</Button>
            </form>
          </Card>
        ) : null}

        <Card className="space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{t("Sprache")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("Die Sprache gilt nur für Ihr Benutzerkonto.")}</p>
          </div>
          <Select label={t("Sprache")} value={language} onChange={(event) => void handleLanguageChange(event.target.value as AppLanguage)}>
            {(Object.entries(languageNames) as [AppLanguage, string][]).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </Select>
        </Card>

        <Card className="space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{t("Benutzerkonto")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("Angemeldetes Konto und Sitzung.")}</p>
          </div>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">{t("Name")}</dt>
              <dd className="mt-1 font-medium text-slate-800">{currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t("E-Mail")}</dt>
              <dd className="mt-1 break-all font-medium text-slate-800">{currentUser?.email || "—"}</dd>
            </div>
          </dl>
        </Card>

        <Card className="space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{t("Sicherheit")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("Passwort für Ihr Konto aktualisieren.")}</p>
          </div>
          <form onSubmit={(event) => void handlePasswordChange(event)} className="space-y-4">
            <Input label={t("Neues Passwort")} type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            <Input label={t("Passwort bestätigen")} type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            <Button type="submit" variant="secondary" disabled={isSaving}>{isSaving ? t("Wird gespeichert…") : t("Passwort ändern")}</Button>
          </form>
        </Card>

        <Card className="flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{t("Sitzung")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("Melden Sie sich auf diesem Gerät ab.")}</p>
          </div>
          <Button type="button" variant="secondary" className="w-fit" disabled={isSigningOut} onClick={() => void handleSignOut()}>
            {isSigningOut ? t("Abmeldung läuft…") : t("Abmelden")}
          </Button>
        </Card>

        {error ? <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{t(error)}</p> : null}
        {saved ? <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{t("Einstellungen gespeichert.")}</p> : null}
      </div>
    </div>
  );
}
