import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">404</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">Seite nicht gefunden</h1>
        <p className="mt-3 text-slate-600">Die gewünschte Seite existiert nicht oder wurde verschoben.</p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          Zurück zum Dashboard
        </Link>
      </div>
    </main>
  );
}
