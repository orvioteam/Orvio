import Link from "next/link";
import { ArrowRight } from "lucide-react";

const appointments = [
  { time: "09:00", customer: "Muster AG", service: "Unterhaltsreinigung", employee: "Anna" },
  { time: "13:30", customer: "Beispiel GmbH", service: "Grundreinigung", employee: "Marco" },
  { time: "18:00", customer: "Privatkunde", service: "Reinigung", employee: "Luca" },
];

const benefits = [
  { title: "Aufträge", description: "Zeit und Ort auf einen Blick." },
  { title: "Mitarbeiter", description: "Jeder Einsatz hat eine klare Zuständigkeit." },
  { title: "Kunden", description: "Alle wichtigen Informationen direkt beim Auftrag." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f7f4] text-slate-900">
      <header className="bg-[#f7f7f4]">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5" aria-label="CleanFlow Startseite">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-[#176b4a] text-[11px] font-semibold tracking-wide text-white">CF</span>
            <span className="text-base font-semibold tracking-tight">CleanFlow</span>
          </Link>
          <nav aria-label="Konto" className="flex items-center gap-1 sm:gap-5">
            <Link href="/login" className="inline-flex min-h-10 items-center px-1 text-xs font-medium text-slate-700 hover:text-[#14563c] sm:px-2 sm:text-sm">Anmelden</Link>
            <Link href="/register" className="inline-flex min-h-10 items-center justify-center rounded bg-[#176b4a] px-2.5 text-xs font-medium text-white hover:bg-[#11563b] sm:px-4 sm:text-sm">Kostenlos starten</Link>
          </nav>
        </div>
      </header>

      <section className="px-5 pb-10 pt-12 text-center sm:px-8 sm:pb-14 sm:pt-16 lg:pt-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-[#176b4a] sm:text-xs">Einsatzplanung für mobile Teams</p>
          <h1 className="mt-5 text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[4.25rem]">
            Aufträge einfach planen.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8">
            CleanFlow bringt Kunden, Mitarbeitende und Einsätze an einem Ort zusammen.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 min-[380px]:flex-row">
            <Link href="/register" className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-[#176b4a] px-5 text-sm font-medium text-white hover:bg-[#11563b]">
              Kostenlos starten <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded px-5 text-sm font-medium text-slate-700 hover:bg-white">
              Anmelden
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Produktvorschau" className="px-4 pb-14 sm:px-8 sm:pb-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Visuelle Produktvorschau</p>
          <div className="overflow-hidden border border-slate-200/80 bg-white">
            <div className="flex min-h-14 items-center justify-between gap-2 border-b border-slate-200/80 px-3 sm:gap-4 sm:px-7">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-[#176b4a] text-[9px] font-semibold text-white">CF</span>
                <span className="text-xs font-semibold tracking-tight text-slate-800">CleanFlow</span>
              </div>
              <nav aria-label="Vorschau-Navigation" className="flex items-center gap-2 text-[9px] text-slate-500 sm:gap-6 sm:text-xs">
                <span className="border-b-2 border-[#176b4a] py-[1.15rem] font-medium text-[#14563c]">Heute</span>
                <span>Aufträge</span>
                <span>Kunden</span>
                <span>Mitarbeiter</span>
              </nav>
            </div>

            <div className="px-4 py-6 sm:px-8 sm:py-8">
              <div className="mb-4 flex items-end justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Heute</h2>
                  <p className="mt-1 text-xs text-slate-500">Tagesplanung</p>
                </div>
                <span className="text-xs text-slate-500">3 Aufträge</span>
              </div>
              <div>
                {appointments.map((appointment) => (
                  <article key={appointment.time} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3 border-b border-slate-100 py-4 last:border-b-0 sm:grid-cols-[5rem_minmax(0,1fr)_7rem] sm:items-center sm:gap-5 sm:py-[1.15rem]">
                    <time className="pt-0.5 text-sm font-medium tabular-nums text-slate-800 sm:pt-0">{appointment.time}</time>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{appointment.customer}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{appointment.service}</p>
                    </div>
                    <span className="col-start-2 mt-2 text-xs text-slate-600 sm:col-start-auto sm:mt-0 sm:text-right">{appointment.employee}</span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Produktvorteile" className="px-5 pb-14 sm:px-8 sm:pb-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-slate-200 border-y border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="py-4 sm:px-6 sm:py-5 first:sm:pl-0 last:sm:pr-0">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#176b4a]">{benefit.title}</h2>
              <p className="mt-2 text-sm leading-5 text-slate-700">{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 sm:pb-20">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-5 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:pt-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Aufträge. Teams. Heute.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Mit CleanFlow behalten Sie Ihre täglichen Einsätze im Blick.</p>
          </div>
          <Link href="/register" className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded bg-[#176b4a] px-5 text-sm font-medium text-white hover:bg-[#11563b] sm:w-auto">
            Kostenlos starten <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="font-medium text-slate-700">CleanFlow</span>
          <span>Einsatzplanung für mobile Teams.</span>
        </div>
      </footer>
    </main>
  );
}
