# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Next.js Version

This project uses **Next.js 16**, which has breaking API changes vs earlier versions. Check `node_modules/next/dist/docs/` for authoritative API behavior before writing any Next.js-specific code.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npx tsc --noEmit # Type-check without emitting
```

No lint or test scripts are configured yet.

## Architecture

### Route Groups (Next.js App Router)

- `src/app/(auth)/` — Public routes (login page). No auth required.
- `src/app/(dashboard)/` — Protected routes. Auth guard is in `src/app/(dashboard)/layout.tsx`, which redirects to `/login` if no session and passes `role`, `userEmail`, and `alertCount` to `<Sidebar>`.

### Proxy (formerly Middleware)

Next.js 16 renamed `middleware` to `proxy`. The file `src/proxy.ts` exports `proxy` + `config` and is the official convention — Next.js picks it up automatically. It contains redirect rules: unauthenticated → `/login`, authenticated at `/` or `/login` → `/dashboard`. Do NOT rename this to `middleware.ts`.

### Data Layer: Server Actions + targeted Route Handlers

Most database access goes through Server Actions in `src/lib/actions/`. Pages are Server Components that call these actions directly — there are no API routes or client-side fetching for CRUD. One action file per domain: `employees.ts`, `vehicles.ts`, `documents.ts`, `alerts.ts`, `maintenance.ts`, `mileage.ts`, `calendar.ts`, `search.ts`, `trash.ts`, `document-types.ts`.

Route Handlers (`src/app/api/`) exist only for endpoints that need to stream binary:

- `GET /api/pdf/[entityType]/[entityId]` — Generates and streams the consolidated PDF. Auth required (Supabase session cookie).

All actions return a consistent envelope: `{ data?, error? }` or `{ error? }`. Callers check `error` before using `data`.

After mutations, actions call `revalidatePath()` to invalidate the relevant Next.js cache segments.

### Supabase Clients

- `src/lib/supabase/server.ts` — Use in Server Components, Server Actions, and layouts. Uses `@supabase/ssr` with `cookies()`.
- `src/lib/supabase/client.ts` — Use in Client Components only. Uses `createBrowserClient`.

Never use the server client in a Client Component or the browser client in a Server Action.

### Shared Types

`src/types/database.ts` — Single source of truth for all DB entity types and status enums. Import from here; do not redefine types locally.

### Status Color System

`src/lib/utils/status.ts` — `getDocumentStatus()` returns a `StatusColor` (`'green' | 'yellow' | 'red' | 'blue' | 'gray'`). `STATUS_CLASSES` maps colors to Tailwind classes. Use `<StatusBadge>` component for rendering. Thresholds: expired → red, <7 days → red, <30 days → yellow, ≥30 days → green, `sin_vencimiento` → blue.

## Key Patterns

### Soft Delete

Every mutable entity has `deleted_at: string | null`. Queries must always include `.is('deleted_at', null)` to exclude deleted records. Soft-deleting sets `deleted_at` to `new Date().toISOString()`.

### Document Versioning

When a document of a given `type_id` already exists for an entity:
1. Archive old document: `is_current: false`
2. Insert new document with incremented `version` and `is_current: true`

When soft-deleting a document, restore the previous version by finding the highest `version` with `deleted_at` null and setting it to `is_current: true`. See `src/lib/actions/documents.ts`.

### File Uploads (Storage)

Single Supabase bucket: `documents`. Storage paths follow the pattern `{entityType}s/{documentId}/{uuid}.{ext}`. Allowed types: PDF, JPG, PNG. Max size: 20 MB. Files use signed URLs (1-hour expiry) via `getFileUrl()`. If DB insert fails after upload, the file is removed from storage to avoid orphans.

### Forms

Server Actions accept `FormData` (not JSON). Forms use `react-hook-form` + `zod` on the client side for validation UX, but all business logic and validation is re-validated in the Server Action.

### Role-Based Access

Roles: `'admin'` | `'reader'`. Role is stored in the `profiles` table (linked to `auth.users`). The dashboard layout reads the role and passes it down. Reader role is read-only — enforce this in Server Actions by checking the role before writes.

### Alert Generation

`generateAlertsFromDocuments()` in `src/lib/actions/alerts.ts` scans employee and vehicle documents expiring within 30 days and inserts `alerts` rows, skipping any entity already with a pending alert. Currently triggered manually — no cron is wired yet (Phase 3).

### Consolidated PDF generation

`src/lib/pdf/consolidated.ts` uses `pdf-lib` to assemble a single PDF per employee/vehicle: cover (Basani header, entity title, status, info block), index of vigent documents, then a separator page + the original file pages for each document. PDFs are copied with `copyPages`; JPG/PNG are embedded as full-page images. Storage files are downloaded from the `documents` bucket via the server Supabase client. Failed files are silently skipped to keep the output usable. The `<ConsolidatedPdfButton>` client fetches the route handler and triggers a browser download via blob URL.

### Kilometraje validations

`createMileageLog()` in `src/lib/actions/mileage.ts` rejects: missing vehicle, vehicle deleted/inexistent, km < último registro del vehículo (cuando el período candidato es ≥ al último registrado), duplicate `(vehicle_id, mes, anio)` (DB unique constraint, error code 23505). The form is in the `/mileage` page (admin only).

## Key Libraries

- `date-fns` — all date arithmetic and formatting
- `lucide-react` — icons
- `react-hook-form` + `zod` — client-side form validation
- `@supabase/ssr` — Supabase auth with cookie-based sessions
- `pdf-lib` — server-side PDF assembly (cover, index, page copying, image embedding)

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Database

SQL files are in `supabase/`: `schema.sql`, `rls.sql`, `seed.sql`. Apply them in Supabase Studio or via the Supabase CLI. RLS policies are in `rls.sql` — always verify RLS is consistent when adding new tables.

## Implementation Status

**Phase 1 — Complete:** Auth, Dashboard (with monthly calendar), Employees (CRUD + documents + version history), Vehicles (CRUD + documents + driver history + maintenance tab), Alerts, Papelera (soft delete with 30-day retention + manual cleanup), Global search, Settings (document types CRUD).

**Phase 2 — Complete:** Maintenance (events CRUD + global/individual rules in settings + vehicle tab), Mileage (manual logging with regression validation + uniqueness per month/vehicle), Calendar dedicated page (`/calendar`), Consolidated PDF (`pdf-lib`-based, route handler at `/api/pdf/...`).

**Phase 3 — Not started:** Excel import/export, Vercel Cron wiring for alert-generation + trash-cleanup endpoints.
