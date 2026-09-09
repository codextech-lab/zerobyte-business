# Zerøbyte Business

Zerøbyte Business is a polished V1 foundation for small teams who need one calm workspace for daily operations: inventory, customers, sales, receipts, invoices, expenses, and reports.

## Run locally

```bash
npm install
npm run check:env
npm run dev
```

For a fresh checkout, copy `.env.example` to `.env.local`, add the project URL and publishable/anon key, then run `npm run check:env`. `.env.local` is ignored by Git. The app runs in clearly labeled **local demo mode** when Supabase variables are empty. When configured, it shows **Supabase configured · demo fixtures**: the client is ready, but the current dashboard and feature tables still render local fixtures and do not claim that demo edits were persisted.

## Supabase setup

1. Create a Supabase project.
2. Apply the migrations in `supabase/migrations/` with the Supabase CLI or SQL editor.
3. Deploy `supabase/functions/create-sale` with `supabase functions deploy create-sale`.
4. Configure the environment variables in your local or hosted environment.
5. Set `VITE_ADMIN_EMAILS` to the approved platform admin addresses for the dedicated admin console route.

With an authorized Supabase CLI session and a linked project:

```bash
npm run supabase:push
npm run supabase:functions:deploy
```

`supabase status` may report a Docker warning on machines without Docker; that only affects local Supabase containers. Remote migration push and Edge Function deployment do not require starting the local stack.

The schema is organization-scoped, uses RLS policies for member access, records sale mutations in `audit_logs`, provides notifications and entitlements tables, and performs inventory-safe sale creation through a transactional Postgres function. The repo also includes a platform-admin console schema (`platform_admin_access`, `admin_audit_logs`, `admin_notifications`) with clear separation from business roles. Keep service-role credentials server-side; this client only uses the publishable anon key.

## Admin console

The repository includes a dedicated `admin.html` application entry plus the protected `/admin` route. Run the user app at `http://localhost:5173/` and the admin console at `http://localhost:5173/admin.html` (or `http://localhost:5173/admin`). The admin console requires an authenticated user whose email is listed in `VITE_ADMIN_EMAILS` and whose `platform_admin_access` row is active. The admin entry uses a separate browser session namespace, so a normal user account can remain signed in while an approved administrator signs in on the same device. This is a platform-level control plane, not a normal user dashboard. Business ownership, workers, and organization memberships do not grant platform-admin access. Users who are not explicitly approved are denied access even if they can navigate to the admin URL directly.

For separate hosting, deploy the same production output to two sites: configure the user site to serve `index.html` and the admin site to serve `admin.html`. Both sites share the same Supabase project, while the admin site remains protected by the server-side platform-admin checks used by the Edge Functions and database RPCs.

The included GitHub Pages workflow publishes both entry points from one Pages deployment:

- User app: `https://codextech-lab.github.io/zerobyte-business/`
- Admin console: `https://codextech-lab.github.io/zerobyte-business/admin.html`

Configure the repository Actions secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_ADMIN_EMAILS` before deploying.

## Architecture

`src/lib/types.ts` is the shared domain contract, `src/lib/demoData.ts` contains intentionally local demo fixtures, and `src/lib/supabase.ts` is the single client/config boundary. Feature surfaces are rendered from `src/App.tsx` and are ready to split into route-level components as auth and persistence are connected. The deployed `create-sale` function is the persistence path for transactional sales once authenticated organization data is wired into the UI. Payments are intentionally not implemented.
