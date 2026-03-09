# Invoicer — DB Migration + Zod Validation: Functional Specification

## Product Goal

Replace the volatile in-memory store (`globalThis.__invoicer_store__`) with a persistent SQLite
database managed via Drizzle ORM, and add Zod validation to all API route inputs — eliminating
data loss on server restart and standardising input validation across the entire API surface.

---

## Existing Features Referenced

This spec is **additive at the infrastructure layer only**. Every user-visible feature documented
in `PROJECT_CONTEXT.md` is preserved exactly. The following existing systems are **replaced or
modified**; none are removed from the product:

| Existing File | Change |
|---|---|
| `lib/store.ts` | **Deleted.** All callers migrated to `lib/db.ts`. |
| `lib/validate.ts` | **Superseded for API input validation.** Zod schemas replace all `ensureString`, `ensureEmail`, `ensureUuid` calls at route boundaries. `lib/validate.ts` may be retained for any internal non-HTTP use. |
| `lib/auth.ts` | **Modified.** `issueSession`, `requireAuth`, `rotateRefreshToken` rewritten to query SQLite via `db`. |
| `lib/domain.ts` | **Modified.** All store reads/writes replaced with Drizzle queries. |
| `lib/invoices.ts` | **Partially modified.** Pure computation functions (`computeTotals`, `withComputedStatus`, `toSummary`) unchanged. Any store reads removed. |
| Every file in `app/api/**` | **Modified.** Store access replaced with DB queries. `readJsonBody` + custom validator calls replaced with `readJsonBody` + Zod `safeParse`. |

**Existing features not touched by this spec** (no code changes required):
- All UI pages and components (`app/(app)/`, `app/_components/`, `app/_lib/`)
- `lib/pdf.ts` — PDF generation
- `lib/security.ts` — SSRF protection
- `lib/ids.ts`, `lib/time.ts`, `lib/pagination.ts` — utilities unchanged
- `lib/api.ts` — response helpers; a `parseBody()` helper is added (see F6)

---

## User Flows

All user flows are **unchanged**. This migration is transparent to end users. No UI changes,
no new pages, no changed API contracts. The only observable change is that data now persists
across server restarts.

---

## Feature List

---

### F1 — npm Packages Installed

**What done looks like**: The following packages are present in `package.json` and installed
in `node_modules`. No other new runtime dependencies are added.

| Package | Type | Purpose |
|---|---|---|
| `drizzle-orm@^0.38.0` | dependency | ORM query builder + SQLite dialect |
| `better-sqlite3@^11.0.0` | dependency | Synchronous Node.js SQLite driver |
| `zod@^3.24.0` | dependency | Schema validation |
| `drizzle-kit@^0.29.0` | devDependency | Migration CLI (`drizzle-kit generate`, `drizzle-kit migrate`) |
| `@types/better-sqlite3@^7.6.0` | devDependency | TypeScript types for better-sqlite3 |
| `vitest@^2.0.0` | devDependency | Test runner (currently absent from project) |
| `@vitejs/plugin-react@^4.0.0` | devDependency | Vitest React plugin (needed for path alias resolution) |

**Acceptance criteria**:
- `npm install` completes without errors on Node.js 18
- `import Database from 'better-sqlite3'` resolves
- `import { drizzle } from 'drizzle-orm/better-sqlite3'` resolves
- `import { z } from 'zod'` resolves
- `npx drizzle-kit --version` prints a version string

---

### F2 — Drizzle Configuration File

**What done looks like**: `drizzle.config.ts` exists at the project root.

**Acceptance criteria**:
- File exports a valid Drizzle config object (default export)
- `dialect: 'sqlite'`
- `schema: './lib/schema.ts'`
- `out: './drizzle'` (migration output directory)
- `dbCredentials.url` reads from `process.env.DATABASE_URL` with fallback `'./invoicer.db'`

---

### F3 — Drizzle Schema (`lib/schema.ts`)

**What done looks like**: `lib/schema.ts` defines all nine SQLite tables using
`drizzle-orm/sqlite-core`. The file is the single source of truth for table shapes.

**Tables required** (complete column lists in integration-spec.md §Data Models):

| Table | Mirrors |
|---|---|
| `users` | `StoredUser` in `lib/models.ts` |
| `business_profiles` | `BusinessProfile` in `lib/models.ts` — address flattened to columns |
| `clients` | `Client` in `lib/models.ts` — address flattened to columns |
| `invoices` | `StoredInvoice` in `lib/models.ts` — `lineItems` stored as JSON TEXT |
| `payments` | `Payment` in `lib/models.ts` |
| `catalog_items` | `CatalogItem` in `lib/models.ts` |
| `access_tokens` | `AccessTokenRecord` in `lib/models.ts` |
| `refresh_tokens` | `RefreshTokenRecord` in `lib/models.ts` |
| `reset_tokens` | `StoredResetToken` in `lib/models.ts` |

**Acceptance criteria**:
- `npx drizzle-kit generate` runs without errors and writes SQL files to `./drizzle/`
- Generated SQL contains all nine `CREATE TABLE` statements
- Foreign key constraints are generated for all `userId`, `clientId`, `invoiceId` columns
- `users.email` has a UNIQUE constraint
- `business_profiles.user_id` has a UNIQUE constraint (one profile per user)
- `refresh_tokens.token_hash` has a UNIQUE constraint
- `invoices` table has indexes on `(user_id)`, `(client_id)`, and `(user_id, status)`
- `clients` table has an index on `(user_id)`
- `catalog_items` table has an index on `(user_id)`
- `payments` table has an index on `(invoice_id)`

---

### F4 — Database Connection Singleton (`lib/db.ts`)

**What done looks like**: `lib/db.ts` exports a `db` constant that is a Drizzle instance backed
by `better-sqlite3`. The singleton is stored on `globalThis.__invoicer_db__` to survive Next.js
hot-reload re-evaluations.

**Acceptance criteria**:
- `db` is exported as a named export from `lib/db.ts`
- On first access, a `better-sqlite3` Database is opened at `process.env.DATABASE_URL ?? './invoicer.db'`
- `PRAGMA journal_mode = WAL` is executed on the SQLite connection at startup
- `PRAGMA foreign_keys = ON` is executed on the SQLite connection at startup
- `migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') })` is called synchronously at init time, applying any pending migrations
- Subsequent imports of `lib/db.ts` return the same instance (globalThis guard prevents double-init)
- In test environments, callers can supply a `:memory:` Database to `createDb(sqlite)` — the factory function is exported alongside the singleton

---

### F5 — Migration Files

**What done looks like**: `./drizzle/` directory contains at least one SQL migration file
generated by `npx drizzle-kit generate`. The file creates all nine tables with correct
column types, constraints, and indexes.

**Acceptance criteria**:
- `npx drizzle-kit migrate` applies all pending migrations to a fresh SQLite file without errors
- Re-running `npx drizzle-kit migrate` on an already-migrated DB is a no-op (idempotent)
- All nine tables exist after migration with the exact column names documented in F3

---

### F6 — Zod Validation Layer (`lib/validators.ts`)

**What done looks like**: `lib/validators.ts` exports one Zod schema per API input shape.
Every API route that accepts a request body or significant query parameters validates inputs
against the appropriate schema before processing.

**Schemas exported** (full type definitions in integration-spec.md §Zod Schemas):

| Export | Used by route(s) |
|---|---|
| `RegisterSchema` | `POST /api/auth/register` |
| `LoginSchema` | `POST /api/auth/login` |
| `ForgotPasswordSchema` | `POST /api/auth/forgot-password` |
| `ResetPasswordSchema` | `POST /api/auth/reset-password` |
| `ProfilePatchSchema` | `PATCH /api/profile` |
| `ClientCreateSchema` | `POST /api/clients` |
| `ClientPatchSchema` | `PATCH /api/clients/[id]` |
| `InvoiceCreateSchema` | `POST /api/invoices` |
| `InvoicePatchSchema` | `PATCH /api/invoices/[id]` |
| `InvoiceSendSchema` | `POST /api/invoices/[id]/send` |
| `PaymentCreateSchema` | `POST /api/invoices/[id]/payments` |
| `CatalogCreateSchema` | `POST /api/catalog` |
| `CatalogPatchSchema` | `PATCH /api/catalog/[id]` |

A **`parseBody<T>(schema, body)`** helper is added to `lib/api.ts` that calls
`schema.safeParse(body)` and returns either the typed data or a `NextResponse` with status 400
and error code `VALIDATION_ERROR`, including `details: result.error.flatten().fieldErrors`.

**Acceptance criteria**:
- Valid input data passes all schemas without errors
- Invalid input data (missing required fields, wrong types, out-of-range values) fails with
  descriptive `fieldErrors` in the Zod error object
- All routes that previously used `lib/validate.ts` helpers at the request boundary now use
  Zod schemas via `parseBody()`
- Routes return `{ error: { code: "VALIDATION_ERROR", message: "Invalid input.", details: { ... } } }`
  with HTTP 400 for any schema violation
- `email` fields are normalised to lowercase by the schema (`.toLowerCase()` transform)
- `name`, `businessName` fields trim leading/trailing whitespace (`.trim()` transform)
- `currency` / `country` codes are uppercased (`.toUpperCase()` transform)

---

### F7 — Auth Routes Migrated to SQLite

**What done looks like**: All six auth routes read and write token/user records via Drizzle
queries instead of in-memory store arrays.

**Acceptance criteria**:

| Route | Acceptance Criteria |
|---|---|
| `POST /api/auth/register` | Inserts row into `users`; inserts row into `business_profiles` with defaults; inserts access + refresh token rows; returns session cookies. Fails with `EMAIL_TAKEN` / 409 if email already exists in `users`. |
| `POST /api/auth/login` | Reads user row by email; verifies `passwordHash`; inserts new access + refresh token rows; returns session cookies. Fails with `INVALID_CREDENTIALS` / 401 if user not found or hash mismatch. |
| `POST /api/auth/logout` | Reads refresh token from cookie; deletes matching `refresh_tokens` row; deletes matching `access_tokens` row; clears cookies. |
| `POST /api/auth/refresh` | Reads refresh token from cookie; finds matching row in `refresh_tokens` where `usedAt IS NULL AND expiresAt > now`; marks it `usedAt`; inserts new access + refresh token rows; returns new session cookies. Fails with 401 if token not found, already used, or expired. |
| `POST /api/auth/forgot-password` | Reads user row by email; inserts row into `reset_tokens`; returns `{ success: true }` (no email sent — existing known limitation). Returns `{ success: true }` even if email not found (prevents enumeration). |
| `POST /api/auth/reset-password` | Finds `reset_tokens` row where `rawToken` matches and `usedAt IS NULL AND expiresAt > now`; updates `users.passwordHash`; marks `usedAt`; returns `{ success: true }`. Fails with `INVALID_TOKEN` / 400 if token not found, used, or expired. |

- `requireAuth(req)` in `lib/auth.ts` queries `access_tokens` table, returning the `userId`
  associated with the cookie token. Returns 401 if token not found or expired.
- All existing cookie names, TTLs, and formats are preserved (`invoicer_access`, `invoicer_refresh`)

---

### F8 — Invoice Routes Migrated to SQLite

**What done looks like**: All invoice CRUD routes query the `invoices` table via Drizzle.
Invoice totals are still computed by `computeTotals()` from `lib/invoices.ts` (unchanged
pure function). `withComputedStatus()` remains a pure function applied on read.

**Acceptance criteria**:

| Route | Acceptance Criteria |
|---|---|
| `GET /api/invoices` | Queries `invoices` WHERE `userId = ? AND deletedAt IS NULL`; supports `status`, `search` (invoice number or client name), `clientId`, `sortBy`, `sortDir` filters; uses `parsePagination()` for page/limit; applies `withComputedStatus()` on each result; returns `paginatedResponse`. |
| `POST /api/invoices` | Validates with `InvoiceCreateSchema`; verifies `clientId` belongs to user; atomically increments `business_profiles.nextInvoiceNumber` in a SQLite transaction; inserts invoice row with computed totals; returns `successResponse`. |
| `GET /api/invoices/next-number` | Reads `nextInvoiceNumber` from `business_profiles`; returns preview number string without incrementing. |
| `GET /api/invoices/[id]` | Queries invoice by `id` and `userId`; applies `withComputedStatus()`; returns 404 if not found or deleted. |
| `PATCH /api/invoices/[id]` | Validates with `InvoicePatchSchema`; checks invoice is `draft`; updates row in transaction; recomputes totals; returns updated invoice. |
| `DELETE /api/invoices/[id]` | Sets `deletedAt = now()` on `draft` invoice; returns `actionResponse`. 403 if invoice is not draft. |
| `POST /api/invoices/[id]/send` | Validates with `InvoiceSendSchema`; checks status is `draft`; sets `status = 'sent'`, `sentAt = now()`; returns `actionResponse`. |
| `POST /api/invoices/[id]/void` | Checks status is not `paid` or `void`; sets `status = 'void'`; returns `actionResponse`. |
| `POST /api/invoices/[id]/duplicate` | Reads source invoice; inserts new draft invoice with new UUID, new invoice number (atomically incremented), `issueDate = today`, `dueDate = today + defaultPaymentTermsDays`, `status = 'draft'`; returns new invoice. |
| `GET /api/invoices/[id]/pdf` | Reads invoice + client + business profile from DB; calls existing `lib/pdf.ts` unchanged; returns PDF bytes. |

- `invoiceNumber` uniqueness per user is enforced: if a custom `invoiceNumber` is provided in
  `InvoiceCreateSchema`, the route checks for an existing non-deleted invoice with that number
  before inserting. Returns `DUPLICATE_INVOICE_NUMBER` / 409 on conflict.
- All money values stored as integer cents (unchanged)
- `lineItems` stored as JSON TEXT in the `line_items` column

---

### F9 — Payment Routes Migrated to SQLite

**What done looks like**: Payment recording and deletion use the `payments` table; invoice
status is recalculated after each change and written back to `invoices`.

**Acceptance criteria**:

| Route | Acceptance Criteria |
|---|---|
| `GET /api/invoices/[id]/payments` | Queries `payments` WHERE `invoiceId = ?`, ordered by `paidAt DESC, createdAt DESC`; returns `{ data: Payment[] }`. |
| `POST /api/invoices/[id]/payments` | Validates with `PaymentCreateSchema`; checks `amount <= invoice.amountDue`; inserts payment row; recalculates `amountPaid`, `amountDue`, and `status` on the invoice row within a transaction; returns new payment + updated invoice. |
| `DELETE /api/invoices/[id]/payments/[paymentId]` | Deletes payment row; recalculates `amountPaid`, `amountDue`, and `status` on invoice within a transaction; returns `actionResponse`. |

- Payment amount must be > 0 and ≤ `invoice.amountDue` at time of recording; returns 400 otherwise
- Status recalculation rules (unchanged from existing logic):
  - `amountPaid === 0` → status stays `sent`
  - `0 < amountPaid < total` → `partial`
  - `amountPaid >= total` → `paid`; `paidAt` set to payment's `paidAt`

---

### F10 — Client Routes Migrated to SQLite

**What done looks like**: All client routes query the `clients` table. Aggregate stats
(totalInvoiced, totalPaid, totalOutstanding) are computed via Drizzle aggregation queries
on the `invoices` and `payments` tables.

**Acceptance criteria**:

| Route | Acceptance Criteria |
|---|---|
| `GET /api/clients` | Queries `clients` WHERE `userId = ?`; supports `search` on `name`, `company`, `email`; returns paginated response. |
| `POST /api/clients` | Validates with `ClientCreateSchema`; inserts client row; returns new client. |
| `GET /api/clients/[id]` | Queries client + aggregated stats; 404 if not found or wrong user. |
| `PATCH /api/clients/[id]` | Validates with `ClientPatchSchema`; updates client row; returns updated client. |
| `DELETE /api/clients/[id]` | Checks for non-void, non-deleted invoices with `clientId`; returns `CLIENT_HAS_INVOICES` / 409 if found; otherwise deletes client row. |
| `GET /api/clients/[id]/invoices` | Queries `invoices` WHERE `clientId = ? AND userId = ? AND deletedAt IS NULL`; supports `status` filter; returns paginated response with `withComputedStatus()` applied. |

- `GET /api/clients/[id]` stats are computed in a single query or two aggregate queries — not
  by loading all invoices into memory
- `lastInvoiceDate` is the `issueDate` of the most recent non-deleted invoice for the client

---

### F11 — Catalog Routes Migrated to SQLite

**What done looks like**: All catalog routes query the `catalog_items` table.

**Acceptance criteria**:

| Route | Acceptance Criteria |
|---|---|
| `GET /api/catalog` | Queries `catalog_items` WHERE `userId = ?`; supports `search` on `name`, `description`; ordered by `name ASC`; returns `{ data: CatalogItem[] }`. |
| `POST /api/catalog` | Validates with `CatalogCreateSchema`; counts existing items for user; returns `CATALOG_LIMIT_EXCEEDED` / 400 if count >= 500; inserts item; returns new item. |
| `PATCH /api/catalog/[id]` | Validates with `CatalogPatchSchema`; checks ownership; updates row; returns updated item. |
| `DELETE /api/catalog/[id]` | Checks ownership; deletes row; returns `actionResponse`. |

---

### F12 — Profile Routes Migrated to SQLite

**What done looks like**: Profile routes read and write the `business_profiles` table.

**Acceptance criteria**:

| Route | Acceptance Criteria |
|---|---|
| `GET /api/profile` | Queries `business_profiles` WHERE `userId = ?`; returns profile. |
| `PATCH /api/profile` | Validates with `ProfilePatchSchema`; updates `business_profiles` row; returns updated profile. |
| `POST /api/profile/logo` | Reads multipart body; validates MIME type (image/jpeg or image/png) and size (≤ 2MB); updates `logoUrl` on `business_profiles` row with stub CDN URL; returns updated profile. (Logo upload remains stubbed — file bytes discarded.) |
| `DELETE /api/profile/logo` | Sets `business_profiles.logoUrl = NULL`; returns updated profile. |

---

### F13 — Dashboard Stats Route Migrated to SQLite

**What done looks like**: `GET /api/dashboard/stats` computes aggregates via SQL queries
instead of iterating in-memory arrays.

**Acceptance criteria**:
- `totalOutstanding` = `SUM(amount_due)` WHERE `status IN ('sent','partial')` AND `currency = defaultCurrency` AND `deletedAt IS NULL`
- `totalOverdue` = `SUM(amount_due)` WHERE `status IN ('sent','partial')` AND `due_date < today` AND `currency = defaultCurrency` AND `deletedAt IS NULL`
- `paidThisMonth` = `SUM(amount)` from `payments` JOIN `invoices` WHERE `paid_at BETWEEN first-of-month AND last-of-month` AND `invoices.currency = defaultCurrency`
- `recentInvoices` = 5 most recent non-deleted invoices by `createdAt DESC`, with `withComputedStatus()` applied
- `overdueInvoices` = all invoices WHERE computed status is overdue (i.e., `status IN ('sent','partial')` AND `dueDate < today`), ordered by `dueDate ASC`

---

### F14 — Vitest Configuration

**What done looks like**: `vitest.config.ts` exists at the project root, enabling the
`npm test` or `npx vitest` command to discover and run tests in the `tests/` directory.

**Acceptance criteria**:
- `npx vitest run` executes all files matching `tests/**/*.test.ts`
- `@/` path alias resolves to the project root (matches `tsconfig.json`)
- `environment: 'node'` (no DOM)
- No test file requires browser APIs

---

### F15 — `lib/store.ts` Deleted

**What done looks like**: The file `lib/store.ts` no longer exists. No file in the project
imports from `@/lib/store`.

**Acceptance criteria**:
- `grep -r "from.*lib/store"` returns no results in the project (excluding `node_modules`)
- `grep -r "__invoicer_store__"` returns no results (excluding `node_modules`)
- TypeScript compilation (`npx tsc --noEmit`) passes without errors

---

## Out of Scope

The following are **explicitly excluded** from this migration:

- UI changes — no page or component files are modified
- New API endpoints — no routes are added
- Email delivery — `POST /api/auth/forgot-password` continues to generate tokens but not send them
- Real file storage — logo upload remains stubbed; no S3 or filesystem storage
- Per-user password salt — `crypto.scryptSync(pwd, "invoicer-salt", 64)` hardcoded salt is **not** fixed in this task
- Auth middleware (`middleware.ts`) — unauthenticated users still receive API errors rather than redirects
- Rate limiting
- Multi-user / team support
- Advanced PDF rendering
- Address settings form bug (city/state/postalCode not bound) — existing known issue, not fixed here
- Currency conversion for dashboard multi-currency aggregation
- Token cleanup job — expired tokens will accumulate; a periodic DELETE is out of scope
- Vercel production deployment — local SQLite does not persist across Vercel cold starts; migrating to Turso/libSQL is a separate task

---

## Open Questions

1. **Vercel persistence**: Local SQLite (`./invoicer.db`) is written to the filesystem. Vercel's
   serverless functions share no persistent filesystem across invocations. Data WILL be lost on
   Vercel after this migration unless the deploy target is changed or a remote SQLite service
   (e.g., Turso) is adopted. This spec targets local SQLite only. Stakeholder decision required
   before production deploy.

2. **Auth token storage**: This spec persists all tokens (access, refresh, reset) in SQLite.
   Every authenticated request now performs one synchronous DB read (`requireAuth`). For very
   high-traffic scenarios this may add latency. Acceptable for single-user SaaS; revisit if
   multi-user is introduced.

3. **`lib/validate.ts` fate**: Should `lib/validate.ts` be deleted entirely once all routes use
   Zod, or retained for potential internal use? This spec does not delete it. If deletion is
   desired, a follow-up task is required to audit all non-route usages.

4. **Migration runner in production**: Migrations are run synchronously in `lib/db.ts` on first
   DB access. For long-running deployments this is fine. If migrations are to be run as a
   separate deployment step, `lib/db.ts` should be changed to skip auto-migration and a
   separate `scripts/migrate.ts` entry point added. Decision required before production launch.
