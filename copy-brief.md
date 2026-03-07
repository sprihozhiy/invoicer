# Copy Brief — Invoicer

**Tone:** Confident, direct, premium. Short sentences. No filler. No exclamation marks.
**Audience:** Freelancers and small business owners. Non-technical. Frustrated by clunky or expensive invoicing tools.
**Positioning:** The cleanest, most professional invoicing tool you can use for free.

---

# SECTION 1: MARKETING COPY

---

## Nav

**Logo:** Invoicer

**Links:**
- Features
- How It Works
- Pricing

**Secondary CTA:** Sign In
**Primary CTA (button):** Get Started Free

---

## Hero

**Eyebrow tag:** Free to start — no credit card required

**Headline:**
> Professional invoices that get paid.

**Subheadline:**
> Invoicer is a clean, focused workspace for freelancers and small business owners. Create branded invoices, manage clients, and track every dollar you're owed — in one place.

**Primary CTA:** Get Started Free
**Secondary CTA:** See how it works

---

## Section: Features

**Section headline:** Everything you need, nothing you don't.

**Section subtitle:** Designed from the ground up for a fast, focused, and frustration-free invoicing experience.

---

**Feature Card 1**
Headline: Effortless invoicing
Body: Build professional invoices in a clean, intuitive editor. Add line items, apply taxes and discounts, and adjust payment terms. Your invoice is ready in minutes.

**Feature Card 2**
Headline: Client management
Body: Keep every client organized in one place. See total invoiced, total paid, and outstanding balance at a glance. Your full history with each client is always one click away.

**Feature Card 3**
Headline: Payment tracking
Body: Record full or partial payments as they arrive. Statuses move from Sent to Partial to Paid automatically. Every record stays accurate with no extra work.

**Feature Card 4**
Headline: Catalog items
Body: Save your services, rates, and products. Select from your catalog while building an invoice — description, price, and tax settings fill in automatically. Stop retyping the same line items.

**Feature Card 5**
Headline: At-a-glance dashboard
Body: Total outstanding. Total overdue. Paid this month. Recent invoices. Every overdue invoice sorted by age. One screen. No mental math.

**Feature Card 6**
Headline: Professional PDF, every time
Body: Generate a clean, branded PDF from any invoice. Your logo, itemized breakdown, payment terms, and notes — all formatted and ready to send. Paid invoices stamp automatically.

---

## Section: Dashboard Showcase

**Headline:** A beautifully crafted dashboard.

**Body:** Get a clear view of your business finances. See what's been paid, what's outstanding, and what's overdue — all in one concise screen. No more guessing about your cash flow.

---

## Section: How It Works

**Section headline:** From zero to sent in five minutes.

**Step 1**
Label: Set up your profile
Body: Enter your business name and upload your logo. Set your default currency, tax rate, and payment terms. Done once. Applied to every invoice you create.

**Step 2**
Label: Build your invoice
Body: Select a client or create one on the spot. Add line items from your catalog or type them in. Totals calculate in real time. No formulas required.

**Step 3**
Label: Send and track
Body: Download the PDF and deliver it directly to your client. Record payments as they arrive. Overdue invoices surface automatically. Nothing slips through.

---

## Section: Pricing

**Section headline:** Start free. Stay free.

**Section subtitle:** No client limits. No invoice limits. No tricks.

**Tier: Free — $0 / month**

Included:
- Unlimited invoices
- Unlimited clients
- Branded PDF generation
- Dashboard with payment tracking
- Catalog items
- 20 supported currencies

**Tier CTA:** Create Your Free Account

**Fine print:** Team features and advanced reporting are on the roadmap. Early users get priority access.

---

## Section: Final CTA (Pre-footer)

**Headline:** Your clients judge your invoice before they pay it.

**Body:** Make it count. Set up Invoicer in two minutes and send your first professional invoice today.

**CTA button:** Get Started Free

**Supporting line:** No credit card required. Free forever on the core plan.

---

## Footer

**Logo lockup:** Invoicer — Professional invoicing for the way you work.

**Column: Product**
- Features
- Pricing
- Sign In
- Create Account

**Column: Company**
- About
- Contact

**Column: Legal**
- Privacy Policy
- Terms of Service

**Copyright:** © 2026 Invoicer. All rights reserved.

---

## CTA Variants

| Context | Copy |
|---|---|
| Nav button | Get Started Free |
| Hero primary | Get Started Free |
| Hero secondary | See how it works |
| How It Works section | Start your free account |
| Pricing section | Create Your Free Account |
| Pre-footer section | Get Started Free |
| Empty state — Invoices | Create your first invoice |
| Empty state — Clients | Add your first client |
| Sign-up page header | Create your account |
| Login page footer link | Don't have an account? Start free |

---

---

# SECTION 2: APP UI COPY

---

## Screen: /register — Create Account

**Page title:** Create your account
**Subtitle:** Start invoicing for free. No credit card required.

**Form fields:**

| Label | Placeholder | Hint |
|---|---|---|
| Full Name | Jane Smith | — |
| Email Address | you@company.com | — |
| Password | — | Min 8 characters, 1 uppercase, 1 number |

**Primary button:** Create Account
**Footer link:** Already have an account? Sign in

**Validation errors:**
- Password too short: "Password must be at least 8 characters."
- Missing uppercase: "Password must contain at least one uppercase letter."
- Missing digit: "Password must contain at least one digit."
- Duplicate email: "An account with this email already exists."
- Generic error: "Something went wrong. Try again."

---

## Screen: /onboarding — Onboarding

### Step 1 of 2 — Business Identity

**Page title:** Set up your business
**Step label:** Step 1 of 2 — Business identity
**Description:** This information appears on every invoice you send.

**Form fields:**

| Label | Placeholder | Required |
|---|---|---|
| Business Name | Acme Studio | Yes |
| Business Logo | — | No |

**Logo upload area:**
- Default: "Upload your logo"
- Sub: "JPEG or PNG — max 2 MB"
- After upload: logo preview with link "Remove logo"

**Primary button:** Continue

**Validation errors:**
- Missing business name: "Business name is required."
- File too large: "File exceeds the 2 MB limit. Upload a smaller image."
- Wrong file type: "Only JPEG and PNG files are accepted."

---

### Step 2 of 2 — Invoicing Defaults

**Page title:** Set up your business
**Step label:** Step 2 of 2 — Invoicing defaults
**Description:** These defaults apply to every new invoice. You can override them any time.

**Form fields:**

| Label | Placeholder | Required |
|---|---|---|
| Business Address | 123 Main St | No |
| Phone Number | +1 555 000 0000 | No |
| Default Currency | USD | Yes — dropdown |
| Default Tax Rate (%) | 0 | No |
| Default Payment Terms (days) | 30 | No |
| Invoice Prefix | INV | No |
| Starting Invoice Number | 1 | No |

**Primary button:** Finish Setup
**Skip link:** Skip for now

---

## Screen: /login — Sign In

**Page title:** Sign in to Invoicer

**Form fields:**

| Label | Placeholder |
|---|---|
| Email Address | you@company.com |
| Password | Your password |

**Primary button:** Sign In
**Forgot password link:** Forgot your password?
**Footer link:** Don't have an account? Start free

**Error messages:**
- Invalid credentials: "Email or password is incorrect."
- Too many attempts: "Too many sign-in attempts. Try again in a few minutes."
- Generic error: "Something went wrong. Try again."

---

## Screen: /forgot-password — Forgot Password

**Page title:** Reset your password
**Description:** Enter the email you registered with and we'll send you a reset link.

**Form fields:**

| Label | Placeholder |
|---|---|
| Email Address | you@company.com |

**Primary button:** Send Reset Link
**Back link:** Back to sign in

**Confirmation message (always shown after submit):**
"If that email is registered, you'll receive a reset link shortly."

---

## Screen: /reset-password — Set New Password

**Page title:** Set a new password
**Description:** At least 8 characters, 1 uppercase letter, and 1 number.

**Form fields:**

| Label | Placeholder |
|---|---|
| New Password | Min 8 characters |
| Confirm Password | Repeat your password |

**Primary button:** Update Password

**Success toast:** "Password updated. Please sign in."

**Error messages:**
- Passwords don't match: "Passwords don't match."
- Token expired: "This reset link has expired. Request a new one."
- Token already used: "This reset link has already been used. Request a new one."

---

## Screen: /dashboard — Dashboard

**Page title:** Dashboard

**Page action:** New Invoice

**Stat cards:**

| Label | Sub-label |
|---|---|
| Total Outstanding | Unpaid across all open invoices |
| Total Overdue | Past due date and unpaid |
| Paid This Month | Received in [Month Year] |

**Currency disclaimer (when non-default currencies are excluded):**
"Amounts shown in [currency]. Invoices in other currencies are excluded."

**Widget: Recent Invoices**
- Section title: Recent Invoices
- Table columns: Client · Invoice · Amount · Status · Due
- Empty state: "No invoices yet."
- Empty state CTA: Create your first invoice

**Widget: Overdue Invoices**
- Section title: Overdue
- Table columns: Client · Invoice · Amount Due · Days Overdue
- Empty state: "No overdue invoices. You're all caught up."

---

## Screen: /invoices — Invoice List

**Page title:** Invoices

**Search placeholder:** Search invoices...
**Filter label:** Status
**Filter options:** All · Draft · Sent · Partial · Overdue · Paid · Void
**Page action:** New Invoice

**Table columns:** # · Client · Issue Date · Due Date · Amount · Status

**Row actions:**
- View (default on row click)
- Download PDF
- Duplicate

**Empty state (no invoices):**
Title: "No invoices yet."
Body: "Create your first invoice to start getting paid."
CTA: New Invoice

**Empty state (no search results):**
"No invoices match your search."

---

## Screen: /invoices/new — New Invoice

**Page title:** New Invoice

**Section: Invoice Details**

| Label | Placeholder | Note |
|---|---|---|
| Invoice Number | INV-0001 | Auto-generated, overridable |
| Issue Date | — | Date picker, defaults to today |
| Due Date | — | Date picker, defaults to today + default payment terms |

**Section: Client**

| Label | Placeholder | Note |
|---|---|---|
| Client | Search clients... | Autocomplete, debounced |

- Inline link below field: "Add new client"
- On client selection: name, company, email, and currency shown

**Section: Line Items**

Table headers: Description · Qty · Unit Price · Taxable · Amount

| Label | Placeholder | Note |
|---|---|---|
| Description | Service or product description | Autocomplete from catalog |
| Qty | 1 | Defaults to 1 |
| Unit Price | 0.00 | — |
| Taxable | — | Checkbox |

- "Add line item" button below table
- Drag handle on each row for reordering
- Remove row icon: ✕ (tooltip: "Remove line item")

**Section: Totals (read-only, right-aligned)**
- Subtotal
- Tax ([rate]%)
- Discount
- Total

**Section: Additional Details**

| Label | Placeholder |
|---|---|
| Tax Rate (%) | 0 |
| Discount | 0 |
| Discount Type | % / Fixed (toggle) |
| Notes | Add payment instructions, thank-you notes, or other details |
| Payment Terms | e.g. Payment due within 30 days |

**Primary button:** Save as Draft
**Cancel link:** Cancel

**Validation errors:**
- No client selected: "Select a client before saving."
- No line items: "At least one line item is required."
- Invalid quantity: "Quantity must be greater than zero."
- Negative unit price: "Unit price cannot be negative."

---

## Screen: /invoices/:id — Invoice Detail

**Page title:** Invoice [number] — e.g. "Invoice INV-0023"

**Section: Invoice Header**
- Invoice number (prominent)
- Status badge
- Issue date · Due date
- Client name, company, email
- Business name and address (right-aligned)

**Section: Line Items**
Table headers: Description · Qty · Unit Price · Tax · Amount

**Section: Totals**
Rows (shown only when value > 0):
- Subtotal
- Tax ([rate]%)
- Discount
- Total
- Amount Paid
- **Amount Due** (bold, visually prominent)

**Section: Payment History** (visible once at least one payment is recorded)
- Section title: Payment History
- Table columns: Date · Amount · Method · Reference / Note
- Delete payment icon: ✕ (tooltip: "Remove this payment")

**Section: Notes** (shown if present)
- Notes
- Payment Terms

**Primary actions (top-right, context-dependent):**
- "Send Invoice" — shown when status is draft only
- "Record Payment" — shown when status is sent, partial, or overdue
- "Download PDF" — shown for all non-void statuses

**More Actions menu (⋮):**
- Duplicate Invoice
- Void Invoice (destructive — shown only when status is draft, sent, or partial)

**Void state:**
- All action buttons hidden
- Banner: "This invoice has been voided."

---

### Modal: Send Invoice

**Modal title:** Send Invoice
**Description:** The invoice PDF will be attached if email delivery is configured. Otherwise, the invoice will be marked as sent.

**Form fields:**

| Label | Placeholder | Note |
|---|---|---|
| Recipient Email | client@company.com | Pre-filled from client record |
| Message (optional) | Add a note to your client... | Max 1000 characters |

**Primary button:** Send
**Secondary button:** Cancel

**Validation errors:**
- Invalid email: "Enter a valid email address."
- Server error: "Failed to send. Try again."

**Success:** Modal closes. Status badge updates to "Sent."

---

### Modal: Record Payment

**Modal title:** Record Payment

**Form fields:**

| Label | Placeholder | Note |
|---|---|---|
| Amount | Amount due | Pre-filled to amount due |
| Payment Date | — | Defaults to today |
| Payment Method | — | Dropdown |
| Reference (optional) | Cheque number, bank reference... | — |
| Note (optional) | Any notes about this payment | — |

**Payment method options:** Cash · Bank Transfer · Cheque · Credit Card · Other

**Primary button:** Save Payment
**Secondary button:** Cancel

**Validation errors:**
- Zero or negative amount: "Enter a valid payment amount."
- Amount exceeds amount due: "Payment exceeds the amount due."
- Future date: "Payment date cannot be in the future."

**Success:** Modal closes. Payment History section appears or updates. Status badge updates.

---

### Modal: Void Invoice — Confirmation

**Modal title:** Void this invoice?
**Body:** "Voiding this invoice is permanent and cannot be undone. The invoice number will be retired."
**Primary button (destructive):** Void Invoice
**Secondary button:** Cancel

**Success toast:** "Invoice voided."

---

### Duplicate Invoice

No confirmation modal. On selecting "Duplicate Invoice":
- Redirect to new draft invoice at `/invoices/<newId>`
- Toast on new page: "Duplicated from [INV-XXXX]."

---

## Screen: /clients — Client List

**Page title:** Clients

**Search placeholder:** Search clients...
**Page action:** Add Client

**Table columns:** Name · Company · Email · Total Invoiced · Outstanding · Last Invoice

**Row actions:**
- View (default on row click)
- Edit
- Delete

**Empty state (no clients):**
Title: "No clients yet."
Body: "Add your first client and start invoicing."
CTA: Add Client

**Empty state (no search results):**
"No clients match your search."

---

### Modal: Add / Edit Client

**Modal title (add):** Add Client
**Modal title (edit):** Edit Client

**Form fields:**

| Label | Placeholder | Required |
|---|---|---|
| Full Name | Jane Smith | Yes |
| Email Address | jane@company.com | No |
| Phone | +1 555 000 0000 | No |
| Company | Acme Corp | No |
| Address | 123 Main St | No |
| Suite / Unit | Apt 4B | No |
| City | New York | No |
| State / Region | NY | No |
| Postal Code | 10001 | No |
| Country | United States | No |
| Currency | — | No — defaults to business default |
| Notes | Private notes about this client | No |

**Primary button (add):** Save Client
**Primary button (edit):** Save Changes
**Secondary button:** Cancel

**Validation errors:**
- Missing name: "Client name is required."
- Server error: "Failed to save. Try again."

**Success toasts:**
- Add: "Client added."
- Edit: "Client updated."

---

### Delete Client — Confirmation

**Modal title:** Delete this client?
**Body:** "This action cannot be undone."
**Primary button (destructive):** Delete Client
**Secondary button:** Cancel

**Success toast:** "Client deleted."

**Blocked error (client has invoices):**
"This client has existing invoices and cannot be deleted."

---

## Screen: /clients/:id — Client Detail

**Page title:** [Client Name]

**Section: Client Profile**
Fields shown: Name · Company · Email · Phone · Address · Currency · Notes

**Actions:**
- Button: Edit
- Button: New Invoice
- Button (destructive, secondary): Delete

**Section: Financial Summary**

| Label |
|---|
| Total Invoiced |
| Total Paid |
| Balance Due |

**Section: Invoice History**
- Section title: Invoice History
- Filter: Status (All · Draft · Sent · Partial · Overdue · Paid · Void)
- Table columns: Invoice # · Issue Date · Due Date · Amount · Status

**Empty state:** "No invoices for this client yet."
**Empty state CTA:** Create Invoice

---

## Screen: /settings — Business Profile

**Page title:** Business Profile

**Section: Business Identity**

| Label | Placeholder | Required |
|---|---|---|
| Business Name | Acme Studio | Yes |
| Business Address | 123 Main St | No |
| Phone Number | +1 555 000 0000 | No |

**Logo area:**
- No logo: "Upload your logo" / "JPEG or PNG — max 2 MB"
- With logo: preview shown, link "Change logo", link "Remove logo"
- After remove: toast "Logo removed."

**Section: Invoicing Defaults**

| Label | Placeholder | Note |
|---|---|---|
| Default Currency | USD | Dropdown |
| Default Tax Rate (%) | 0 | — |
| Default Payment Terms (days) | 30 | — |
| Invoice Prefix | INV | — |
| Next Invoice Number | 1 | Minimum 1 |

**Section: Account**
- Email Address — read-only
- Note: "Contact support to change your email."
- Link: Change password

**Primary button:** Save Changes

**Success toast:** "Profile updated."

**Validation errors:**
- Missing business name: "Business name is required."
- File too large: "File exceeds the 2 MB limit."
- Wrong file type: "Only JPEG and PNG files are accepted."

---

## Screen: /settings/catalog — Catalog Items

**Page title:** Catalog
**Section description:** Saved items used to auto-fill line items when building invoices.

**Page action:** Add Item

**Table columns:** Name · Description · Unit Price · Unit · Taxable · Actions

**Row actions:**
- Edit
- Delete

**Empty state:**
Title: "Your catalog is empty."
Body: "Save your frequently used services and products here. Select them from the dropdown while building an invoice."
CTA: Add Item

**Limit warning (approaching 500):** "You have [n] of 500 catalog items."
**Limit reached error:** "You've reached the 500 item limit. Remove an item to add a new one."

---

### Modal: Add / Edit Catalog Item

**Modal title (add):** Add Catalog Item
**Modal title (edit):** Edit Catalog Item

**Form fields:**

| Label | Placeholder | Required |
|---|---|---|
| Item Name | Website design | Yes |
| Description | Brief description shown on the invoice | No |
| Unit Price | 0.00 | Yes |
| Unit Label | hour, page, project... | No |
| Taxable | — | Toggle, default off |

**Primary button (add):** Save Item
**Primary button (edit):** Save Changes
**Secondary button:** Cancel

**Validation errors:**
- Missing name: "Item name is required."
- Missing unit price: "Unit price is required."
- Server error: "Failed to save. Try again."

**Success toasts:**
- Add: "Item added."
- Edit: "Item updated."

---

### Delete Catalog Item — Confirmation

**Modal title:** Delete this item?
**Body:** "This won't affect any existing invoices."
**Primary button (destructive):** Delete Item
**Secondary button:** Cancel

**Success toast:** "Item deleted."

---

## Global / Shared UI Copy

### App Navigation

- Dashboard
- Invoices
- Clients
- Settings

**User menu label:** [User's name]
**Sign out link:** Sign Out

---

### Loading States

| Action | Label |
|---|---|
| Saving form | "Saving..." |
| Sending invoice | "Sending..." |
| Generating PDF | "Generating PDF..." |
| Deleting | "Deleting..." |

---

### Toast Messages

| Event | Toast |
|---|---|
| Invoice saved as draft | "Draft saved." |
| Invoice sent | "Invoice sent." |
| Invoice voided | "Invoice voided." |
| Invoice duplicated | "Duplicated from [INV-XXXX]." |
| Payment recorded | "Payment recorded." |
| Payment removed | "Payment removed." |
| Profile updated | "Profile updated." |
| Client added | "Client added." |
| Client updated | "Client updated." |
| Client deleted | "Client deleted." |
| Catalog item added | "Item added." |
| Catalog item updated | "Item updated." |
| Catalog item deleted | "Item deleted." |
| Logo uploaded | "Logo updated." |
| Logo removed | "Logo removed." |
| Password updated | "Password updated. Please sign in." |

---

### Error Messages — System

| Trigger | Message |
|---|---|
| Network failure | "Connection lost. Check your internet and try again." |
| 404 — page not found | "That page doesn't exist." |
| 404 — invoice not found | "Invoice not found." |
| 404 — client not found | "Client not found." |
| 401 — session expired | Redirect to /login (silent) |
| 500 — server error | "Something went wrong on our end. Try again." |

---

## Notes for Designers

- The hero eyebrow tag ("Free to start — no credit card required") reads as a confidence signal, not a disclaimer. Position it above the headline, small and muted.
- "No credit card required" belongs below every primary CTA on the landing page. It removes friction at the exact decision point.
- The Workspace section is the right place for a product screenshot. Lead with the visual; the copy supports it.
- Status badges (Draft · Sent · Overdue · Paid) are strong visual assets. Use them in feature screenshots to show the clarity of the tracking system.
- The pricing section has one tier at launch. Keep it simple and honest. Don't pad the feature list.
- Empty states are a conversion moment inside the app. The CTA in an empty state should feel like an invitation, not a dead end.
- "Amount Due" in the invoice detail totals section should be the most visually prominent number on the screen.
- The void banner on a voided invoice should be subtle but unmistakable — secondary text color, no action button.
- Tooltips should only appear where icon-only actions could be ambiguous. Keep tooltip text to 3–5 words.
