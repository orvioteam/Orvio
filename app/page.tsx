import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CalendarDays, Users } from "lucide-react";

const features = [
  { icon: CalendarDays, title: "Aufträge planen", text: "Termine, Zeiten und Einsatzorte in einer klaren Tagesübersicht bündeln." },
  { icon: Users, title: "Teams einteilen", text: "Teams und Zuständigkeiten für jeden Auftrag einfach im Blick behalten." },
  { icon: BriefcaseBusiness, title: "Kunden verwalten", text: "Kontaktdaten und Einsatzinformationen zentral auffinden." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f7f4] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="CleanFlow Startseite">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#176b4a] text-xs font-semibold tracking-wide text-white">CF</span>
            <span className="text-base font-semibold tracking-tight">CleanFlow</span>
          </Link>
          <nav aria-label="Hauptnavigation" className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <a href="#funktionen" className="hover:text-slate-900">Funktionen</a>
            <a href="#ablauf" className="hover:text-slate-900">So funktioniert es</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="hidden min-h-10 items-center rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 min-[360px]:inline-flex">Anmelden</Link>
            <Link href="/register" className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#176b4a] px-3.5 text-sm font-medium text-white hover:bg-[#11563b] sm:px-4">Kostenlos starten</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:py-28">
        <div className="max-w-2xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#176b4a]">Einsatzplanung für mobile Teams</p>
          <h1 className="text-4xl font-semibold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.7rem]">
            Aufträge einfach planen.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            CleanFlow bringt Kunden, Mitarbeitende und Einsätze an einem Ort zusammen – einfach, übersichtlich und ohne unnötigen Aufwand.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#176b4a] px-5 text-sm font-medium text-white hover:bg-[#11563b]">
              Kostenlos starten <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Anmelden
            </Link>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Entwickelt für Reinigungsunternehmen – gemacht für Teams mit täglichen Einsätzen.</p>
        </div>

        <div aria-label="Auftragsübersicht mit Einsatz-, Kunden- und Teamdaten" className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Arbeitsbereich</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">Auftragsübersicht</h2>
            </div>
            <span className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">Tagesplan</span>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { icon: CalendarDays, title: "Einsätze nach Zeit", detail: "Datum und Zeitfenster im Überblick" },
              { icon: BriefcaseBusiness, title: "Kunden und Einsatzorte", detail: "Wichtige Angaben direkt beim Auftrag" },
              { icon: Users, title: "Zuständiges Team", detail: "Teams einfach zuordnen" },
            ].map(({ icon: Icon, title, detail }) => (
              <div key={title} className="flex items-center gap-4 py-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#f4f5f1] text-[#176b4a]">
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{title}</p>
                  <p className="mt-1 text-xs text-slate-500">{detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 border-t border-slate-200 pt-4 text-xs text-slate-500">Zeit, Auftrag und Zuständigkeit auf einen Blick.</div>
        </div>
      </section>

      <section id="funktionen" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#176b4a]">WENIGER SUCHEN. KLARER PLANEN.</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Das Wesentliche für Ihren Arbeitsalltag.</h2>
          </div>
          <div className="mt-9 grid gap-8 md:grid-cols-3 md:gap-10">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="border-t border-slate-200 pt-5">
                <Icon className="h-5 w-5 text-[#176b4a]" strokeWidth={1.8} />
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="ablauf" className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-14 sm:px-8 sm:py-16 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ein klarer Ablauf. Ein gemeinsamer Überblick.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">Kunden erfassen, Mitarbeitende zuordnen und Aufträge für den Tag planen – ohne unnötige Umwege.</p>
        </div>
        <Link href="/register" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-[#176b4a] px-5 text-sm font-medium text-white hover:bg-[#11563b]">
          CleanFlow starten <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-sm text-slate-500 sm:px-8 md:flex-row md:items-center md:justify-between">
          <span className="font-medium text-slate-700">CleanFlow</span>
          <span>Aufträge einfach planen.</span>
        </div>
      </footer>
    </main>
  );
}
