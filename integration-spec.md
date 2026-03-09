# Invoicer — DB Migration + Zod Validation: Integration Specification

## Overview

This document is the complete technical contract for replacing `globalThis.__invoicer_store__`
with SQLite + Drizzle ORM and adding Zod validation to all API inputs.

**Legend**:
- **NEW** — file does not currently exist; must be created
- **MODIFIED** — file exists; implementation must be rewritten against DB
- **DELETED** — file must be removed; all callers migrated

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | No | `./invoicer.db` | Absolute or relative path to the SQLite file. In CI use `:memory:` or a temp path. In development, defaults to project root. |

No other environment variables are added by this task.

---

## New Files

### `lib/schema.ts` — NEW

Drizzle table definitions. Single source of truth for all table shapes.

```typescript
import {
  sqliteTable, text, integer, real,
  index, uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import type { LineItem } from '@/lib/models'

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id:           text('id').primaryKey(),
  email:        text('email').notNull().unique(),
  name:         text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt:    text('created_at').notNull(),
  updatedAt:    text('updated_at').notNull(),
})

// ── Business Profiles ─────────────────────────────────────────────────────────
// Address is flattened to columns (no JSON object).
export const businessProfiles = sqliteTable('business_profiles', {
  id:                      text('id').primaryKey(),
  userId:                  text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  businessName:            text('business_name').notNull(),
  logoUrl:                 text('logo_url'),
  addressLine1:            text('address_line1'),
  addressLine2:            text('address_line2'),
  addressCity:             text('address_city'),
  addressState:            text('address_state'),
  addressPostalCode:       text('address_postal_code'),
  addressCountry:          text('address_country'),
  phone:                   text('phone'),
  email:                   text('email'),
  website:                 text('website'),
  taxId:                   text('tax_id'),
  defaultCurrency:         text('default_currency').notNull().default('USD'),
  defaultPaymentTermsDays: integer('default_payment_terms_days').notNull().default(30),
  defaultTaxRate:          real('default_tax_rate'),
  defaultNotes:            text('default_notes'),
  defaultTerms:            text('default_terms'),
  invoicePrefix:           text('invoice_prefix').notNull().default('INV'),
  nextInvoiceNumber:       integer('next_invoice_number').notNull().default(1),
  createdAt:               text('created_at').notNull(),
  updatedAt:               text('updated_at').notNull(),
}, (t) => [
  uniqueIndex('bp_user_id_idx').on(t.userId),
])

// ── Clients ───────────────────────────────────────────────────────────────────
// Address is flattened to columns (no JSON object).
export const clients = sqliteTable('clients', {
  id:               text('id').primaryKey(),
  userId:           text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name:             text('name').notNull(),
  email:            text('email'),
  phone:            text('phone'),
  company:          text('company'),
  addressLine1:     text('address_line1'),
  addressLine2:     text('address_line2'),
  addressCity:      text('address_city'),
  addressState:     text('address_state'),
  addressPostalCode:text('address_postal_code'),
  addressCountry:   text('address_country'),
  currency:         text('currency').notNull().default('USD'),
  notes:            text('notes'),
  createdAt:        text('created_at').notNull(),
  updatedAt:        text('updated_at').notNull(),
}, (t) => [
  index('clients_user_id_idx').on(t.userId),
])

// ── Invoices ──────────────────────────────────────────────────────────────────
// lineItems stored as JSON TEXT. All money values are integer cents.
export const invoices = sqliteTable('invoices', {
  id:             text('id').primaryKey(),
  userId:         text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  clientId:       text('client_id').notNull()
    .references(() => clients.id),
  invoiceNumber:  text('invoice_number').notNull(),
  status:         text('status').notNull(), // 'draft'|'sent'|'partial'|'paid'|'void'
  issueDate:      text('issue_date').notNull(),    // YYYY-MM-DD
  dueDate:        text('due_date').notNull(),      // YYYY-MM-DD
  currency:       text('currency').notNull(),
  lineItems:      text('line_items', { mode: 'json' })
    .$type<LineItem[]>().notNull(),
  subtotal:       integer('subtotal').notNull(),
  taxRate:        real('tax_rate'),
  taxAmount:      integer('tax_amount').notNull().default(0),
  discountType:   text('discount_type'),           // 'percentage'|'fixed'|null
  discountValue:  real('discount_value').notNull().default(0),
  discountAmount: integer('discount_amount').notNull().default(0),
  total:          integer('total').notNull(),
  amountPaid:     integer('amount_paid').notNull().default(0),
  amountDue:      integer('amount_due').notNull(),
  notes:          text('notes'),
  terms:          text('terms'),
  sentAt:         text('sent_at'),
  paidAt:         text('paid_at'),
  createdAt:      text('created_at').notNull(),
  updatedAt:      text('updated_at').notNull(),
  deletedAt:      text('deleted_at'),
}, (t) => [
  index('invoices_user_id_idx').on(t.userId),
  index('invoices_client_id_idx').on(t.clientId),
  index('invoices_user_status_idx').on(t.userId, t.status),
])

// ── Payments ──────────────────────────────────────────────────────────────────
export const payments = sqliteTable('payments', {
  id:        text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  amount:    integer('amount').notNull(),
  method:    text('method').notNull(), // 'cash'|'bank_transfer'|'check'|'credit_card'|'other'
  reference: text('reference'),
  notes:     text('notes'),
  paidAt:    text('paid_at').notNull(),   // YYYY-MM-DD
  createdAt: text('created_at').notNull(),
}, (t) => [
  index('payments_invoice_id_idx').on(t.invoiceId),
])

// ── Catalog Items ─────────────────────────────────────────────────────────────
export const catalogItems = sqliteTable('catalog_items', {
  id:          text('id').primaryKey(),
  userId:      text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  description: text('description'),
  unitPrice:   integer('unit_price').notNull(),
  unit:        text('unit'),
  taxable:     integer('taxable', { mode: 'boolean' }).notNull().default(false),
  createdAt:   text('created_at').notNull(),
  updatedAt:   text('updated_at').notNull(),
}, (t) => [
  index('catalog_user_id_idx').on(t.userId),
])

// ── Access Tokens ─────────────────────────────────────────────────────────────
export const accessTokens = sqliteTable('access_tokens', {
  token:     text('token').primaryKey(),
  userId:    text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
})

// ── Refresh Tokens ────────────────────────────────────────────────────────────
export const refreshTokens = sqliteTable('refresh_tokens', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  usedAt:    text('used_at'),
  createdAt: text('created_at').notNull(),
})

// ── Reset Tokens ──────────────────────────────────────────────────────────────
export const resetTokens = sqliteTable('reset_tokens', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  rawToken:  text('raw_token').notNull(),
  expiresAt: text('expires_at').notNull(),
  usedAt:    text('used_at'),
  createdAt: text('created_at').notNull(),
})
```

---

### `lib/db.ts` — NEW

Database singleton. Exports `db` (Drizzle instance) and `createDb` (factory for tests).

```typescript
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { join } from 'path'
import * as schema from '@/lib/schema'

export type Db = ReturnType<typeof drizzle<typeof schema>>

export function createDb(sqliteInstance?: InstanceType<typeof Database>): Db {
  const sqlite = sqliteInstance ?? new Database(process.env.DATABASE_URL ?? './invoicer.db')
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') })
  return db
}

declare global {
  // eslint-disable-next-line no-var
  var __invoicer_db__: Db | undefined
}

export const db: Db =
  globalThis.__invoicer_db__ ?? (globalThis.__invoicer_db__ = createDb())
```

---

### `lib/validators.ts` — NEW

All Zod input schemas. Imported by API route handlers.

```typescript
import { z } from 'zod'

// ── Reusable building blocks ──────────────────────────────────────────────────

const AddressSchema = z.object({
  line1:      z.string().min(1).max(200).trim(),
  line2:      z.string().max(200).trim().nullish(),
  city:       z.string().min(1).max(100).trim(),
  state:      z.string().max(100).trim().nullish(),
  postalCode: z.string().max(20).trim().nullish(),
  country:    z.string().length(2).toUpperCase(),
}).nullish()

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')

// ── Auth ──────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  name:     z.string().min(1).max(100).trim(),
  email:    z.string().email().toLowerCase(),
  password: z.string().min(8).max(100),
})

export const LoginSchema = z.object({
  email:    z.string().email().toLowerCase(),
  password: z.string().min(1),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
})

export const ResetPasswordSchema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8).max(100),
})

// ── Profile ───────────────────────────────────────────────────────────────────

export const ProfilePatchSchema = z.object({
  businessName:            z.string().min(1).max(200).trim().optional(),
  email:                   z.string().email().toLowerCase().nullish(),
  phone:                   z.string().max(50).trim().nullish(),
  website:                 z.string().url().nullish(),
  taxId:                   z.string().max(50).trim().nullish(),
  defaultCurrency:         z.string().length(3).toUpperCase().optional(),
  defaultPaymentTermsDays: z.number().int().min(0).max(365).optional(),
  defaultTaxRate:          z.number().min(0).max(100).nullish(),
  defaultNotes:            z.string().max(2000).nullish(),
  defaultTerms:            z.string().max(2000).nullish(),
  invoicePrefix:           z.string().regex(/^[A-Za-z0-9-]{1,10}$/).optional(),
  address:                 AddressSchema,
}).strict()

// ── Clients ───────────────────────────────────────────────────────────────────

export const ClientCreateSchema = z.object({
  name:     z.string().min(1).max(200).trim(),
  email:    z.string().email().toLowerCase().nullish(),
  phone:    z.string().max(50).trim().nullish(),
  company:  z.string().max(200).trim().nullish(),
  address:  AddressSchema,
  currency: z.string().length(3).toUpperCase().default('USD'),
  notes:    z.string().max(2000).nullish(),
})

export const ClientPatchSchema = ClientCreateSchema.partial()

// ── Invoice Line Items ────────────────────────────────────────────────────────

const LineItemInputSchema = z.object({
  id:          z.string().uuid().optional(),  // server generates UUID if omitted
  description: z.string().min(1).max(500).trim(),
  quantity:    z.number().positive().max(99999),
  unitPrice:   z.number().int().min(0),       // integer cents
  taxable:     z.boolean().default(false),
})

// ── Invoices ──────────────────────────────────────────────────────────────────

export const InvoiceCreateSchema = z.object({
  clientId:      z.string().uuid(),
  issueDate:     isoDate,
  dueDate:       isoDate,
  lineItems:     z.array(LineItemInputSchema).min(1).max(100),
  taxRate:       z.number().min(0).max(100).nullish(),
  discountType:  z.enum(['percentage', 'fixed']).nullish(),
  discountValue: z.number().min(0).default(0),
  currency:      z.string().length(3).toUpperCase().optional(),
  notes:         z.string().max(2000).nullish(),
  terms:         z.string().max(2000).nullish(),
  invoiceNumber: z.string().max(50).optional(), // override auto-generated number
})

export const InvoicePatchSchema = InvoiceCreateSchema.partial()

export const InvoiceSendSchema = z.object({
  recipientEmail: z.string().email().toLowerCase(),
  message:        z.string().max(2000).optional(),
})

// ── Payments ──────────────────────────────────────────────────────────────────

export const PaymentCreateSchema = z.object({
  amount:    z.number().int().positive(),
  method:    z.enum(['cash', 'bank_transfer', 'check', 'credit_card', 'other']),
  paidAt:    isoDate.optional(),    // defaults to today if omitted
  reference: z.string().max(200).trim().nullish(),
  notes:     z.string().max(1000).nullish(),
})

// ── Catalog ───────────────────────────────────────────────────────────────────

export const CatalogCreateSchema = z.object({
  name:        z.string().min(1).max(200).trim(),
  unitPrice:   z.number().int().min(0),
  description: z.string().max(500).nullish(),
  unit:        z.string().max(20).trim().nullish(),
  taxable:     z.boolean().default(false),
})

export const CatalogPatchSchema = CatalogCreateSchema.partial()
```

---

### `drizzle.config.ts` — NEW

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect:     'sqlite',
  schema:      './lib/schema.ts',
  out:         './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? './invoicer.db',
  },
})
```

---

### `vitest.config.ts` — NEW

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals:     true,
    include:     ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
```

---

## Modified Files

### `lib/store.ts` — DELETED

Remove the file. Before deleting, ensure every import of `@/lib/store` has been replaced.

**Callers to migrate** (grep `from.*lib/store` in the project):
- `lib/auth.ts`
- `lib/domain.ts`
- `app/api/auth/register/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/refresh/route.ts`
- `app/api/auth/forgot-password/route.ts`
- `app/api/auth/reset-password/route.ts`
- `app/api/invoices/route.ts`
- `app/api/invoices/next-number/route.ts`
- `app/api/invoices/[id]/route.ts`
- `app/api/invoices/[id]/send/route.ts`
- `app/api/invoices/[id]/void/route.ts`
- `app/api/invoices/[id]/duplicate/route.ts`
- `app/api/invoices/[id]/pdf/route.ts`
- `app/api/invoices/[id]/payments/route.ts`
- `app/api/invoices/[id]/payments/[paymentId]/route.ts`
- `app/api/clients/route.ts`
- `app/api/clients/[id]/route.ts`
- `app/api/clients/[id]/invoices/route.ts`
- `app/api/catalog/route.ts`
- `app/api/catalog/[id]/route.ts`
- `app/api/profile/route.ts`
- `app/api/profile/logo/route.ts`
- `app/api/dashboard/stats/route.ts`

---

### `lib/auth.ts` — MODIFIED

Replace all `getStore()` calls with Drizzle queries against `lib/db.ts`.

**`issueSession(userId: string): Promise<{ accessToken: string; refreshToken: string }>`**
- Generates `accessToken` via `randomToken('at_')` and `refreshToken` via `randomToken('rt_')`
- Inserts into `access_tokens`: `{ token, userId, expiresAt: nowIso() + 15 min }`
- Inserts into `refresh_tokens`: `{ id: uuid(), userId, tokenHash: sha256(refreshToken), expiresAt: nowIso() + 7 days, createdAt: nowIso() }`
- Returns the raw (un-hashed) tokens

**`requireAuth(req: NextRequest): { userId: string }`**
- Reads `invoicer_access` cookie
- Queries `SELECT * FROM access_tokens WHERE token = ? AND expires_at > ?`
- Throws `errorResponse('UNAUTHORIZED', ...)` with HTTP 401 if not found

**`rotateRefreshToken(rawToken: string): { accessToken: string; refreshToken: string }`**
- Computes `hash = sha256(rawToken)`
- Queries `SELECT * FROM refresh_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`
- Throws 401 if not found
- Updates `used_at = nowIso()` on the found row
- Calls `issueSession(userId)` to generate new token pair
- Returns new tokens

---

### `lib/api.ts` — MODIFIED (addition only)

Add the `parseBody` helper. Do not modify existing exports.

```typescript
import type { ZodSchema, ZodError } from 'zod'

/**
 * Parse and validate `body` against `schema`.
 * On failure, returns a NextResponse with HTTP 400 and VALIDATION_ERROR code.
 * On success, returns the typed parsed data.
 */
export function parseBody<T>(
  schema: ZodSchema<T>,
  body: unknown,
): { ok: true; data: T } | { ok: false; response: NextResponse } {
  const result = schema.safeParse(body)
  if (!result.success) {
    return {
      ok: false,
      response: errorResponse(
        'VALIDATION_ERROR',
        'Invalid input.',
        400,
        { details: (result.error as ZodError).flatten().fieldErrors },
      ),
    }
  }
  return { ok: true, data: result.data }
}
```

---

### `lib/domain.ts` — MODIFIED

Replace all `store.*` array reads/writes with Drizzle queries using `db` from `lib/db.ts`.

Key function signatures are **unchanged**. Only the implementation bodies change.

Functions in `lib/domain.ts` and their new data source:

| Function | Old source | New source |
|---|---|---|
| `parseClientCreate(body)` | validation only | validation via `ClientCreateSchema` (Zod) |
| `applyProfilePatch(profile, patch)` | pure merge | pure merge (unchanged) |
| `getClientOrFail(userId, clientId)` | `store.clients.find(...)` | `db.select().from(clients).where(and(eq(clients.id, clientId), eq(clients.userId, userId)))` |
| `getInvoiceOrFail(userId, id)` | `store.invoices.find(...)` | `db.select().from(invoices).where(...)` |
| `getProfileOrFail(userId)` | `store.businessProfiles.find(...)` | `db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId))` |

---

### `lib/invoices.ts` — MODIFIED (minimal)

`computeTotals()`, `withComputedStatus()`, and `toSummary()` are **pure functions and remain
unchanged**. Remove any direct `store` imports if present. Recalculate and persist totals
within the route handler after calling `computeTotals()`.

---

## API Route Specifications

All routes marked **MODIFIED** — same method, path, request/response shapes as documented in
`PROJECT_CONTEXT.md §Existing Routes and API Endpoints`. Only the implementation changes
(store → DB). Changes from the current implementation are noted below.

---

### Auth Routes

#### `POST /api/auth/register` — MODIFIED

**File**: `app/api/auth/register/route.ts`

**Request body** (validated with `RegisterSchema`):
```typescript
{
  name:     string  // min 1, max 100, trimmed
  email:    string  // valid email, lowercased
  password: string  // min 8, max 100
}
```

**Success response** `201`:
```typescript
{ data: { id: string; email: string; name: string } }
```

**Error responses**:
| HTTP | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Schema parse failure |
| 409 | `EMAIL_TAKEN` | `users.email` unique constraint violation |

**Implementation notes**:
1. Call `parseBody(RegisterSchema, body)` — return 400 on failure
2. Check `SELECT id FROM users WHERE email = ?` — return 409 if found
3. Hash password: `crypto.scryptSync(password, 'invoicer-salt', 64).toString('hex')`
4. Insert `users` row (id = `uuid()`, createdAt/updatedAt = `nowIso()`)
5. Insert `business_profiles` row with `businessName = user.name`, all defaults
6. Call `issueSession(userId)`, set cookies, return 201

---

#### `POST /api/auth/login` — MODIFIED

**File**: `app/api/auth/login/route.ts`

**Request body** (validated with `LoginSchema`):
```typescript
{ email: string; password: string }
```

**Success response** `200`:
```typescript
{ data: { id: string; email: string; name: string } }
```

**Error responses**:
| HTTP | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Schema parse failure |
| 401 | `INVALID_CREDENTIALS` | User not found or password mismatch |

---

#### `POST /api/auth/logout` — MODIFIED

**File**: `app/api/auth/logout/route.ts`

**Request body**: none

**Success response** `200`:
```typescript
{ success: true }
```

**Implementation notes**:
- Read `invoicer_refresh` cookie; find and delete `refresh_tokens` row where `tokenHash = sha256(cookie)`
- Delete `access_tokens` row where `token = invoicer_access cookie`
- Clear both cookies regardless of whether rows were found

---

#### `POST /api/auth/refresh` — MODIFIED

**File**: `app/api/auth/refresh/route.ts`

**Request body**: none (reads `invoicer_refresh` cookie)

**Success response** `200`:
```typescript
{ success: true }
```

**Error responses**:
| HTTP | Code | Condition |
|---|---|---|
| 401 | `UNAUTHORIZED` | Token not found, already used, or expired |

---

#### `POST /api/auth/forgot-password` — MODIFIED

**File**: `app/api/auth/forgot-password/route.ts`

**Request body** (validated with `ForgotPasswordSchema`):
```typescript
{ email: string }
```

**Success response** `200` (always, even if email not found):
```typescript
{ success: true }
```

**Implementation notes**:
- Look up user by email; if not found, return `{ success: true }` silently
- Generate `rawToken = randomToken('rst_')`, `tokenHash = sha256(rawToken)`
- Insert `reset_tokens` row with `expiresAt = nowIso() + 1 hour`
- Return `{ success: true }` — no email is sent (existing known limitation)

---

#### `POST /api/auth/reset-password` — MODIFIED

**File**: `app/api/auth/reset-password/route.ts`

**Request body** (validated with `ResetPasswordSchema`):
```typescript
{ token: string; password: string }
```

**Success response** `200`:
```typescript
{ success: true }
```

**Error responses**:
| HTTP | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Schema parse failure |
| 400 | `INVALID_TOKEN` | Token not found, used, or expired |

---

### Invoice Routes

#### `GET /api/invoices` — MODIFIED

**File**: `app/api/invoices/route.ts`

**Query parameters**:
| Param | Type | Description |
|---|---|---|
| `page` | number (default 1) | Page number |
| `limit` | number (default 20, max 100) | Items per page |
| `status` | string (optional) | Filter by stored status. `overdue` is a virtual filter: `status IN ('sent','partial') AND due_date < today` |
| `search` | string (optional) | Case-insensitive match on `invoice_number` OR client `name` (JOIN required) |
| `clientId` | UUID (optional) | Filter by `client_id` |
| `sortBy` | `createdAt`\|`dueDate`\|`total`\|`invoiceNumber` (default `createdAt`) | Sort column |
| `sortDir` | `asc`\|`desc` (default `desc`) | Sort direction |

**Success response** `200`:
```typescript
{
  data: InvoiceSummary[]   // withComputedStatus() applied to each
  meta: { total: number; page: number; limit: number }
}
```

**Implementation notes**:
- Base query: `invoices JOIN clients ON invoices.client_id = clients.id`
  WHERE `invoices.user_id = ? AND invoices.deleted_at IS NULL`
- `overdue` filter: add `AND invoices.status IN ('sent','partial') AND invoices.due_date < ?` (today)
- `search` filter: `LIKE '%...%'` on `invoices.invoice_number` OR `clients.name`
- Apply `withComputedStatus()` from `lib/invoices.ts` on each result before returning

---

#### `POST /api/invoices` — MODIFIED

**File**: `app/api/invoices/route.ts`

**Request body** (validated with `InvoiceCreateSchema`):
```typescript
{
  clientId:      string   // UUID, must belong to authenticated user
  issueDate:     string   // YYYY-MM-DD
  dueDate:       string   // YYYY-MM-DD
  lineItems:     Array<{
    id?:         string   // UUID, generated if omitted
    description: string
    quantity:    number
    unitPrice:   number   // integer cents
    taxable:     boolean
  }>
  taxRate?:      number | null
  discountType?: 'percentage' | 'fixed' | null
  discountValue?: number        // default 0
  currency?:     string         // ISO 4217, defaults to profile.defaultCurrency
  notes?:        string | null
  terms?:        string | null
  invoiceNumber?: string        // override; server auto-generates if omitted
}
```

**Success response** `201`:
```typescript
{ data: StoredInvoice }
```

**Error responses**:
| HTTP | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Schema failure |
| 404 | `NOT_FOUND` | `clientId` does not belong to user |
| 409 | `DUPLICATE_INVOICE_NUMBER` | Provided `invoiceNumber` already exists (non-deleted) for user |

**Implementation notes**:
- Retrieve profile inside a **transaction**
- Atomically: `UPDATE business_profiles SET next_invoice_number = next_invoice_number + 1 WHERE user_id = ? RETURNING next_invoice_number` to get the next number
- Format `invoiceNumber` as `${prefix}-${String(nextNumber).padStart(4, '0')}` if not provided
- Assign UUIDs to any `lineItems` missing an `id`
- Call `computeTotals()` from `lib/invoices.ts` to get subtotal, taxAmount, discountAmount, total, amountDue
- Insert invoice row; return 201

---

#### `GET /api/invoices/next-number` — MODIFIED

**File**: `app/api/invoices/next-number/route.ts`

**Success response** `200`:
```typescript
{ data: { invoiceNumber: string } }
```

**Implementation**: Read `nextInvoiceNumber` + `invoicePrefix` from `business_profiles` WHERE
`userId = ?`. Format as `${prefix}-${String(nextNumber).padStart(4, '0')}`. Do **not** increment.

---

#### `GET /api/invoices/[id]` — MODIFIED

**File**: `app/api/invoices/[id]/route.ts`

**Success response** `200`:
```typescript
{ data: StoredInvoice }  // withComputedStatus() applied
```

**Error responses**:
| HTTP | Code | Condition |
|---|---|---|
| 404 | `NOT_FOUND` | Invoice not found, wrong user, or `deletedAt IS NOT NULL` |

---

#### `PATCH /api/invoices/[id]` — MODIFIED

**File**: `app/api/invoices/[id]/route.ts`

**Request body** (validated with `InvoicePatchSchema`):
Any subset of `InvoiceCreateSchema` fields.

**Success response** `200`:
```typescript
{ data: StoredInvoice }
```

**Error responses**:
| HTTP | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Schema failure |
| 403 | `FORBIDDEN` | Invoice is not in `draft` status |
| 404 | `NOT_FOUND` | Invoice not found |

**Implementation notes**:
- Recompute totals if `lineItems`, `taxRate`, `discountType`, or `discountValue` are in the patch
- Update `updatedAt = nowIso()`

---

#### `DELETE /api/invoices/[id]` — MODIFIED

**Success response** `200`: `{ success: true }`

Sets `deleted_at = nowIso()` on a `draft` invoice. Returns 403 if not draft.

---

#### `POST /api/invoices/[id]/send` — MODIFIED

**File**: `app/api/invoices/[id]/send/route.ts`

**Request body** (validated with `InvoiceSendSchema`):
```typescript
{ recipientEmail: string; message?: string }
```

**Success response** `200`: `{ success: true }`

**Error responses**:
| HTTP | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Schema failure |
| 400 | `INVALID_STATUS` | Invoice is not `draft` |
| 404 | `NOT_FOUND` | Invoice not found |

**Implementation**: Set `status = 'sent'`, `sentAt = nowIso()`, `updatedAt = nowIso()`.
No email is sent (existing known limitation).

---

#### `POST /api/invoices/[id]/void` — MODIFIED

**Success response** `200`: `{ success: true }`

Sets `status = 'void'`. Returns 400 with `INVALID_STATUS` if current status is `paid` or `void`.

---

#### `POST /api/invoices/[id]/duplicate` — MODIFIED

**Success response** `201`:
```typescript
{ data: StoredInvoice }  // the new draft invoice
```

**Implementation notes**:
- Reads source invoice; verifies ownership
- Atomically increments `nextInvoiceNumber` (same transaction pattern as POST /api/invoices)
- Inserts new invoice row: new UUID, new invoice number, `status = 'draft'`, `issueDate = todayUtc()`,
  `dueDate = addDaysUtc(today, profile.defaultPaymentTermsDays)`, `amountPaid = 0`, `sentAt = null`, `paidAt = null`
- Returns new invoice

---

#### `GET /api/invoices/[id]/pdf` — MODIFIED

**File**: `app/api/invoices/[id]/pdf/route.ts`

Reads invoice + client + business profile from SQLite. Passes data to `generatePdf()` in
`lib/pdf.ts` (unchanged). Returns `application/pdf` response.

No changes to PDF generation logic.

---

#### `GET /api/invoices/[id]/payments` — MODIFIED

**File**: `app/api/invoices/[id]/payments/route.ts`

**Success response** `200`:
```typescript
{ data: Payment[] }
```

Query: `SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at DESC, created_at DESC`

---

#### `POST /api/invoices/[id]/payments` — MODIFIED

**File**: `app/api/invoices/[id]/payments/route.ts`

**Request body** (validated with `PaymentCreateSchema`):
```typescript
{
  amount:     number   // integer cents, > 0, <= invoice.amountDue
  method:     'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'other'
  paidAt?:    string   // YYYY-MM-DD, defaults to todayUtc() if omitted
  reference?: string | null
  notes?:     string | null
}
```

**Success response** `201`:
```typescript
{ data: { payment: Payment; invoice: StoredInvoice } }
```

**Error responses**:
| HTTP | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Schema failure |
| 400 | `PAYMENT_EXCEEDS_DUE` | `amount > invoice.amountDue` |
| 404 | `NOT_FOUND` | Invoice not found |

**Implementation notes** (all in a single SQLite transaction):
1. Lock and read invoice row
2. Validate `amount <= amountDue`
3. Insert payment row
4. Recalculate: `newAmountPaid = invoice.amountPaid + amount`
5. Determine new status:
   - `newAmountPaid >= invoice.total` → `paid`; set `paidAt = payment.paidAt`
   - `newAmountPaid > 0` → `partial`
   - (status cannot drop below `sent` via payment)
6. Update invoice: `amount_paid`, `amount_due`, `status`, `paid_at`, `updated_at`

---

#### `DELETE /api/invoices/[id]/payments/[paymentId]` — MODIFIED

**File**: `app/api/invoices/[id]/payments/[paymentId]/route.ts`

**Success response** `200`: `{ success: true }`

**Implementation notes** (single transaction):
1. Delete payment row (verify it belongs to the invoice and invoice belongs to user)
2. Recalculate `amountPaid = SUM(amount) FROM payments WHERE invoice_id = ?`
3. Determine new status: `paid` → `partial` or `sent`; `partial` → `partial` or `sent`; clears `paidAt` if no longer paid
4. Update invoice row

---

### Client Routes

#### `GET /api/clients` — MODIFIED

**File**: `app/api/clients/route.ts`

**Query parameters**: `page`, `limit`, `search` (matches `name`, `company`, `email`)

**Success response** `200`:
```typescript
{ data: Client[]; meta: { total: number; page: number; limit: number } }
```

---

#### `POST /api/clients` — MODIFIED

**File**: `app/api/clients/route.ts`

**Request body** (validated with `ClientCreateSchema`):
```typescript
{
  name:     string
  email?:   string | null
  phone?:   string | null
  company?: string | null
  address?: Address | null
  currency?: string         // default 'USD'
  notes?:   string | null
}
```

**Address object** (if provided) is flattened into individual columns before INSERT.

**Success response** `201`:
```typescript
{ data: Client }
```

**Column mapping for address**:
- `address.line1` → `address_line1`
- `address.line2` → `address_line2`
- `address.city` → `address_city`
- `address.state` → `address_state`
- `address.postalCode` → `address_postal_code`
- `address.country` → `address_country`

**Reconstituting Address on read**: When returning a client, if `addressLine1` is non-null,
reconstruct the `address` object from the flat columns. Otherwise `address = null`.

---

#### `GET /api/clients/[id]` — MODIFIED

**File**: `app/api/clients/[id]/route.ts`

**Success response** `200`:
```typescript
{
  data: Client & {
    stats: {
      totalInvoiced:   number  // SUM(total) cents — non-deleted, non-void invoices
      totalPaid:       number  // SUM(amount_paid) cents
      totalOutstanding:number  // SUM(amount_due) cents — status IN ('sent','partial','overdue')
      lastInvoiceDate: string | null  // max(issue_date) — non-deleted invoices
      invoiceCount:    number
    }
  }
}
```

**Stats query**: Two aggregate queries (or one with multiple aggregations):
```sql
SELECT
  COALESCE(SUM(total), 0)       AS total_invoiced,
  COALESCE(SUM(amount_paid), 0) AS total_paid,
  COALESCE(SUM(amount_due), 0)  AS total_outstanding,
  MAX(issue_date)               AS last_invoice_date,
  COUNT(*)                      AS invoice_count
FROM invoices
WHERE client_id = ?
  AND user_id = ?
  AND deleted_at IS NULL
  AND status != 'void'
```

---

#### `PATCH /api/clients/[id]` — MODIFIED

**Request body** (validated with `ClientPatchSchema`)

**Success response** `200`: `{ data: Client }`

**Implementation**: Flatten any `address` object to columns before UPDATE. Reconstruct on read.

---

#### `DELETE /api/clients/[id]` — MODIFIED

**Success response** `200`: `{ success: true }`

**Error responses**:
| HTTP | Code | Condition |
|---|---|---|
| 409 | `CLIENT_HAS_INVOICES` | Non-void, non-deleted invoices exist for this client |

---

#### `GET /api/clients/[id]/invoices` — MODIFIED

**File**: `app/api/clients/[id]/invoices/route.ts`

**Query parameters**: `page`, `limit`, `status`

**Success response** `200`:
```typescript
{ data: InvoiceSummary[]; meta: { total: number; page: number; limit: number } }
```

---

### Catalog Routes

#### `GET /api/catalog` — MODIFIED

**File**: `app/api/catalog/route.ts`

**Query parameters**: `search` (matches `name`, `description`, case-insensitive)

**Success response** `200`:
```typescript
{ data: CatalogItem[] }
```

Ordered by `name ASC`.

---

#### `POST /api/catalog` — MODIFIED

**Request body** (validated with `CatalogCreateSchema`):
```typescript
{
  name:         string    // min 1, max 200
  unitPrice:    number    // integer cents
  description?: string | null
  unit?:        string | null
  taxable?:     boolean   // default false
}
```

**Success response** `201`: `{ data: CatalogItem }`

**Error responses**:
| HTTP | Code | Condition |
|---|---|---|
| 400 | `CATALOG_LIMIT_EXCEEDED` | `SELECT COUNT(*) FROM catalog_items WHERE user_id = ?` >= 500 |

---

#### `PATCH /api/catalog/[id]` — MODIFIED

**Request body** (validated with `CatalogPatchSchema`)

**Success response** `200`: `{ data: CatalogItem }`

---

#### `DELETE /api/catalog/[id]` — MODIFIED

**Success response** `200`: `{ success: true }`

---

### Profile Routes

#### `GET /api/profile` — MODIFIED

**File**: `app/api/profile/route.ts`

**Success response** `200`: `{ data: BusinessProfile }`

**Implementation**: Query `business_profiles` WHERE `user_id = ?`. Reconstruct nested `address`
object from flat columns (same pattern as clients).

---

#### `PATCH /api/profile` — MODIFIED

**Request body** (validated with `ProfilePatchSchema`):
Any subset of profile fields. `address` is an optional nested object.

**Success response** `200`: `{ data: BusinessProfile }`

**Implementation**: Flatten `address` to columns before UPDATE. Set `updatedAt = nowIso()`.

---

#### `POST /api/profile/logo` — MODIFIED

Reads multipart body, validates MIME + size, generates stub CDN URL, updates
`business_profiles.logo_url`. File bytes are discarded (existing known limitation).

**Success response** `200`: `{ data: BusinessProfile }`

---

#### `DELETE /api/profile/logo` — MODIFIED

Sets `business_profiles.logo_url = NULL`.

**Success response** `200`: `{ data: BusinessProfile }`

---

### Dashboard Routes

#### `GET /api/dashboard/stats` — MODIFIED

**File**: `app/api/dashboard/stats/route.ts`

**Success response** `200`:
```typescript
{
  data: {
    totalOutstanding: number   // SUM(amount_due) cents, non-deleted, status IN ('sent','partial'), defaultCurrency
    totalOverdue:     number   // same + due_date < today
    paidThisMonth:   number   // SUM(payments.amount) where paid_at in current month, joined to defaultCurrency invoices
    recentInvoices:  InvoiceSummary[]   // 5 most recent by created_at DESC
    overdueInvoices: InvoiceSummary[]   // all overdue, ordered dueDate ASC
  }
}
```

**Implementation queries**:

```sql
-- totalOutstanding
SELECT COALESCE(SUM(amount_due), 0)
FROM invoices
WHERE user_id = ? AND deleted_at IS NULL
  AND status IN ('sent','partial')
  AND currency = ?  -- profile.defaultCurrency

-- totalOverdue
SELECT COALESCE(SUM(amount_due), 0)
FROM invoices
WHERE user_id = ? AND deleted_at IS NULL
  AND status IN ('sent','partial')
  AND due_date < ?  -- today
  AND currency = ?

-- paidThisMonth
SELECT COALESCE(SUM(p.amount), 0)
FROM payments p
JOIN invoices i ON p.invoice_id = i.id
WHERE i.user_id = ?
  AND i.currency = ?
  AND p.paid_at >= ?  -- first day of current month (YYYY-MM-01)
  AND p.paid_at <= ?  -- last day of current month

-- recentInvoices (LIMIT 5)
SELECT i.*, c.name AS client_name
FROM invoices i
JOIN clients c ON i.client_id = c.id
WHERE i.user_id = ? AND i.deleted_at IS NULL
ORDER BY i.created_at DESC
LIMIT 5

-- overdueInvoices
SELECT i.*, c.name AS client_name
FROM invoices i
JOIN clients c ON i.client_id = c.id
WHERE i.user_id = ? AND i.deleted_at IS NULL
  AND i.status IN ('sent','partial')
  AND i.due_date < ?  -- today
ORDER BY i.due_date ASC
```

---

## Zod Schema Reference

### Type Inference

Use Drizzle's `$inferSelect` and `$inferInsert` for table row types:

```typescript
import { users, invoices, clients } from '@/lib/schema'
type UserRow     = typeof users.$inferSelect
type InvoiceRow  = typeof invoices.$inferSelect
type ClientRow   = typeof clients.$inferSelect
```

Use Zod's `z.infer` for validated input types:

```typescript
import type { z } from 'zod'
import { InvoiceCreateSchema } from '@/lib/validators'
type InvoiceCreateInput = z.infer<typeof InvoiceCreateSchema>
```

---

## UI Component → Endpoint Mapping

Unchanged from `PROJECT_CONTEXT.md §Existing Routes`. All endpoints retain the same paths and
response shapes. No frontend changes are required.

---

## npm Scripts Required

Add to `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate":  "drizzle-kit migrate",
    "db:studio":   "drizzle-kit studio",
    "test":        "vitest run",
    "test:watch":  "vitest"
  }
}
```

---

## TypeScript Strict-Mode Notes

- `lib/schema.ts` must compile under `strict: true` (existing `tsconfig.json`)
- `lib/validators.ts` must compile under `strict: true`
- All Drizzle query results are typed; no `any` casts
- `lineItems` column uses `.$type<LineItem[]>()` to match the `LineItem` interface in `lib/models.ts`
- Address reconstitution (flat columns → nested object) must handle `null` values for optional fields
