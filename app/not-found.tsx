import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f4] p-5">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 text-center sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#176b4a]">404</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">Seite nicht gefunden</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Die gewünschte Seite existiert nicht oder wurde verschoben.</p>
        <Link href="/dashboard" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#176b4a] px-4 py-2 text-sm font-medium text-white hover:bg-[#11563b]">
          Zurück zum Dashboard
        </Link>
      </div>
    </main>
  );
}
