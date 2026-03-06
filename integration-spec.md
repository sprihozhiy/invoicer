# Invoicer — Integration Specification

## Base URL

All API routes are served under `/api`. In production: `https://<domain>/api`.

---

## Authentication Model

All routes are authenticated via an httpOnly cookie named `invoicer_access` (JWT). Routes marked **[PUBLIC]** do not require authentication. Unauthenticated requests to protected routes receive:

```
HTTP 401
{ "error": { "code": "UNAUTHORIZED", "message": "Authentication required." } }
```

The client-side HTTP interceptor automatically handles 401 responses by calling `POST /api/auth/refresh` once before redirecting to `/login`.

---

## Response Envelopes

**Single resource:**
```typescript
{ data: T }
```

**Paginated list:**
```typescript
{ data: T[]; meta: { total: number; page: number; limit: number } }
```

**Action with no returned resource (delete, logout):**
```typescript
{ success: true }
```

**Error (all non-2xx responses):**
```typescript
{
  error: {
    code: string;       // SCREAMING_SNAKE_CASE machine-readable identifier
    message: string;    // human-readable description
    field?: string;     // present on validation errors referencing a specific field
    details?: unknown;  // optional additional context
  }
}
```

---

## Data Models

```typescript
// ─────────────────────────────────────────────────────────────
// Primitive aliases
// ─────────────────────────────────────────────────────────────

/** UUID v4 string */
type UUID = string;

/** ISO 8601 date-time with timezone, e.g. "2025-03-06T14:30:00.000Z" */
type ISODateTime = string;

/** ISO 8601 date (no time component), e.g. "2025-03-06" */
type ISODate = string;

/** ISO 4217 currency code, e.g. "USD" */
type CurrencyCode = string;

/**
 * Integer representing monetary value in the currency's smallest unit.
 * For USD: cents (e.g. $12.99 → 1299).
 * ALL monetary fields in request and response bodies use this type.
 * Non-integer values are rejected with HTTP 400.
 */
type Cents = number;

// ─────────────────────────────────────────────────────────────
// Shared sub-objects
// ─────────────────────────────────────────────────────────────

interface Address {
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;       // state/province/region
  postalCode: string | null;
  country: string;            // ISO 3166-1 alpha-2, e.g. "US"
}

// ─────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────

/** Returned from auth endpoints. Never includes passwordHash. */
interface User {
  id: UUID;
  email: string;
  name: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ─────────────────────────────────────────────────────────────
// Business Profile
// ─────────────────────────────────────────────────────────────

interface BusinessProfile {
  id: UUID;
  userId: UUID;
  businessName: string;
  logoUrl: string | null;             // absolute URL to stored image
  address: Address | null;
  phone: string | null;
  email: string | null;               // business contact email (separate from login email)
  website: string | null;
  taxId: string | null;
  defaultCurrency: CurrencyCode;
  defaultPaymentTermsDays: number;    // default: 30
  defaultTaxRate: number | null;      // percentage, e.g. 8.5 means 8.5%
  defaultNotes: string | null;        // pre-filled on new invoices
  defaultTerms: string | null;        // pre-filled on new invoices
  invoicePrefix: string;              // default: "INV"
  nextInvoiceNumber: number;          // auto-increments on each invoice creation; minimum 1
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ─────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────

interface Client {
  id: UUID;
  userId: UUID;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: Address | null;
  currency: CurrencyCode;    // defaults to businessProfile.defaultCurrency
  notes: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** Returned only from GET /api/clients/:id — includes computed aggregates */
interface ClientWithStats extends Client {
  totalInvoiced: Cents;         // sum of all non-void invoice totals
  totalPaid: Cents;             // sum of all payment amounts on non-void invoices
  totalOutstanding: Cents;      // totalInvoiced − totalPaid
  lastInvoiceDate: ISODate | null;
}

// ─────────────────────────────────────────────────────────────
// Invoice
// ─────────────────────────────────────────────────────────────

/**
 * Stored values: "draft" | "sent" | "partial" | "paid" | "void"
 * "overdue" is never stored; it is computed on read:
 *   if stored status is "sent" or "partial" AND dueDate < today (UTC) → return "overdue"
 */
type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "overdue" | "void";

type DiscountType = "percentage" | "fixed";

interface LineItem {
  id: UUID;
  description: string;
  quantity: number;       // positive number; supports up to 4 decimal places
  unitPrice: Cents;       // per unit, integer cents
  amount: Cents;          // server-computed: Math.round(quantity × unitPrice)
  taxable: boolean;
}

interface Invoice {
  id: UUID;
  userId: UUID;
  clientId: UUID;
  invoiceNumber: string;            // e.g. "INV-0023"
  status: InvoiceStatus;            // computed on read with overdue override
  issueDate: ISODate;
  dueDate: ISODate;
  currency: CurrencyCode;
  lineItems: LineItem[];
  subtotal: Cents;                  // server-computed: sum of lineItem.amount
  taxRate: number | null;           // percentage applied to taxable line items only
  taxAmount: Cents;                 // server-computed
  discountType: DiscountType | null;
  discountValue: number;            // percentage (e.g. 10) or Cents depending on discountType; 0 if no discount
  discountAmount: Cents;            // server-computed
  total: Cents;                     // server-computed: subtotal + taxAmount − discountAmount
  amountPaid: Cents;                // sum of all recorded payments
  amountDue: Cents;                 // total − amountPaid
  notes: string | null;
  terms: string | null;
  sentAt: ISODateTime | null;
  paidAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/**
 * Lightweight invoice representation used in lists, dashboard widgets,
 * and client invoice history.
 */
interface InvoiceSummary {
  id: UUID;
  invoiceNumber: string;
  status: InvoiceStatus;    // computed with overdue override
  clientId: UUID;
  clientName: string;
  total: Cents;
  amountDue: Cents;
  currency: CurrencyCode;
  issueDate: ISODate;
  dueDate: ISODate;
  createdAt: ISODateTime;
}

// ─────────────────────────────────────────────────────────────
// Payment
// ─────────────────────────────────────────────────────────────

type PaymentMethod = "cash" | "bank_transfer" | "check" | "credit_card" | "other";

interface Payment {
  id: UUID;
  invoiceId: UUID;
  amount: Cents;
  method: PaymentMethod;
  reference: string | null;   // e.g. check number, transfer reference
  notes: string | null;
  paidAt: ISODate;
  createdAt: ISODateTime;
}

// ─────────────────────────────────────────────────────────────
// Catalog Item
// ─────────────────────────────────────────────────────────────

interface CatalogItem {
  id: UUID;
  userId: UUID;
  name: string;
  description: string | null;
  unitPrice: Cents;
  unit: string | null;        // e.g. "hour", "day", "piece"
  taxable: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ─────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────

interface DashboardStats {
  totalOutstanding: Cents;          // sum of amountDue for all sent+partial invoices
  totalOverdue: Cents;              // sum of amountDue for overdue invoices
  paidThisMonth: Cents;             // sum of total for invoices paid in current calendar month
  currency: CurrencyCode;           // user's defaultCurrency; stats exclude other currencies
  recentInvoices: InvoiceSummary[]; // last 5 by createdAt desc, any status
  overdueInvoices: InvoiceSummary[];// all overdue, sorted dueDate asc
}

// ─────────────────────────────────────────────────────────────
// Internal DB models (never serialised to API responses)
// ─────────────────────────────────────────────────────────────

/** Stored in DB; raw token is sent in cookie only, never stored */
interface RefreshTokenRecord {
  id: UUID;
  userId: UUID;
  tokenHash: string;        // SHA-256 hex of raw JWT
  expiresAt: ISODateTime;
  usedAt: ISODateTime | null;
  createdAt: ISODateTime;
}

interface PasswordResetTokenRecord {
  id: UUID;
  userId: UUID;
  tokenHash: string;        // SHA-256 hex of raw token
  expiresAt: ISODateTime;
  usedAt: ISODateTime | null;
  createdAt: ISODateTime;
}
```

---

## API Routes

### Auth

---

#### `POST /api/auth/register` [PUBLIC]

Create a new user account and begin a session.

**Request body:**
```typescript
interface RegisterRequest {
  name: string;       // required; 1–100 characters
  email: string;      // required; valid email format
  password: string;   // required; min 8 chars, ≥1 uppercase, ≥1 digit
}
```

**Success `200 OK`:**
```typescript
interface RegisterResponse {
  data: User;
}
```
Sets cookies: `invoicer_access` (httpOnly, Secure, SameSite=Strict, 15 min), `invoicer_refresh` (httpOnly, Secure, SameSite=Strict, 7 days).
Side effect: creates a `BusinessProfile` record with default values for the new user.

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 400 | `VALIDATION_ERROR` | Missing/invalid fields; `field` indicates which |
| 409 | `EMAIL_TAKEN` | Email already registered |

---

#### `POST /api/auth/login` [PUBLIC]

Authenticate an existing user.

**Request body:**
```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**Success `200 OK`:**
```typescript
interface LoginResponse {
  data: User;
}
```
Sets cookies: `invoicer_access`, `invoicer_refresh`.

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 400 | `VALIDATION_ERROR` | Missing fields |
| 401 | `INVALID_CREDENTIALS` | Email not found or password incorrect |

---

#### `POST /api/auth/logout`

End the current session.

**Request body:** none

**Success `200 OK`:**
```typescript
{ success: true }
```
Expires both cookies. Marks the refresh token record's `usedAt` in the database.

---

#### `POST /api/auth/refresh` [PUBLIC]

Exchange a valid refresh token for a new access token. Called automatically by the client interceptor.

**Request body:** none (reads `invoicer_refresh` cookie)

**Success `200 OK`:**
```typescript
{ success: true }
```
Issues new `invoicer_access` cookie. Rotates refresh token: issues new `invoicer_refresh` cookie, marks old token as used.

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 401 | `INVALID_REFRESH_TOKEN` | Cookie missing, JWT invalid, token expired, or token already used |

---

#### `POST /api/auth/forgot-password` [PUBLIC]

Trigger a password reset email.

**Request body:**
```typescript
interface ForgotPasswordRequest {
  email: string;
}
```

**Success `200 OK`:**
```typescript
{ success: true }
```
Response is identical regardless of whether the email is registered (prevents enumeration). If registered and SMTP is configured, sends email with reset link: `{NEXT_PUBLIC_APP_URL}/reset-password?token=<signed_token>`. Token expires in 1 hour.

---

#### `POST /api/auth/reset-password` [PUBLIC]

Set a new password using a reset token.

**Request body:**
```typescript
interface ResetPasswordRequest {
  token: string;          // the raw token from the reset link query parameter
  newPassword: string;    // min 8 chars, ≥1 uppercase, ≥1 digit
}
```

**Success `200 OK`:**
```typescript
{ success: true }
```
Marks token `usedAt`. Does not start a session; user must log in separately.

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 400 | `VALIDATION_ERROR` | `newPassword` fails requirements; `field: "newPassword"` |
| 400 | `TOKEN_INVALID` | Token not found or expired |
| 400 | `TOKEN_USED` | Token already used |

---

### Business Profile

---

#### `GET /api/profile`

Fetch the authenticated user's business profile.

**Success `200 OK`:**
```typescript
interface GetProfileResponse {
  data: BusinessProfile;
}
```

---

#### `PATCH /api/profile`

Update business profile fields. Only provided fields are updated (partial update).

**Request body:**
```typescript
interface UpdateProfileRequest {
  businessName?: string;             // must not be empty string if provided
  address?: Address | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxId?: string | null;
  defaultCurrency?: CurrencyCode;
  defaultPaymentTermsDays?: number;  // integer ≥ 0
  defaultTaxRate?: number | null;    // percentage; null removes default tax
  defaultNotes?: string | null;
  defaultTerms?: string | null;
  invoicePrefix?: string;            // 1–10 characters; alphanumeric and hyphens only
  nextInvoiceNumber?: number;        // integer ≥ 1
}
```

**Success `200 OK`:**
```typescript
interface UpdateProfileResponse {
  data: BusinessProfile;
}
```

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 400 | `VALIDATION_ERROR` | `businessName` is empty, invalid field values; `field` set |

---

#### `POST /api/profile/logo`

Upload or replace the business logo. Multipart form data.

**Request:** `Content-Type: multipart/form-data`
- Form field name: `logo`
- Accepted MIME types: `image/jpeg`, `image/png`
- Maximum file size: 2 MB

**Success `200 OK`:**
```typescript
interface LogoUploadResponse {
  data: {
    logoUrl: string;  // absolute URL to the stored logo file
  };
}
```
Side effect: updates `BusinessProfile.logoUrl` in the database.

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 400 | `VALIDATION_ERROR` | No file provided |
| 413 | `FILE_TOO_LARGE` | File exceeds 2 MB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | MIME type is not `image/jpeg` or `image/png` |

---

#### `DELETE /api/profile/logo`

Remove the business logo.

**Success `200 OK`:**
```typescript
{ success: true }
```
Side effects: sets `BusinessProfile.logoUrl` to `null` in the database; deletes the file from storage backend.

---

### Clients

---

#### `GET /api/clients`

List clients for the authenticated user.

**Query parameters:**
```
search?: string    // case-insensitive substring match on name, email, company
page?:   number    // default: 1
limit?:  number    // default: 20; maximum: 100
```

**Success `200 OK`:**
```typescript
interface ListClientsResponse {
  data: Client[];
  meta: { total: number; page: number; limit: number };
}
```

---

#### `POST /api/clients`

Create a new client.

**Request body:**
```typescript
interface CreateClientRequest {
  name: string;                  // required
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  address?: Address | null;
  currency?: CurrencyCode;       // defaults to businessProfile.defaultCurrency
  notes?: string | null;
}
```

**Success `201 Created`:**
```typescript
interface CreateClientResponse {
  data: Client;
}
```

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 400 | `VALIDATION_ERROR` | `name` missing or empty; `field: "name"` |

---

#### `GET /api/clients/:id`

Fetch a single client with computed stats.

**Success `200 OK`:**
```typescript
interface GetClientResponse {
  data: ClientWithStats;
}
```

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 404 | `NOT_FOUND` | Client not found or belongs to a different user |

---

#### `PATCH /api/clients/:id`

Update client fields (partial update).

**Request body:**
```typescript
interface UpdateClientRequest {
  name?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  address?: Address | null;
  currency?: CurrencyCode;
  notes?: string | null;
}
```

**Success `200 OK`:**
```typescript
interface UpdateClientResponse {
  data: Client;
}
```

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 400 | `VALIDATION_ERROR` | `name` is empty |
| 404 | `NOT_FOUND` | Client not found |

---

#### `DELETE /api/clients/:id`

Delete a client.

**Success `200 OK`:**
```typescript
{ success: true }
```

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 404 | `NOT_FOUND` | Client not found |
| 409 | `CLIENT_HAS_INVOICES` | One or more non-void invoices exist for this client |

---

#### `GET /api/clients/:id/invoices`

List all invoices associated with a specific client.

**Query parameters:**
```
page?:   number
limit?:  number         // default: 20; max: 100
status?: InvoiceStatus  // filter; "overdue" triggers dueDate < today check
```

**Success `200 OK`:**
```typescript
interface ListClientInvoicesResponse {
  data: InvoiceSummary[];
  meta: { total: number; page: number; limit: number };
}
```

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 404 | `NOT_FOUND` | Client not found |

---

### Invoices

---

#### `GET /api/invoices/next-number`

Return the next auto-generated invoice number without reserving it or incrementing the counter.

**Success `200 OK`:**
```typescript
interface NextNumberResponse {
  data: {
    invoiceNumber: string;  // e.g. "INV-0024"
  };
}
```

---

#### `GET /api/invoices`

List all invoices for the authenticated user.

**Query parameters:**
```
page?:    number
limit?:   number           // default: 20; max: 100
status?:  InvoiceStatus    // filter; "overdue" triggers computed dueDate < today check
clientId?: UUID            // filter to a specific client
search?:  string           // case-insensitive match on invoiceNumber or clientName
sortBy?:  "dueDate" | "createdAt" | "total" | "invoiceNumber"   // default: "createdAt"
sortDir?: "asc" | "desc"   // default: "desc"
```

**Success `200 OK`:**
```typescript
interface ListInvoicesResponse {
  data: InvoiceSummary[];
  meta: { total: number; page: number; limit: number };
}
```
Note: when `status=overdue` is passed, the server queries for stored status `sent` or `partial` where `dueDate < today`. All returned items have `status: "overdue"` in the response.

---

#### `POST /api/invoices`

Create a new invoice. Always creates with `status: "draft"`.

**Request body:**
```typescript
interface CreateInvoiceRequest {
  clientId: UUID;                          // required
  invoiceNumber?: string;                  // optional override; omit for auto-generation
  issueDate: ISODate;                      // required
  dueDate: ISODate;                        // required; must be ≥ issueDate
  currency?: CurrencyCode;                 // defaults to client.currency
  lineItems: CreateLineItemRequest[];      // required; min 1 element
  taxRate?: number | null;                 // percentage; null = no tax
  discountType?: DiscountType | null;
  discountValue?: number;                  // percentage or Cents; 0 or omit for no discount
  notes?: string | null;
  terms?: string | null;
}

interface CreateLineItemRequest {
  description: string;     // required
  quantity: number;        // required; must be > 0
  unitPrice: Cents;        // required; must be ≥ 0 (integer)
  taxable?: boolean;       // default: false
}
```

**Success `201 Created`:**
```typescript
interface CreateInvoiceResponse {
  data: Invoice;
}
```
Side effects:
- If `invoiceNumber` is omitted, the server generates it from `{invoicePrefix}-{zero-padded nextInvoiceNumber}` and increments `BusinessProfile.nextInvoiceNumber`.
- Server computes and stores `subtotal`, `taxAmount`, `discountAmount`, `total`, `amountPaid: 0`, `amountDue: total`.

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 400 | `VALIDATION_ERROR` | Missing required fields, quantity ≤ 0, unitPrice is not an integer, dueDate < issueDate |
| 404 | `NOT_FOUND` | `clientId` does not reference an existing client |
| 409 | `DUPLICATE_INVOICE_NUMBER` | Provided `invoiceNumber` already exists for this user |

---

#### `GET /api/invoices/:id`

Fetch full invoice details.

**Success `200 OK`:**
```typescript
interface GetInvoiceResponse {
  data: Invoice;
}
```
Overdue override is applied to `status` in the response.

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 404 | `NOT_FOUND` | Invoice not found or belongs to a different user |

---

#### `PATCH /api/invoices/:id`

Update a draft invoice. Only `draft` invoices may be edited.

**Request body:**
```typescript
interface UpdateInvoiceRequest {
  clientId?: UUID;
  invoiceNumber?: string;
  issueDate?: ISODate;
  dueDate?: ISODate;
  currency?: CurrencyCode;
  lineItems?: UpdateLineItemRequest[];  // if provided, REPLACES all existing line items
  taxRate?: number | null;
  discountType?: DiscountType | null;
  discountValue?: number;
  notes?: string | null;
  terms?: string | null;
}

interface UpdateLineItemRequest {
  id?: UUID;            // omit to insert a new line item; provide to update an existing one
  description: string;
  quantity: number;     // must be > 0
  unitPrice: Cents;     // integer
  taxable?: boolean;
}
```

**Success `200 OK`:**
```typescript
interface UpdateInvoiceResponse {
  data: Invoice;
}
```
Server recomputes all monetary totals after update.

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 400 | `INVOICE_NOT_EDITABLE` | Stored status is not `draft` |
| 400 | `VALIDATION_ERROR` | Invalid field values; `field` set |
| 404 | `NOT_FOUND` | Invoice not found |
| 409 | `DUPLICATE_INVOICE_NUMBER` | New `invoiceNumber` conflicts with another invoice |

---

#### `DELETE /api/invoices/:id`

Soft-delete a draft invoice. Only `draft` invoices can be deleted this way; non-drafts must be voided.

**Success `200 OK`:**
```typescript
{ success: true }
```
Sets `deletedAt` timestamp on the invoice record. Deleted invoices are excluded from all list and stat queries.

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 400 | `INVOICE_NOT_EDITABLE` | Stored status is not `draft` |
| 404 | `NOT_FOUND` | Invoice not found |

---

#### `POST /api/invoices/:id/send`

Mark an invoice as sent and optionally email the PDF.

**Request body:**
```typescript
interface SendInvoiceRequest {
  recipientEmail: string;  // required; valid email address
  message?: string;        // optional email body text; max 1000 characters
}
```

**Success `200 OK`:**
```typescript
interface SendInvoiceResponse {
  data: Invoice;  // updated invoice: status "sent", sentAt set
}
```
Side effects:
- Sets `status: "sent"` and `sentAt` to current UTC timestamp.
- If `SMTP_HOST` env var is set: generates PDF, sends email to `recipientEmail` with subject `Invoice {invoiceNumber} from {businessName}`, optional `message` in body, PDF attachment.
- If `SMTP_HOST` is not set: skips email silently; send still succeeds.

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 400 | `INVALID_STATUS_TRANSITION` | Stored status is not `draft` |
| 400 | `VALIDATION_ERROR` | `recipientEmail` is not a valid email |
| 404 | `NOT_FOUND` | Invoice not found |

---

#### `POST /api/invoices/:id/void`

Void an invoice.

**Request body:** none

**Success `200 OK`:**
```typescript
interface VoidInvoiceResponse {
  data: Invoice;  // updated invoice: status "void"
}
```

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 400 | `INVALID_STATUS_TRANSITION` | Stored status is `paid` or already `void` |
| 404 | `NOT_FOUND` | Invoice not found |

---

#### `POST /api/invoices/:id/duplicate`

Create a new draft invoice copied from an existing one.

**Request body:** none

**Success `201 Created`:**
```typescript
interface DuplicateInvoiceResponse {
  data: Invoice;  // new draft invoice
}
```
The duplicated invoice inherits: `clientId`, `currency`, `lineItems` (copied by value), `taxRate`, `discountType`, `discountValue`, `notes`, `terms`.
The duplicated invoice receives: auto-generated `invoiceNumber`, `status: "draft"`, `issueDate: today`, `dueDate: today + businessProfile.defaultPaymentTermsDays`, `amountPaid: 0`.

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 404 | `NOT_FOUND` | Invoice not found |

---

#### `GET /api/invoices/:id/pdf`

Generate and stream the invoice as a PDF file.

**Success `200 OK`:**
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="<invoiceNumber>.pdf"`
- Body: binary PDF stream (A4, generated server-side via `@react-pdf/renderer`)

**Errors (JSON body):**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 400 | `INVOICE_VOID` | Invoice status is `void` |
| 404 | `NOT_FOUND` | Invoice not found |
| 500 | `PDF_GENERATION_FAILED` | Unexpected error during PDF generation |

---

### Payments

---

#### `GET /api/invoices/:id/payments`

List all payments recorded for an invoice.

**Success `200 OK`:**
```typescript
interface ListPaymentsResponse {
  data: Payment[];  // sorted by paidAt descending
}
```

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 404 | `NOT_FOUND` | Invoice not found |

---

#### `POST /api/invoices/:id/payments`

Record a payment against an invoice.

**Request body:**
```typescript
interface CreatePaymentRequest {
  amount: Cents;              // required; integer > 0 and ≤ current amountDue
  method: PaymentMethod;      // required
  paidAt?: ISODate;           // defaults to today (UTC); must not be a future date
  reference?: string | null;  // max 200 characters
  notes?: string | null;      // max 500 characters
}
```

**Success `201 Created`:**
```typescript
interface CreatePaymentResponse {
  data: {
    payment: Payment;
    invoice: Invoice;  // updated invoice: new amountPaid, amountDue, status
  };
}
```
Side effects:
- Inserts payment record.
- Recalculates invoice `amountPaid` (sum of all payments) and `amountDue` (`total − amountPaid`).
- If `amountPaid === invoice.total`: sets stored status to `paid`, sets invoice `paidAt` to this payment's `paidAt`.
- If `amountPaid < invoice.total`: sets stored status to `partial`.

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 400 | `INVALID_STATUS_TRANSITION` | Stored status is `draft`, `paid`, or `void` |
| 400 | `VALIDATION_ERROR` | `amount ≤ 0`, `amount > amountDue`, invalid `method`, `paidAt` is a future date |
| 404 | `NOT_FOUND` | Invoice not found |

---

#### `DELETE /api/invoices/:id/payments/:paymentId`

Delete a recorded payment and re-evaluate invoice status.

**Success `200 OK`:**
```typescript
interface DeletePaymentResponse {
  data: {
    invoice: Invoice;  // updated invoice: recalculated amountPaid, amountDue, status
  };
}
```
Side effects:
- Removes payment record.
- Recalculates invoice `amountPaid` and `amountDue`.
- Re-evaluates status:
  - `amountPaid === 0` → stored status reverts to `sent`.
  - `0 < amountPaid < total` → stored status remains/becomes `partial`.

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 404 | `NOT_FOUND` | Payment not found, or does not belong to this invoice |

---

### Catalog Items

---

#### `GET /api/catalog`

List all catalog items for the authenticated user.

**Query parameters:**
```
search?: string  // case-insensitive substring match on name and description
```

**Success `200 OK`:**
```typescript
interface ListCatalogResponse {
  data: CatalogItem[];  // all items (no pagination); sorted by name ascending
}
```

---

#### `POST /api/catalog`

Create a catalog item.

**Request body:**
```typescript
interface CreateCatalogItemRequest {
  name: string;                 // required
  description?: string | null;
  unitPrice: Cents;             // required; integer ≥ 0
  unit?: string | null;         // e.g. "hour", "day"; max 20 characters
  taxable?: boolean;            // default: false
}
```

**Success `201 Created`:**
```typescript
interface CreateCatalogItemResponse {
  data: CatalogItem;
}
```

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 400 | `VALIDATION_ERROR` | `name` missing, `unitPrice` < 0 or non-integer |
| 400 | `CATALOG_LIMIT_EXCEEDED` | User already has 500 catalog items |

---

#### `PATCH /api/catalog/:id`

Update a catalog item (partial update).

**Request body:**
```typescript
interface UpdateCatalogItemRequest {
  name?: string;
  description?: string | null;
  unitPrice?: Cents;
  unit?: string | null;
  taxable?: boolean;
}
```

**Success `200 OK`:**
```typescript
interface UpdateCatalogItemResponse {
  data: CatalogItem;
}
```

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 400 | `VALIDATION_ERROR` | `name` is empty, `unitPrice` is negative or non-integer |
| 404 | `NOT_FOUND` | Catalog item not found |

---

#### `DELETE /api/catalog/:id`

Delete a catalog item.

**Success `200 OK`:**
```typescript
{ success: true }
```
No effect on existing invoice line items (they store values by copy).

**Errors:**
| HTTP | `code` | Condition |
|------|--------|-----------|
| 404 | `NOT_FOUND` | Catalog item not found |

---

### Dashboard

---

#### `GET /api/dashboard/stats`

Return all dashboard aggregates in a single request.

**Success `200 OK`:**
```typescript
interface DashboardStatsResponse {
  data: DashboardStats;
}
```
All monetary totals are computed only over invoices in `businessProfile.defaultCurrency`. Invoices in other currencies are excluded from aggregate calculations.

---

## UI Component → API Endpoint Map

| Component / Page | Method | Endpoint | Trigger | Response Handling |
|-----------------|--------|----------|---------|-------------------|
| `RegisterPage` | POST | `/api/auth/register` | "Create Account" form submit | Success → redirect to `/onboarding`. HTTP 409 → inline error "An account with this email already exists." HTTP 400 → highlight invalid field. |
| `LoginPage` | POST | `/api/auth/login` | "Sign In" form submit | Success → redirect to `/dashboard`. HTTP 401 → inline error "Invalid email or password." |
| `LogoutButton` | POST | `/api/auth/logout` | Click | Clear local React state and router cache. Redirect to `/login`. |
| `ClientInterceptor` (global fetch wrapper) | POST | `/api/auth/refresh` | Any API call returns HTTP 401 | Retry original request. If retry returns 401 → clear state, redirect `/login`. |
| `ForgotPasswordPage` | POST | `/api/auth/forgot-password` | Form submit | Always display: "If that email is registered, you'll receive a reset link shortly." |
| `ResetPasswordPage` | POST | `/api/auth/reset-password` | Form submit | Success → redirect `/login?reset=true`. HTTP 400 TOKEN_INVALID/TOKEN_USED → "This link is invalid or has expired. Please request a new one." |
| `OnboardingPage` — logo field | POST | `/api/profile/logo` | Logo file selected (onChange) | Success → store `logoUrl` in component state, render preview. HTTP 413 → "File is too large (max 2 MB)." HTTP 415 → "Only JPEG and PNG files are accepted." |
| `OnboardingPage` — finish | PATCH | `/api/profile` | "Finish Setup" click | Success → redirect `/dashboard`. |
| `SettingsPage` — mount | GET | `/api/profile` | Page mount | Populate all form fields with returned `BusinessProfile`. |
| `SettingsPage` — save | PATCH | `/api/profile` | "Save Changes" submit | Success → show toast "Profile updated." HTTP 400 → highlight invalid fields. |
| `LogoUpload` — upload | POST | `/api/profile/logo` | File input `onChange` | Success → update parent state with new `logoUrl`, render new preview. |
| `LogoUpload` — remove | DELETE | `/api/profile/logo` | "Remove Logo" click | Success → set `logoUrl` to `null` in parent state, clear preview. |
| `DashboardPage` — mount | GET | `/api/dashboard/stats` | Page mount | Populate all four stat cards and both invoice widgets. |
| `RecentInvoicesWidget` | — | — | — | Renders `data.recentInvoices` from `DashboardStats`. No separate fetch. |
| `OverdueInvoicesWidget` | — | — | — | Renders `data.overdueInvoices` from `DashboardStats`. No separate fetch. |
| `InvoiceListPage` — mount | GET | `/api/invoices` | Page mount | Render invoice table rows. Sync filter/sort/page values to URL search params. |
| `InvoiceListPage` — filter change | GET | `/api/invoices` | Status filter, search input (debounced 300 ms), sort header click, page change | Re-fetch with updated query params. Replace URL in browser history. |
| `InvoiceListPage` — download row | GET | `/api/invoices/:id/pdf` | "Download PDF" row action click | Trigger browser file download via `<a href=... download>`. |
| `InvoiceNewPage` — mount | GET | `/api/invoices/next-number` | Page mount | Pre-fill the invoice number input. |
| `InvoiceNewPage` — client autocomplete | GET | `/api/clients?search=<q>` | User types in client field (debounced 300 ms) | Render dropdown of matching `Client` objects. On selection, populate client field and set `currency` default. |
| `InvoiceNewPage` — line item catalog search | GET | `/api/catalog?search=<q>` | User types in line item description (debounced 300 ms) | Render suggestions. On selection, set description, unitPrice, taxable. |
| `InvoiceNewPage` — save | POST | `/api/invoices` | "Save as Draft" submit | Success → redirect to `/invoices/:id`. HTTP 400 → show field errors inline. HTTP 409 DUPLICATE_INVOICE_NUMBER → "Invoice number already in use." |
| `InvoiceDetailPage` — mount | GET | `/api/invoices/:id` | Page mount | Render all invoice fields and status badge. |
| `InvoiceDetailPage` — payments mount | GET | `/api/invoices/:id/payments` | Page mount (concurrent with invoice fetch) | Render payment history list. |
| `InvoiceDetailPage` — edit (draft only) | PATCH | `/api/invoices/:id` | "Save" in edit mode | Success → update invoice state, show toast "Invoice saved." HTTP 400 INVOICE_NOT_EDITABLE → "This invoice cannot be edited." |
| `InvoiceDetailPage` — delete (draft only) | DELETE | `/api/invoices/:id` | "Delete" → confirmation modal confirm | Success → redirect to `/invoices`, show toast "Invoice deleted." |
| `SendInvoiceModal` — submit | POST | `/api/invoices/:id/send` | "Send" button in modal | Success → close modal, update invoice status badge to `sent`, show toast "Invoice sent." HTTP 400 INVALID_STATUS_TRANSITION → close modal, refresh page. |
| `RecordPaymentModal` — submit | POST | `/api/invoices/:id/payments` | "Save Payment" button | Success → close modal, update invoice state (status badge, amountDue row), prepend new payment to history list. |
| `PaymentHistoryItem` — delete | DELETE | `/api/invoices/:id/payments/:paymentId` | Trash icon → inline confirm | Success → remove payment from list, update invoice state (amountPaid, amountDue, status). |
| `VoidInvoiceModal` — confirm | POST | `/api/invoices/:id/void` | "Confirm Void" button | Success → close modal, set invoice status to `void`, hide Send/Record Payment/Edit buttons. |
| `DuplicateInvoiceButton` | POST | `/api/invoices/:id/duplicate` | "Duplicate Invoice" menu item | Success → redirect to `/invoices/<newId>`. |
| `DownloadPdfButton` | GET | `/api/invoices/:id/pdf` | "Download PDF" button | Trigger file download. HTTP 400 INVOICE_VOID → show toast "Cannot download PDF for a voided invoice." |
| `ClientListPage` — mount | GET | `/api/clients` | Page mount | Render client table. |
| `ClientListPage` — search | GET | `/api/clients?search=<q>` | Search input change (debounced 300 ms) | Re-render table with filtered results. |
| `ClientListPage` — add modal submit | POST | `/api/clients` | "Save" in Add Client modal | Success → close modal, prepend new client to list. HTTP 400 → highlight invalid fields. |
| `ClientDetailPage` — mount | GET | `/api/clients/:id` | Page mount | Render client profile with stats. |
| `ClientDetailPage` — invoices | GET | `/api/clients/:id/invoices` | Page mount (concurrent) | Render invoice history table. |
| `ClientDetailPage` — edit submit | PATCH | `/api/clients/:id` | "Save Changes" | Success → update displayed fields, show toast "Client updated." |
| `ClientDetailPage` — delete | DELETE | `/api/clients/:id` | "Delete Client" → confirmation modal | Success → redirect to `/clients`. HTTP 409 CLIENT_HAS_INVOICES → show error in modal: "This client has existing invoices and cannot be deleted." |
| `CatalogPage` — mount | GET | `/api/catalog` | Page mount | Render catalog item list. |
| `CatalogPage` — add item | POST | `/api/catalog` | "Save" in Add Item form | Success → append item to list. HTTP 400 CATALOG_LIMIT_EXCEEDED → "You've reached the 500 item limit." |
| `CatalogPage` — edit item | PATCH | `/api/catalog/:id` | "Save" in Edit Item form | Success → update item in list in place. |
| `CatalogPage` — delete item | DELETE | `/api/catalog/:id` | Trash icon → inline confirm | Success → remove item from list. |

---

## Environment Variables

All variables must be present at application startup. The server throws an error and refuses to start if any **Required** variable is missing.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string. Format: `postgresql://user:password@host:port/dbname?schema=public` |
| `JWT_ACCESS_SECRET` | **Yes** | — | Secret for signing access token JWTs. Minimum 32 characters. Must differ from `JWT_REFRESH_SECRET`. |
| `JWT_REFRESH_SECRET` | **Yes** | — | Secret for signing refresh token JWTs. Minimum 32 characters. |
| `JWT_ACCESS_EXPIRES_IN` | No | `"15m"` | Access token TTL in `ms` / `jsonwebtoken` format (e.g. `"15m"`, `"900"`). |
| `JWT_REFRESH_EXPIRES_IN` | No | `"7d"` | Refresh token TTL. |
| `NEXT_PUBLIC_APP_URL` | **Yes** | — | Public base URL of the application, no trailing slash. E.g. `https://app.invoicer.io`. Used in password reset email links. |
| `NODE_ENV` | No | `"development"` | `"development"` or `"production"`. Controls cookie `Secure` flag and storage provider default. |
| `STORAGE_PROVIDER` | No | `"local"` | `"local"` for local filesystem or `"s3"` for AWS S3. Production deployments must use `"s3"`. |
| `LOCAL_UPLOAD_DIR` | No | `"./public/uploads"` | Absolute or relative path for local file storage. Only used when `STORAGE_PROVIDER=local`. |
| `AWS_ACCESS_KEY_ID` | If `STORAGE_PROVIDER=s3` | — | AWS IAM credentials for S3 access. |
| `AWS_SECRET_ACCESS_KEY` | If `STORAGE_PROVIDER=s3` | — | AWS IAM credentials for S3 access. |
| `AWS_S3_BUCKET` | If `STORAGE_PROVIDER=s3` | — | S3 bucket name. Bucket must have public read enabled for logo URLs to resolve. |
| `AWS_S3_REGION` | If `STORAGE_PROVIDER=s3` | — | AWS region, e.g. `"us-east-1"`. |
| `SMTP_HOST` | No | — | SMTP server hostname. If absent, all email sending is skipped without error. |
| `SMTP_PORT` | No | `587` | SMTP server port. |
| `SMTP_SECURE` | No | `"false"` | `"true"` to use TLS (port 465). `"false"` for STARTTLS (port 587). |
| `SMTP_USER` | If `SMTP_HOST` set | — | SMTP authentication username. |
| `SMTP_PASSWORD` | If `SMTP_HOST` set | — | SMTP authentication password. |
| `SMTP_FROM` | If `SMTP_HOST` set | — | From address for all sent emails. E.g. `"Invoicer <noreply@invoicer.io>"`. |

---

## Third-Party Services

### PostgreSQL (via Prisma)

- **Role:** Primary relational database. Stores all application data: users, profiles, clients, invoices, line items, payments, catalog items, refresh tokens, password reset tokens.
- **Library:** `prisma` (`@prisma/client`)
- **Usage notes:**
  - All database access is isolated to server-side route handlers and service modules. `PrismaClient` is never imported in files containing `"use client"`.
  - A single `PrismaClient` instance is shared across the application via a module-level singleton (`lib/db.ts`) to avoid connection pool exhaustion in development (Next.js hot reload).
  - Migrations are managed via `prisma migrate dev` (development) and `prisma migrate deploy` (production CI/CD).
  - Soft-delete pattern: invoices include a `deletedAt: DateTime?` column; all queries filter `WHERE deletedAt IS NULL`.

### AWS S3

- **Role:** Object storage for business logo files in production.
- **Library:** `@aws-sdk/client-s3` (`PutObjectCommand`, `DeleteObjectCommand`)
- **Usage notes:**
  - Upload path: `logos/<userId>/<uuid>.<ext>`. UUID is generated per upload to prevent cache collisions.
  - Stored URL format: `https://<bucket>.s3.<region>.amazonaws.com/logos/<userId>/<uuid>.<ext>`.
  - S3 objects are created with `ACL: "public-read"` so logo URLs are directly accessible in PDF templates and the browser.
  - On `DELETE /api/profile/logo`, the server calls `DeleteObjectCommand` before nulling `BusinessProfile.logoUrl`.
  - In development (`STORAGE_PROVIDER=local`), files are written to `LOCAL_UPLOAD_DIR` and served by Next.js static file middleware at `/uploads/<filename>`.

### SMTP Server / Nodemailer

- **Role:** Transactional email delivery for invoice send and password reset flows.
- **Library:** `nodemailer`
- **Usage notes:**
  - A single `mailer.ts` module exports a `sendMail(options)` function that wraps `nodemailer.createTransport()`.
  - If `SMTP_HOST` is not set, `sendMail()` is a no-op that logs a `warn` message. No error is thrown.
  - Compatible with any SMTP provider: SendGrid (`smtp.sendgrid.net:587`), Postmark (`smtp.postmarkapp.com:587`), AWS SES, Gmail (not recommended for production).
  - **Invoice send email:**
    - `Subject:` `Invoice {invoiceNumber} from {businessName}`
    - `To:` `recipientEmail` from request body
    - `From:` `SMTP_FROM`
    - `Body:` Minimal HTML email containing the optional `message` field
    - `Attachment:` PDF buffer generated by `@react-pdf/renderer`, `filename: "{invoiceNumber}.pdf"`
  - **Password reset email:**
    - `Subject:` `Reset your Invoicer password`
    - `Body:` HTML containing a single CTA button linking to `{NEXT_PUBLIC_APP_URL}/reset-password?token=<token>`

### @react-pdf/renderer

- **Role:** Server-side PDF generation for invoice downloads and email attachments.
- **Library:** `@react-pdf/renderer`
- **Usage notes:**
  - A `generateInvoicePdf(invoice: Invoice, profile: BusinessProfile, client: Client): Promise<Buffer>` function renders a React PDF component tree to a binary `Buffer`.
  - This function is called exclusively in server-side route handlers. It must never be imported into client-side component files.
  - The PDF template uses inline styles (React PDF does not support Tailwind or CSS classes). Design tokens from F-11 are applied as JavaScript style objects.
  - If `profile.logoUrl` is set, the PDF renderer fetches the image bytes and embeds them. Logo fetch errors are caught and the PDF is generated without the logo rather than failing the request.
  - PDF is streamed directly to the HTTP response for `GET /api/invoices/:id/pdf`. For email attachments, the buffer is passed to `nodemailer` as `{ filename, content: buffer }`.
