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

Kopieren Sie die Beispiel-Datei und ergänzen Sie die Werte:

```bash
cp .env.example .env.local
```

Beispiel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Supabase Setup

1. Erstellen Sie ein neues Supabase-Projekt.
2. Öffnen Sie die SQL-Editor-Oberfläche in Supabase.
3. Führen Sie alle SQL-Anweisungen aus `supabase/schema.sql` aus.
4. Aktivieren Sie in Supabase Auth die gewünschte E-Mail-Authentifizierung.
5. Setzen Sie die Projekt-URL und den anon key in `.env.local`.

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
2. Fügen Sie die Umgebungsvariablen aus `.env.example` hinzu.
3. Deployen Sie das Projekt.
4. Aktivieren Sie die Production-Environment-Variablen.

## Demo-Login

Für die lokale Vorschau ist ein Demo-User hinterlegt:

- E-Mail: `owner@sauberplus.ch`
- Passwort: `cleanflow123`

## Zukünftige Stripe Integration

Die Architektur ist bereits auf SaaS- und Billing-Features vorbereitet. Später können Sie Stripe Checkout, Customer Portal und Abonnementstatus sauber ergänzen. Das Billing-UI zeigt bewusst einen "Noch nicht eingerichtet"-Zustand an, bis Stripe konfiguriert ist.

## Sicherheit

- Die App ist multi-tenant vorbereitet und trennen Organisationen sauber.
- RLS-Policies sind in `supabase/schema.sql` vorbereitet.
- In Produktion sollten nur Supabase-Authentifizierung und echte Datenbankzugriffe verwendet werden.
