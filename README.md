# CleanFlow

CleanFlow ist eine moderne SaaS-Web-App für kleine und mittlere Reinigungsfirmen in der Schweiz. Die Anwendung verwaltet Kunden, Mitarbeiter, Aufträge und die Tagesplanung zentral in einer klaren, professionellen Oberfläche.

## Voraussetzungen

- Node.js 20+
- npm 10+
- ein Supabase-Projekt für echte Datenbank- und Auth-Integration

## Installation

```bash
npm install
```

## Environment Variables

Kopieren Sie die Beispiel-Datei und tragen Sie die Werte aus Ihrem Supabase-Projekt ein:

```powershell
Copy-Item .env.example .env.local
```

Der Code verwendet `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` für Browser-, Server- und Proxy-Clients. `NEXT_PUBLIC_APP_URL` ist für Deployment-Konfiguration dokumentiert, wird derzeit aber nicht vom Anwendungscode gelesen. `SUPABASE_SERVICE_ROLE_KEY` wird ebenfalls derzeit nicht verwendet; tragen Sie ihn nicht im Browser ein und benennen Sie ihn niemals mit dem Präfix `NEXT_PUBLIC_`.

## Supabase Setup

1. Erstellen Sie ein neues Supabase-Projekt.
2. Öffnen Sie die SQL-Editor-Oberfläche in Supabase.
3. Führen Sie den vollständigen Inhalt aus `supabase/schema.sql` einmal im SQL Editor aus. Die gleichwertige Migration liegt unter `supabase/migrations/001_create_cleanflow_schema.sql`.
4. Bei einem bereits eingerichteten Projekt führen Sie zusätzlich `supabase/migrations/003_fix_registration_rls.sql` im Supabase SQL Editor aus.
5. Aktivieren Sie in Supabase Auth die E-Mail-Authentifizierung. Bei aktivierter E-Mail-Bestätigung bestätigen neue Benutzer zunächst ihre E-Mail und melden sich anschließend an; die Organisation wird beim ersten Login erstellt.
6. Setzen Sie Project URL und Publishable Key in `.env.local` und starten Sie den Entwicklungsserver neu.

## Datenbank Migration

```bash
# Wenn Sie Supabase CLI verwenden
supabase db push
```

## Local Development

```bash
npm run dev
```

Öffnen Sie danach:

- http://localhost:3000

## Production Deployment

### Vercel

1. Importieren Sie das Repository in Vercel.
2. Setzen Sie `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` und `NEXT_PUBLIC_APP_URL` vor dem Build in den Vercel-Environment-Variablen.
3. Deployen Sie das Projekt.
4. Aktivieren Sie die Production-Environment-Variablen.

## Zukünftige Stripe Integration

Die Architektur ist bereits auf SaaS- und Billing-Features vorbereitet. Später können Sie Stripe Checkout, Customer Portal und Abonnementstatus sauber ergänzen. Das Billing-UI zeigt bewusst einen "Noch nicht eingerichtet"-Zustand an, bis Stripe konfiguriert ist.

## Sicherheit

- Kunden, Mitarbeiter und Aufträge sind durch RLS auf Mitgliedschaften der eigenen Organisation beschränkt.
- Jobs können per Foreign Key nur Kunden und Mitarbeiter derselben Organisation referenzieren.
- Bei fehlender Supabase-URL oder Publishable Key zeigt CleanFlow einen Konfigurationshinweis statt Demo-Daten.
- Der Service-Role-Key wird von CleanFlow nicht benötigt und darf niemals an den Client gelangen.
