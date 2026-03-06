# Invoicer — Functional Specification

## Product Goal

Invoicer is a premium dark-UI invoice generator SaaS that lets freelancers and small business owners create professional invoices, manage clients, and manually track payment status entirely in the browser — no accounting knowledge required.

---

## User Roles

| Role  | Description |
|-------|-------------|
| Owner | The single authenticated user per account. Creates and owns all invoices, clients, catalog items, and the business profile. |

Multi-user accounts are out of scope for v1.0.

---

## User Flows

### Flow 1 — Sign Up and Onboarding

1. User visits the landing page at `/`.
2. User clicks the "Get Started Free" CTA.
3. User is navigated to `/register`.
4. User fills in: **Full Name** (required), **Email Address** (required), **Password** (required, min 8 chars, ≥ 1 uppercase letter, ≥ 1 digit).
5. User clicks "Create Account" → `POST /api/auth/register`.
6. On success, the server sets `invoicer_access` (httpOnly cookie, 15 min) and `invoicer_refresh` (httpOnly cookie, 7 days) and returns the created user object.
7. Frontend redirects to `/onboarding`.
8. **Onboarding Step 1 — Business Identity:** User enters **Business Name** (required). Optionally uploads a **Logo** (JPEG or PNG, max 2 MB) → `POST /api/profile/logo`. Logo preview is shown immediately on upload.
9. **Onboarding Step 2 — Business Details:** User enters **Address** (optional), **Phone** (optional), **Default Currency** (required, default `"USD"`), **Default Tax Rate %** (optional), **Default Payment Terms** in days (optional, default `30`), **Invoice Prefix** (optional, default `"INV"`), **Invoice Starting Number** (optional, default `1`).
10. User clicks "Finish Setup" → `PATCH /api/profile`.
11. On success, frontend redirects to `/dashboard`.

---

### Flow 2 — Create and Send an Invoice

1. From `/dashboard` or `/invoices`, user clicks "New Invoice".
2. User is navigated to `/invoices/new`.
3. The invoice form pre-populates: **Invoice Number** (from `GET /api/invoices/next-number`), **Issue Date** (today), **Due Date** (today + default payment terms days).
4. User types in the **Client** autocomplete field → `GET /api/clients?search=<query>` (debounced 300 ms). User selects an existing client from the dropdown. Alternatively, user clicks "Add New Client" to open the client creation modal.
5. User adds at least one **Line Item**: each requires **Description** (required) and **Unit Price** (required, integer cents). **Quantity** defaults to `1`. All totals recalculate in real time client-side.
6. Typing in a line item description field → `GET /api/catalog?search=<query>` (debounced 300 ms). Selecting a catalog suggestion auto-fills description, unit price, and taxable flag.
7. Optionally, user adjusts: **Tax Rate %**, **Discount** (percentage or fixed amount), **Notes**, **Payment Terms** text.
8. User clicks "Save as Draft" → `POST /api/invoices`.
9. On success, frontend redirects to `/invoices/:id`.
10. From the invoice detail page, user clicks "Send Invoice".
11. **Send Invoice Modal** opens. **Recipient Email** is pre-filled from the client record. User may add an optional **Message** (≤ 1000 chars).
12. User clicks "Send" → `POST /api/invoices/:id/send`.
13. Server marks the invoice `status: "sent"`, sets `sentAt`. If SMTP is configured, emails the PDF to the recipient. If SMTP is not configured, the action still succeeds silently.
14. Modal closes. Invoice detail refreshes to show `sent` status badge.

---

### Flow 3 — Record a Payment

1. User opens an invoice with status `sent`, `partial`, or `overdue`.
2. User clicks "Record Payment".
3. **Record Payment Modal** opens with: **Amount** pre-filled to `amountDue`, **Date** defaulting to today, **Method** defaulting to `"Cash"`, optional **Reference**, optional **Note**.
4. User adjusts fields and clicks "Save Payment" → `POST /api/invoices/:id/payments`.
5. Server records the payment and recalculates `amountPaid` and `amountDue`:
   - If `amountPaid === invoice.total` → status becomes `paid`, `paidAt` is set.
   - If `amountPaid < invoice.total` → status becomes `partial`.
6. Modal closes. Invoice detail page refreshes: updated status badge, updated totals row, new entry in the **Payment History** section.

---

### Flow 4 — Add and Manage Clients

1. User navigates to `/clients`.
2. Client list displays all clients with columns: **Name**, **Company**, **Email**, **Total Invoiced**, **Outstanding**, **Last Invoice Date**.
3. User may search the list (debounced `GET /api/clients?search=<query>`).
4. User clicks "Add Client". **Client Form** (modal) opens with fields: **Name** (required), **Email**, **Phone**, **Company**, **Address** (line 1, line 2, city, state, postal code, country), **Currency** (defaults to business default), **Notes**.
5. User clicks "Save" → `POST /api/clients`. New client appears at the top of the list.
6. User clicks a client row → navigates to `/clients/:id`.
7. Client detail page shows the client profile, computed stats (**Total Invoiced**, **Total Paid**, **Balance Due**), and a filterable invoice history table.
8. User clicks "Edit" → edits inline → `PATCH /api/clients/:id`. Success: toast "Client updated."
9. User clicks "Delete" → confirmation modal → `DELETE /api/clients/:id`.
   - If client has non-void invoices: API returns `409`. Modal shows: "This client has existing invoices and cannot be deleted."

---

### Flow 5 — View Dashboard

1. User navigates to `/dashboard`.
2. Page mounts → `GET /api/dashboard/stats`.
3. Dashboard renders:
   - **Stat Card — Total Outstanding**: sum of `amountDue` across all `sent`, `partial`, and overdue invoices.
   - **Stat Card — Total Overdue**: sum of `amountDue` for invoices where `dueDate < today` and status is `sent` or `partial`.
   - **Stat Card — Paid This Month**: sum of `total` for invoices with `paidAt` in the current calendar month.
   - **Recent Invoices widget**: last 5 invoices (any status), sorted by `createdAt` desc. Shows: client name, invoice number, total, status badge, due date.
   - **Overdue Invoices widget**: all overdue invoices sorted by `dueDate` ascending. Shows: client name, invoice number, `amountDue`, days overdue.
4. Clicking any invoice navigates to `/invoices/:id`.

---

### Flow 6 — Manage Catalog Items

1. User navigates to `/settings/catalog`.
2. Page mounts → `GET /api/catalog`. Renders the catalog item list.
3. User clicks "Add Item". **Catalog Item Form** opens: **Name** (required), **Description** (optional), **Unit Price** (required, integer cents), **Unit Label** (optional, e.g. `"hour"`), **Taxable** toggle (default off).
4. User clicks "Save" → `POST /api/catalog`. Item appears in list.
5. User can edit an item → `PATCH /api/catalog/:id` or delete → `DELETE /api/catalog/:id` (confirmation required).

---

### Flow 7 — Void or Duplicate an Invoice

1. From `/invoices/:id`, user opens the "More Actions" menu (⋮ icon, top-right).
2. **Void:** User selects "Void Invoice" (available when status is `draft`, `sent`, or `partial`).
   - Confirmation modal: "Voiding this invoice is permanent and cannot be undone. Continue?"
   - User confirms → `POST /api/invoices/:id/void`.
   - Invoice status changes to `void`. All action buttons (Send, Record Payment) are hidden. Invoice is read-only.
3. **Duplicate:** User selects "Duplicate Invoice" (available for any status).
   - → `POST /api/invoices/:id/duplicate`.
   - Server creates a new `draft` invoice: same client, line items, tax, discount, notes, and terms. New invoice number auto-generated. Issue date = today, due date = today + `defaultPaymentTermsDays`.
   - Frontend redirects to `/invoices/<newId>`.

---

### Flow 8 — Download Invoice as PDF

1. From `/invoices/:id` or the row actions in `/invoices`, user clicks "Download PDF".
2. Browser triggers `GET /api/invoices/:id/pdf`.
3. Server generates the PDF from current invoice + business profile data.
4. Response: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="<invoiceNumber>.pdf"`.
5. Browser downloads the file automatically.

---

### Flow 9 — Update Business Profile

1. User navigates to `/settings`.
2. Page mounts → `GET /api/profile`. Form is populated with existing profile data.
3. User edits fields and clicks "Save Changes" → `PATCH /api/profile`. Success: toast "Profile updated."
4. To replace the logo, user clicks the logo preview area → file picker opens → `POST /api/profile/logo`. Logo URL is saved immediately; no separate form submit needed.
5. To remove the logo, user clicks "Remove Logo" → `DELETE /api/profile/logo`.

---

### Flow 10 — Forgot / Reset Password

1. From `/login`, user clicks "Forgot password?"
2. User navigates to `/forgot-password` and enters their email → `POST /api/auth/forgot-password`.
3. UI always shows: "If that email is registered, you'll receive a reset link shortly." (Prevents user enumeration.)
4. If email is registered, server sends an email with a signed reset link valid for 1 hour.
5. User clicks the reset link → navigates to `/reset-password?token=<token>`.
6. User enters and confirms new password → `POST /api/auth/reset-password`.
7. On success: token is invalidated. Frontend redirects to `/login`. Toast: "Password updated. Please sign in."

---

## Feature List and Acceptance Criteria

### F-01 Authentication

| AC | Criterion |
|----|-----------|
| AC-01-1 | User can register with a unique email, full name, and password. Submitting a duplicate email returns HTTP 409 with `code: "EMAIL_TAKEN"`. The form displays the message "An account with this email already exists." |
| AC-01-2 | Password is validated client-side before submission: minimum 8 characters, at least 1 uppercase letter, at least 1 digit. Failures show an inline error and prevent form submission. The same rules are enforced server-side; violations return HTTP 400 with `code: "VALIDATION_ERROR"` and `field: "password"`. |
| AC-01-3 | On successful login or registration, two httpOnly, Secure, SameSite=Strict cookies are set: `invoicer_access` (JWT, 15-minute expiry) and `invoicer_refresh` (JWT, 7-day expiry). |
| AC-01-4 | Any protected API route called without a valid `invoicer_access` cookie returns HTTP 401 with `code: "UNAUTHORIZED"`. |
| AC-01-5 | The frontend HTTP client intercepts any HTTP 401 response, silently calls `POST /api/auth/refresh`, and retries the original request once. If the refresh request also returns 401, all local state is cleared and the user is redirected to `/login`. |
| AC-01-6 | `POST /api/auth/logout` clears both cookies (sets them as expired) and marks the refresh token record as used in the database. Any subsequent `POST /api/auth/refresh` using the same refresh token returns HTTP 401. |
| AC-01-7 | `POST /api/auth/forgot-password` sends a password reset email with a link formatted as `{NEXT_PUBLIC_APP_URL}/reset-password?token=<signed_token>`. The token is valid for exactly 1 hour. |
| AC-01-8 | A password reset token is single-use. After a successful reset, the token's `usedAt` field is set. Any subsequent attempt with the same token returns HTTP 400 with `code: "TOKEN_USED"`. |

---

### F-02 Business Profile

| AC | Criterion |
|----|-----------|
| AC-02-1 | `businessName` is required. `PATCH /api/profile` with an empty or missing `businessName` returns HTTP 400 with `code: "VALIDATION_ERROR"` and `field: "businessName"`. |
| AC-02-2 | Logo upload via `POST /api/profile/logo` accepts only `image/jpeg` and `image/png` MIME types. Files > 2 MB return HTTP 413. Invalid MIME types return HTTP 415. |
| AC-02-3 | `defaultCurrency` is stored as an ISO 4217 code. The currency dropdown lists at minimum these 20 codes: `USD`, `EUR`, `GBP`, `CAD`, `AUD`, `JPY`, `CHF`, `HKD`, `SGD`, `MXN`, `BRL`, `INR`, `NOK`, `SEK`, `DKK`, `NZD`, `ZAR`, `AED`, `SAR`, `PLN`. |
| AC-02-4 | `invoicePrefix` (string, default `"INV"`) and `nextInvoiceNumber` (integer ≥ 1, default `1`) are configurable. Changing them does not alter existing invoice numbers. |
| AC-02-5 | A `BusinessProfile` record with default values is automatically created alongside every new `User` record during registration. |

---

### F-03 Client Management

| AC | Criterion |
|----|-----------|
| AC-03-1 | `name` is required. `POST /api/clients` or `PATCH /api/clients/:id` with an empty or missing `name` returns HTTP 400 with `code: "VALIDATION_ERROR"` and `field: "name"`. |
| AC-03-2 | `GET /api/clients?search=<query>` performs a case-insensitive substring match across the `name`, `email`, and `company` fields and returns matching clients. |
| AC-03-3 | `GET /api/clients/:id` returns `totalInvoiced` (sum of all invoice totals for this client), `totalPaid` (sum of all payment amounts), and `totalOutstanding` (`totalInvoiced − totalPaid`). Void invoices are excluded from all three sums. |
| AC-03-4 | `DELETE /api/clients/:id` returns HTTP 409 with `code: "CLIENT_HAS_INVOICES"` if any non-void invoice exists for that client. The UI displays: "This client has existing invoices and cannot be deleted." |
| AC-03-5 | If `currency` is not provided on client creation, it defaults to `businessProfile.defaultCurrency`. When creating an invoice for a client, the invoice `currency` defaults to the client's `currency` value. |

---

### F-04 Invoice Creation

| AC | Criterion |
|----|-----------|
| AC-04-1 | On page load of `/invoices/new`, the invoice number input is pre-filled with the result of `GET /api/invoices/next-number` (format: `{prefix}-{zero-padded number}`, e.g. `INV-0024`). The user may override this value. |
| AC-04-2 | `POST /api/invoices` without a valid `clientId` returns HTTP 400 with `code: "VALIDATION_ERROR"` and `field: "clientId"`. The form prevents submission if no client is selected. |
| AC-04-3 | `POST /api/invoices` with an empty `lineItems` array returns HTTP 400 with `code: "VALIDATION_ERROR"` and `field: "lineItems"`. The form shows: "At least one line item is required." |
| AC-04-4 | Each line item with `quantity ≤ 0` or `unitPrice < 0` returns HTTP 400 with `code: "VALIDATION_ERROR"`. |
| AC-04-5 | `subtotal`, `taxAmount`, `discountAmount`, and `total` are always computed server-side. Any values for these fields sent in the request body are ignored. The server-computed values are returned in the response and displayed to the user. |
| AC-04-6 | All monetary fields (`unitPrice`, `subtotal`, `taxAmount`, `discountAmount`, `total`, `amountPaid`, `amountDue`, and payment `amount`) are stored and transmitted as integer cents. Non-integer values return HTTP 400. |
| AC-04-7 | The `lineItems` array in the response preserves the order in which items were sent in the request. Users can reorder line items in the UI; the reordered array is sent in `PATCH /api/invoices/:id`. |
| AC-04-8 | `POST /api/invoices` always creates a `draft` invoice regardless of any `status` value in the request body. |

---

### F-05 Invoice Status Management

| AC | Criterion |
|----|-----------|
| AC-05-1 | Valid status values and their UI color pairs (text / background): `draft` `#A0A0A0` / `#1C1C1C`, `sent` `#6366F1` / `#1E1B4B`, `partial` `#F59E0B` / `#431407`, `paid` `#22C55E` / `#052E16`, `overdue` `#EF4444` / `#450A0A`, `void` `#6B6B6B` / `#171717`. |
| AC-05-2 | On every API read that returns an invoice, if the stored status is `sent` or `partial` and `dueDate < today (UTC)`, the response status field is set to `"overdue"`. The stored database value remains `sent` or `partial`. This overdue override is applied consistently in all endpoints that return invoice objects or summaries. |
| AC-05-3 | `POST /api/invoices/:id/void` returns HTTP 400 with `code: "INVALID_STATUS_TRANSITION"` if the current stored status is `paid` or `void`. |
| AC-05-4 | `POST /api/invoices/:id/send` returns HTTP 400 with `code: "INVALID_STATUS_TRANSITION"` if the current stored status is not `draft`. |
| AC-05-5 | `PATCH /api/invoices/:id` returns HTTP 400 with `code: "INVOICE_NOT_EDITABLE"` if the stored status is anything other than `draft`. Only draft invoices are editable. |
| AC-05-6 | `POST /api/invoices/:id/payments` returns HTTP 400 with `code: "INVALID_STATUS_TRANSITION"` if the stored status is `draft`, `paid`, or `void`. |

---

### F-06 Send Invoice

| AC | Criterion |
|----|-----------|
| AC-06-1 | "Send Invoice" button is shown only when invoice status (computed) is `draft`. It is hidden for all other statuses. |
| AC-06-2 | `POST /api/invoices/:id/send` requires `recipientEmail` to be a valid RFC 5322 email address. Invalid values return HTTP 400 with `code: "VALIDATION_ERROR"` and `field: "recipientEmail"`. |
| AC-06-3 | If `SMTP_HOST` is configured, the server generates the invoice PDF and sends an email to `recipientEmail` with: `Subject: Invoice {invoiceNumber} from {businessName}`, the optional `message` in the email body, and the PDF as an attachment. |
| AC-06-4 | If `SMTP_HOST` is not configured, `POST /api/invoices/:id/send` succeeds (HTTP 200), sets `status: "sent"` and `sentAt`, and performs no email action. No error is returned to the client. |
| AC-06-5 | `sentAt` is set to the UTC timestamp at the moment the send request is processed. Once set, `sentAt` is immutable. |

---

### F-07 Payment Recording

| AC | Criterion |
|----|-----------|
| AC-07-1 | "Record Payment" button is visible only when invoice status (computed) is `sent`, `partial`, or `overdue`. |
| AC-07-2 | `amount` must be an integer > 0 and ≤ `amountDue`. Violations return HTTP 400 with `code: "VALIDATION_ERROR"` and `field: "amount"`. |
| AC-07-3 | `paidAt` defaults to today's UTC date if omitted. It must not be a future date; future dates return HTTP 400 with `code: "VALIDATION_ERROR"` and `field: "paidAt"`. |
| AC-07-4 | Valid `method` values: `"cash"`, `"bank_transfer"`, `"check"`, `"credit_card"`, `"other"`. Any other value returns HTTP 400. |
| AC-07-5 | After a payment is recorded, if the sum of all payments equals `invoice.total`, the stored status is updated to `paid` and `paidAt` is set to the latest payment's `paidAt` date. |
| AC-07-6 | After a payment is recorded, if the sum of all payments is less than `invoice.total`, the stored status is updated to `partial`. |
| AC-07-7 | `DELETE /api/invoices/:id/payments/:paymentId` removes the payment, recalculates `amountPaid` and `amountDue`, and re-evaluates the invoice status. If `amountPaid` drops to 0, status reverts to `sent`. If `amountPaid > 0` but `< total`, status remains `partial`. |
| AC-07-8 | The Payment History section lists all payments sorted by `paidAt` descending, showing: date, amount (formatted with currency symbol), method, and reference/note. |

---

### F-08 PDF Generation

| AC | Criterion |
|----|-----------|
| AC-08-1 | `GET /api/invoices/:id/pdf` returns a response with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="<invoiceNumber>.pdf"`. |
| AC-08-2 | The PDF contains all of the following: business logo (if set), business name, business address, client name, client address, invoice number, issue date, due date, line items table (description, qty, unit price, amount), subtotal, tax amount (shown only if `taxRate > 0`), discount amount (shown only if `discountValue > 0`), total, amount due, payment terms text, and notes text. |
| AC-08-3 | If invoice status (computed) is `paid`, the PDF renders a "PAID" stamp watermark diagonally across the invoice body in `#22C55E` at 45°. |
| AC-08-4 | PDF output dimensions are A4 (210 mm × 297 mm). |
| AC-08-5 | `GET /api/invoices/:id/pdf` for a voided invoice returns HTTP 400 with `code: "INVOICE_VOID"`. The UI hides the "Download PDF" button for void invoices. |

---

### F-09 Catalog Items

| AC | Criterion |
|----|-----------|
| AC-09-1 | `name` and `unitPrice` are required on catalog item creation. Violations return HTTP 400. `description`, `unit`, and `taxable` are optional. |
| AC-09-2 | `GET /api/catalog?search=<query>` performs a case-insensitive substring match on `name` and `description`. |
| AC-09-3 | When a catalog item is selected from the line item suggestion dropdown, the line item `description`, `unitPrice`, and `taxable` fields are auto-filled. `quantity` is left unchanged (defaults to 1). |
| AC-09-4 | Deleting a catalog item does not modify any existing invoices. Line items store values by copy, not by catalog item reference. |
| AC-09-5 | A user may have at most 500 catalog items. `POST /api/catalog` when 500 items already exist returns HTTP 400 with `code: "CATALOG_LIMIT_EXCEEDED"`. |

---

### F-10 Dashboard

| AC | Criterion |
|----|-----------|
| AC-10-1 | `GET /api/dashboard/stats` returns all stat values, recent invoices, and overdue invoices in a single request. The page does not make additional API calls at mount. |
| AC-10-2 | `totalOutstanding` = sum of `amountDue` for all invoices where stored status is `sent` or `partial` (overdue invoices are included because they are stored as `sent`/`partial`). |
| AC-10-3 | `totalOverdue` = sum of `amountDue` for all invoices where stored status is `sent` or `partial` and `dueDate < today (UTC)`. |
| AC-10-4 | `paidThisMonth` = sum of `total` for all invoices where stored status is `paid` and `paidAt` falls within the current calendar month (UTC). |
| AC-10-5 | `recentInvoices` returns the 5 most recently created invoices (any status, including void), each with fields: `id`, `invoiceNumber`, `status` (computed with overdue override), `clientName`, `total`, `currency`, `dueDate`. |
| AC-10-6 | `overdueInvoices` returns all invoices where stored status is `sent` or `partial` and `dueDate < today (UTC)`, sorted by `dueDate` ascending, each with fields: `id`, `invoiceNumber`, `clientName`, `amountDue`, `currency`, `dueDate`. |

---

### F-11 Dark UI

| AC | Criterion |
|----|-----------|
| AC-11-1 | The application ships with a single dark theme. No light mode toggle exists anywhere in the UI. |
| AC-11-2 | Background color tokens applied throughout: primary page background `#0F0F0F`, surface (cards, panels) `#1A1A1A`, elevated (inputs, dropdowns, modals) `#242424`, border `#2E2E2E`. |
| AC-11-3 | Text color tokens: primary `#F5F5F5`, secondary `#A0A0A0`, muted `#6B6B6B`. All text/background combinations achieve a minimum contrast ratio of 4.5:1 (WCAG AA). |
| AC-11-4 | Accent color: `#6366F1` (indigo). Hover state: `#818CF8`. Pressed/active state: `#4F46E5`. |
| AC-11-5 | All interactive elements (buttons, links, inputs, selects) display a `2px` focus ring in `#6366F1` on keyboard focus, with a `2px` transparent offset. |
| AC-11-6 | Form inputs (`<input>`, `<textarea>`, `<select>`) use background `#242424`, border `1px solid #2E2E2E`, text `#F5F5F5`, placeholder `#6B6B6B`. On focus, border becomes `1px solid #6366F1`. |
| AC-11-7 | Status badges render with foreground/background pairs as specified in AC-05-1. Badge shape: rounded pill (`border-radius: 9999px`), padding `2px 8px`, font-size `12px`, font-weight `500`. |
| AC-11-8 | Primary action buttons use background `#6366F1`, text `#FFFFFF`. On hover: background `#818CF8`. Destructive action buttons (void, delete) use background `transparent`, border `1px solid #EF4444`, text `#EF4444`. On hover: background `#450A0A`. |

---

## Out of Scope — v1.0

1. **Payment gateway integration** — no Stripe, PayPal, or any other online payment collection.
2. **Client portal** — clients cannot authenticate or access a URL to view their invoices.
3. **Shareable invoice links** — no public-facing URL for clients to view or pay invoices online.
4. **Recurring invoices** — no scheduled or automatic invoice generation.
5. **Time tracking** — no built-in timer, timesheet, or time-to-invoice workflow.
6. **Expense tracking** — no expense capture, categorization, or expense-to-invoice feature.
7. **Multi-user / team accounts** — one account per user; no role-based access control.
8. **Accounting integrations** — no data sync with QuickBooks, Xero, FreshBooks, or any accounting software.
9. **Tax schedules** — only flat percentage tax; no jurisdiction-based tax, compound tax, or VAT-specific logic.
10. **Multi-language / localization** — UI is English only; numbers and dates use `en-US` locale formatting.
11. **Automated email reminders** — no cron-based overdue reminder or follow-up emails.
12. **Estimates / quotes** — no pre-invoice estimate or quote documents.
13. **White-labeling** — business may upload a logo but the app UI itself is not rebrandable.
14. **Audit log** — no record of field-level changes over time.
15. **Mobile native app** — web browser only; no iOS or Android native application.
16. **Invoice viewed status** — no pixel tracking or link-click detection to mark an invoice as "viewed" by the client.

---

## Open Questions

| # | Question | Proposed Default |
|---|----------|-----------------|
| OQ-1 | Should SMTP configuration be required to use the "Send Invoice" feature, or should "mark as sent without email" be acceptable? | SMTP optional. If not configured, send marks the invoice as sent without emailing. No error or warning is shown in the UI for this case. |
| OQ-2 | After an invoice is sent, can any fields be changed? | No edits after send. To issue a corrected invoice, user must void the original and duplicate it. |
| OQ-3 | Should `overdue` be a stored status (requiring a scheduled job) or computed dynamically on read? | Computed on read. Stored value remains `sent` or `partial`. Eliminates need for a background job in MVP. |
| OQ-4 | If invoice INV-0023 is voided, is that number retired or reused for the next invoice? | Retired. `nextInvoiceNumber` always increments and never decrements. |
| OQ-5 | What is the logo storage strategy in development vs. production? | Local filesystem (`./public/uploads/`) in development; AWS S3 in production. Controlled by `STORAGE_PROVIDER` env var. |
| OQ-6 | PDF generation library: `@react-pdf/renderer` (pure JS) vs Puppeteer (headless Chrome)? | `@react-pdf/renderer`. Avoids binary Chrome dependency, works in serverless environments. |
| OQ-7 | Should invoices and clients use soft delete or hard delete? | Soft delete for invoices (retain `deletedAt` for data integrity). Hard delete for clients is blocked if non-void invoices exist (AC-03-4). |
| OQ-8 | Should the invoice number be zero-padded, and to how many digits? | Zero-padded to 4 digits minimum (e.g., `INV-0001`). If `nextInvoiceNumber ≥ 10000`, no padding is applied (e.g., `INV-10000`). |
| OQ-9 | When displaying amounts across multiple client currencies on the dashboard, should amounts be converted or shown in original currency? | Dashboard stats are computed only across invoices in the user's `defaultCurrency`. Invoices in other currencies are excluded from aggregate stats and noted with a disclaimer. |
| OQ-10 | Should refresh tokens rotate on each use? | Yes. Each `/api/auth/refresh` call issues a new `invoicer_refresh` cookie and invalidates the previous token. |
