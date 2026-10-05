import Link from "next/link";
import { ArrowRight, BarChart3, CalendarRange, CheckCircle2, ShieldCheck, Users } from "lucide-react";

const features = [
  { icon: CalendarRange, title: "Aufträge planen", text: "Tagesübersicht mit Kunden, Mitarbeitern und klaren Zeitfenstern." },
  { icon: Users, title: "Mitarbeiter organisieren", text: "Mitarbeiterprofil, Status und Einsatzplanung an einem Ort." },
  { icon: BarChart3, title: "Kunden verwalten", text: "Kontaktinformationen, Aufträge und Notizen immer zentral verfügbar." },
];

const steps = [
  { title: "Kunden hinzufügen", text: "Kontakte und Adressen sichern." },
  { title: "Mitarbeiter hinzufügen", text: "Mitarbeiter mit Status und Informationen pflegen." },
  { title: "Aufträge planen", text: "Ziele, Zeiten und Standorte festlegen." },
  { title: "Alles auf einen Blick", text: "Heute, Organisation und Tagesplan ohne Chaos." },
];

export default function HomePage() {
  return (
    <main className="bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white">C</div>
            <div>
              <p className="text-lg font-semibold">CleanFlow</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#problem">Warum CleanFlow</a>
            <a href="#features">Funktionen</a>
            <a href="#how-it-works">So funktioniert es</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Anmelden</Link>
            <Link href="/register" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">Kostenlos starten</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Reinigungsfirma Software Schweiz
          </div>
          <div className="space-y-5">
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl">
              Reinigungsfirma organisieren. <span className="text-emerald-600">Ohne Excel. Ohne Chaos.</span>
            </h1>
            <p className="max-w-xl text-lg text-slate-600">
              CleanFlow hilft Reinigungsfirmen dabei, Kunden, Mitarbeiter und Einsätze an einem Ort zu verwalten und den Tagesplan immer im Blick zu behalten.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-medium text-white hover:bg-emerald-500">
              Kostenlos starten
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-base font-medium text-slate-700 hover:bg-slate-50">
              Anmelden
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Heute</p>
                <h2 className="text-xl font-semibold text-slate-900">Übersicht</h2>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">5 Aufträge</span>
            </div>
            <div className="space-y-3">
              {[
                { time: "08:00", name: "Luca Müller", company: "Müller AG", status: "Geplant" },
                { time: "10:30", name: "Sara Meier", company: "Keller Privat", status: "Geplant" },
                { time: "13:00", name: "Luca Müller", company: "Meier GmbH", status: "In Bearbeitung" },
              ].map((item) => (
                <div key={item.time} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{item.time}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.company}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="problem" className="mx-auto max-w-6xl px-6 py-8 md:py-16">
        <div className="mb-10 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Warum CleanFlow?</p>
          <h2 className="mt-4 text-3xl font-semibold text-slate-900">Weniger Chaos, mehr Kontrolle.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            "Keine Excel-Listen",
            "Keine WhatsApp-Chaos",
            "Keine Zettelwirtschaft",
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-lg font-semibold text-slate-900">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Funktionen</p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-900">Alles, was eine moderne Reinigungsfirma braucht.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">So funktioniert es</p>
          <h2 className="mt-4 text-3xl font-semibold text-slate-900">Von der ersten Kundendatenbank bis zu einem klaren Tagesplan.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">{index + 1}</span>
              <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-emerald-600 py-16 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-semibold">Bereit für weniger Chaos?</h2>
          <p className="mt-3 text-emerald-50">Starten Sie mit CleanFlow und behalten Sie Ihre Firma immer im Blick.</p>
          <div className="mt-6 flex justify-center">
            <Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-base font-medium text-emerald-700 hover:bg-slate-100">
              Kostenlos starten
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-base font-semibold text-slate-900">CleanFlow</p>
        </div>
        <div className="flex gap-4">
          <a href="#">Über</a>
          <a href="#">Kontakt</a>
          <a href="#">Datenschutz</a>
          <a href="#">Impressum</a>
        </div>
      </footer>
    </main>
  );
}
