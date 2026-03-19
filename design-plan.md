# Design Plan: invoicer / task-invoicer-redesign-v8

## Product Type
web-app

## Design Context
Invoicer is a public-facing invoicing SaaS with an authenticated workspace for freelancers and small business owners who need to create branded invoices, manage clients, reuse catalog items, generate PDFs, and manually track payments without accounting expertise. The product already includes a landing page, dashboard, invoice list/detail flows, client management, settings, and onboarding; the current task is to define a redesign that makes those existing flows feel more trustworthy, premium, and easier to understand at a glance. Because users are handling money, client-facing documents, and overdue balances, the interface has to reduce anxiety while still feeling competent enough to justify using it as the system of record for billing.

## Domain Design Signals
### Desired Signals
- Financially trustworthy without looking like a bank portal or bookkeeping software for accountants.
- Professional enough that a freelancer believes the invoices produced here will make them look credible to clients.
- Calm operational control for solo operators who need to know what is owed, what is overdue, and what was paid this month immediately.
- Fast, low-friction document creation with obvious progress from setup to draft to sent to paid.
- Polished and premium in the FreshBooks sense: high taste, approachable, and not intimidating to non-experts.
- Data clarity around statuses, totals, due dates, and payment history, with strong typographic handling of money values.
- Focused scope that feels deliberately specialized in invoicing rather than bloated into a faux all-in-one ERP.

### Anti-Signals
- Cluttered open-source admin-panel energy like a configurable back office tool.
- Crypto, trading-dashboard, or cyberpunk neon aesthetics that make money handling feel speculative instead of dependable.
- Cute freelancer-template tropes such as soft pastel blobs, mascot illustrations, or whimsical startup art.
- Enterprise accounting-suite density with tiny controls, spreadsheet walls, and jargon-heavy navigation.
- Generic “modern SaaS” sameness with white cards, purple gradients, and interchangeable dashboard components.
- Lifestyle-brand softness that underplays the seriousness of invoices, payment terms, and overdue balances.
- Roadmap theater that visually foregrounds unsupported features like time tracking, client portals, teams, or payment gateways.

## Visual Direction
The redesign should refine the product’s existing dark-only, blue-accent system rather than replace it: the mood is disciplined, nocturnal, and premium, like a well-lit studio workspace for serious client work. Color should stay grounded in matte charcoals and graphite surfaces, with electric azure reserved for primary actions, amount-due emphasis, and key navigation states; semantic green, amber, and red should carry payment meaning without turning the UI into a rainbow dashboard. Typography should remain a neutral grotesk in the Inter family with crisp hierarchy, slightly tighter display headlines on marketing surfaces, and tabular numerals wherever money or dates appear. Spacing should be generous on the landing page and medium-dense inside the app, so the workspace feels efficient rather than sparse while still giving totals, tables, and forms enough breathing room to read instantly. Surfaces should feel layered and tactile through soft borders, restrained shadow, occasional blur on top navigation, and subtle gradient glow only where conversion or hierarchy needs lift; imagery should come from invoice documents, dashboard modules, and UI compositions, not stock photos. Interaction tone should be composed and direct, with minimal chrome, clear hover/focus states, and an emotional posture of “I am in control of billing, and my clients will read this as professional.”

## Design Rationale
This direction fits the audience because the user is usually the owner, operator, and bookkeeper at once; they want the polish of FreshBooks, the simplicity of Wave and Zoho for non-accountants, and none of the utilitarian clutter associated with Invoice Ninja. The strongest visual emphasis should go to the product proof that matters most: professional invoice output, the top-line money metrics on the dashboard, and the amount due / status system inside invoice detail. The dashboard should feel calm and legible with fast-read KPI cards and disciplined tables; the invoice composer should be more data-dense but still obviously structured into invoice details, client selection, line items, totals, and supporting notes. The landing page should be persuasive, but its persuasion should come from visible product quality, a free unlimited core offer, and the message that this tool helps users look professional and get paid, not from inflated feature claims. Research shows UI/UX is a moat in this category, especially for small business owners who are not tech-savvy, so the redesign needs to turn clarity and taste into trust. Because the current product is still narrower than some competitors, the design should visually celebrate focused invoicing and payment tracking rather than mimic a full accounting suite it does not yet provide.

## Screens to Generate

### Screen 1: Marketing Landing Page
- **Output file:** landing-prototype.html
- **Device type:** DESKTOP
- **Purpose:** This is the public conversion page for freelancers and small business owners evaluating whether Invoicer is credible enough to handle their invoicing. It must communicate product quality, ease of use, and the free unlimited core offer within seconds while grounding every claim in the actual product: invoicing, clients, catalog items, branded PDFs, and payment tracking.
**Visual Priorities:**
- Professional invoice output and product UI proof above the fold.
- A clear promise around looking professional and getting paid faster.
- Free-to-start positioning with no client or invoice limits.
- The three-step workflow from setup to invoice creation to payment tracking.
- A premium dark aesthetic that feels more polished than utilitarian competitors.
**Stitch prompt:**
```md
Premium dark invoicing landing page for freelancers and small business owners, polished and credible with a calm studio-finance atmosphere.

DESIGN SYSTEM (REQUIRED):
- Platform: Web, desktop-first
- Palette: Midnight Graphite #0F0F0F page background, Slate Surface #1A1A1A cards and sections, Elevated Charcoal #242424 inputs and nested panels, Low-Contrast Border #2E2E2E dividers, Electric Azure #178DEE primary action, Sky Hover #3BA2F5 hover accent, White Smoke #F5F5F5 primary text, Soft Zinc #A0A0A0 secondary text, Quiet Carbon #6B6B6B muted text, Success Emerald #22C55E paid states, Warning Amber #F59E0B alert states, Danger Red #EF4444 overdue/error states
- Typography: Inter-style neutral grotesk, tight display headlines, medium-weight UI labels, tabular numerals for currency and dates
- Shape and elevation: rounded 16px to 24px surfaces, restrained shadow, matte panels, occasional glass blur only for sticky navigation

VISUAL LANGUAGE:
Use layered charcoal surfaces, subtle radial blue glow behind hero and final CTA, crisp invoice-document composition, and product-led imagery only. Headlines should feel sharp and premium, body copy clear and non-jargony, and money/status UI should be visually precise. Avoid pastel startup illustration packs, neon crypto dashboards, white-card fintech templates, or anything that suggests unsupported accounting-suite breadth.

PAGE STRUCTURE:
1. Sticky top navigation with compact wordmark, anchor links for Features / How It Works / Pricing, secondary Sign In link, and a bright primary CTA button labeled Get Started Free; translucent dark backdrop blur.
2. Hero section in a two-column layout: left side with eyebrow chip for free plan, assertive headline about professional invoices and getting paid, concise supporting paragraph, dual CTA row, and three compact trust chips for Branded PDFs / No accounting jargon / Track partial payments; right side with a large angled invoice card plus a slim dashboard metrics strip showing outstanding, overdue, and paid this month.
3. Product proof band directly under hero showing a realistic invoice excerpt with line items, subtotal, tax, total, and status pill; make the document feel client-ready, not like a wireframe.
4. Six-card feature grid for Effortless invoicing, Client management, Payment tracking, Catalog items, At-a-glance dashboard, and Professional PDF generation; each card uses an icon container, concise heading, and explanatory paragraph.
5. Dashboard showcase section with split layout: left side editorial copy about cash-flow clarity, right side a framed dashboard module containing three KPI cards and a compact recent invoices list with status pills.
6. How-it-works section with three numbered steps in equal cards: Set up profile, Build your invoice, Send and track; use strong ordinal markers and clean connective rhythm.
7. Pricing section with one centered featured pricing card for the free core plan showing $0/month, no client limits, no invoice limits, and a short roadmap note for team features and advanced reporting; include a full-width CTA inside the card.
8. Final conversion banner using a more saturated azure gradient surface, short headline about clients judging the invoice before they pay it, supporting copy, and a high-contrast CTA.
9. Footer with brand block, product links, company/legal columns, and understated dividers.
```

### Screen 2: Authenticated Dashboard
- **Output file:** dashboard-prototype.html
- **Device type:** DESKTOP
- **Purpose:** This is the first screen a signed-in user sees and the place where they decide whether the product gives them real control over cash flow. It must summarize what matters now, direct users into invoice creation, and make unpaid or overdue work impossible to miss without feeling alarmist.
**Visual Priorities:**
- Outstanding, overdue, and paid-this-month figures as the dominant first read.
- A clear “New Invoice” primary action in the page header.
- Recent invoices and overdue items presented with high scanability.
- Status colors that feel authoritative, not decorative.
- A left navigation shell that makes the app feel cohesive and premium.
**Stitch prompt:**
```md
Premium dark invoicing dashboard with calm financial oversight, crisp data hierarchy, and a confident operator-workspace mood.

DESIGN SYSTEM (REQUIRED):
- Platform: Web, desktop-first
- Palette: Midnight Graphite #0F0F0F page background, Slate Surface #1A1A1A cards and sections, Elevated Charcoal #242424 inputs and nested panels, Low-Contrast Border #2E2E2E dividers, Electric Azure #178DEE primary action, Sky Hover #3BA2F5 hover accent, White Smoke #F5F5F5 primary text, Soft Zinc #A0A0A0 secondary text, Quiet Carbon #6B6B6B muted text, Success Emerald #22C55E paid states, Warning Amber #F59E0B alert states, Danger Red #EF4444 overdue/error states
- Typography: Inter-style neutral grotesk, tight display headlines, medium-weight UI labels, tabular numerals for currency and dates
- Shape and elevation: rounded 16px to 24px surfaces, restrained shadow, matte panels, occasional glass blur only for sticky navigation

VISUAL LANGUAGE:
Make the shell feel substantial through a dark sidebar, slim dividers, and disciplined spacing. KPI cards should have subtle tonal depth and clear semantic color cues, while tables remain highly legible and restrained. Avoid flashy analytics-dashboard gimmicks, rainbow charts, dense enterprise BI widgets, or generic light-mode SaaS tables.

PAGE STRUCTURE:
1. Full desktop app shell with fixed left sidebar containing Invoicer wordmark, primary nav items for Dashboard / Invoices / Clients, secondary items for Catalog / Settings, and a minimal sign-out action with user identity label at the bottom.
2. Top page header inside the main pane with page title Dashboard and a strong primary button for New Invoice.
3. Row of three large KPI cards for Total Outstanding, Total Overdue, and Paid This Month; each card includes a label, dominant tabular value, small explanatory sublabel, and a restrained icon badge.
4. Slim one-line currency notice beneath KPI cards clarifying that dashboard totals are shown in the default currency only.
5. Main content area in a two-column desktop grid: left side a larger Recent Invoices table card with columns for client, invoice number, amount, status, and due date; right side an Overdue Invoices panel ordered by oldest due date first with amount due and days overdue.
6. Use realistic populated data rather than placeholders, with one invoice in partial status, one paid, and at least one overdue row in red-accent treatment.
7. Empty-state affordances should not dominate; this screen should show an active working business with meaningful invoice volume.
```

### Screen 3: New Invoice Composer
- **Output file:** invoice-compose-prototype.html
- **Device type:** DESKTOP
- **Purpose:** This is the product’s highest-value creation workflow and needs to make invoice building feel controlled, fast, and free of accounting anxiety. The screen must support client lookup, line-item entry, catalog reuse, tax/discount logic, and a live totals summary without looking like a spreadsheet.
**Visual Priorities:**
- The invoice-building card as the primary focal surface.
- Client selection and line items as the dominant interactive zones.
- Live subtotal, tax, discount, and total calculations that are immediately readable.
- Save-as-draft action and overall flow confidence from top to bottom.
- Dense information architecture without visual clutter.
**Stitch prompt:**
```md
Dark premium invoice composer for service businesses, focused and efficient with a calm document-building atmosphere.

DESIGN SYSTEM (REQUIRED):
- Platform: Web, desktop-first
- Palette: Midnight Graphite #0F0F0F page background, Slate Surface #1A1A1A cards and sections, Elevated Charcoal #242424 inputs and nested panels, Low-Contrast Border #2E2E2E dividers, Electric Azure #178DEE primary action, Sky Hover #3BA2F5 hover accent, White Smoke #F5F5F5 primary text, Soft Zinc #A0A0A0 secondary text, Quiet Carbon #6B6B6B muted text, Success Emerald #22C55E paid states, Warning Amber #F59E0B alert states, Danger Red #EF4444 overdue/error states
- Typography: Inter-style neutral grotesk, tight display headlines, medium-weight UI labels, tabular numerals for currency and dates
- Shape and elevation: rounded 16px to 24px surfaces, restrained shadow, matte panels, occasional glass blur only for sticky navigation

VISUAL LANGUAGE:
The layout should feel like a premium editor, not a bookkeeping spreadsheet: one strong centered composition, consistent section dividers, and precise numeric alignment. Inputs should be dark, tactile, and quiet until interacted with; totals should feel decisive. Avoid spreadsheet chrome, tiny enterprise form controls, playful consumer-app styling, or overly soft rounded wellness UI.

PAGE STRUCTURE:
1. Full desktop app shell with the same left sidebar navigation system as the dashboard.
2. Header row with breadcrumb back to Invoices, large page title New Invoice, secondary Cancel button, and primary Save as Draft button.
3. Centered main invoice-builder card with clear horizontal section dividers and generous internal padding.
4. Invoice Details section using a clean multi-column form grid for invoice number, issue date, due date, and currency; show a generated invoice number already filled in.
5. Client section with a selected client summary card plus an adjacent visible search field pattern; include a subtle inline action for Add new client but do not open a modal on this screen.
6. Line Items section as the dominant area: column header row for Description / Qty / Unit Price / Tax / Amount / Reorder / Remove, several realistic line item rows, one open catalog autocomplete dropdown under a description field, checkbox tax toggles, reorder arrows, and a dashed Add line item control beneath the table.
7. Right-aligned live totals summary under the line items showing subtotal, tax, discount, and total in tabular numerals; total must be the strongest value in this region.
8. Additional Details section with tax rate input, discount input plus percentage/fixed segmented toggle, payment terms field, and notes textarea.
9. Footer action bar attached to the bottom of the main card with repeated Cancel and Save as Draft actions for long-form usability.
```

### Screen 4: Invoice Detail and Payment History
- **Output file:** invoice-detail-prototype.html
- **Device type:** DESKTOP
- **Purpose:** This screen proves the product’s end result: a professional invoice artifact, clear payment status, and a trustworthy record of what is still owed. It matters because users and their clients both judge the product by the quality of this document and by how clearly payments, due dates, and next actions are presented.
**Visual Priorities:**
- Invoice number, status, and top actions at the top of the screen.
- A polished invoice preview that looks client-ready, not like an internal admin table.
- Amount due as the most visually emphasized financial figure.
- Payment history as a separate but clearly related accountability surface.
- Send, record payment, download PDF, duplicate, and void actions presented with control.
**Stitch prompt:**
```md
Client-ready dark invoice detail screen with premium document presentation, strong payment clarity, and a composed billing-record atmosphere.

DESIGN SYSTEM (REQUIRED):
- Platform: Web, desktop-first
- Palette: Midnight Graphite #0F0F0F page background, Slate Surface #1A1A1A cards and sections, Elevated Charcoal #242424 inputs and nested panels, Low-Contrast Border #2E2E2E dividers, Electric Azure #178DEE primary action, Sky Hover #3BA2F5 hover accent, White Smoke #F5F5F5 primary text, Soft Zinc #A0A0A0 secondary text, Quiet Carbon #6B6B6B muted text, Success Emerald #22C55E paid states, Warning Amber #F59E0B alert states, Danger Red #EF4444 overdue/error states
- Typography: Inter-style neutral grotesk, tight display headlines, medium-weight UI labels, tabular numerals for currency and dates
- Shape and elevation: rounded 16px to 24px surfaces, restrained shadow, matte panels, occasional glass blur only for sticky navigation

VISUAL LANGUAGE:
Treat the main invoice card like a polished digital document embedded inside a premium workspace. Metadata, totals, and payment history should feel exact and accountable, with restrained status color and immaculate table alignment. Avoid making this resemble a PDF viewer chrome, a bare CRUD admin detail page, or a glossy fintech payment portal.

PAGE STRUCTURE:
1. Full desktop app shell with the same sidebar system used across app screens.
2. Sticky page header with back-to-invoices affordance, title line reading Invoice INV-000X, visible status badge, and an action cluster containing Send Invoice, Record Payment, Download PDF, and a compact more-actions trigger for Duplicate Invoice / Void Invoice.
3. Large centered invoice preview card as the hero surface: bill-to block on the left, business identity and logo block on the right, a three-column metadata strip for invoice number / issue date / due date, and a spacious itemized line-items table.
4. Totals block anchored to the lower right of the invoice preview with subtotal, tax, discount, total, amount paid, and a high-emphasis Amount Due capsule using the azure accent.
5. Notes and Payment Terms region below the totals with subtle section labels and readable body text.
6. Separate Payment History card below the invoice preview containing a clean table for date, amount, method, and reference/note, plus a minimal remove action at row end.
7. Use realistic data showing a partially paid invoice so the status system, amount paid, and amount due hierarchy are all visible at once.
```

## Output Files
- landing-prototype.html → public marketing landing page
- dashboard-prototype.html → main authenticated dashboard prototype
- invoice-compose-prototype.html → new invoice composer prototype
- invoice-detail-prototype.html → invoice detail and payment history prototype
- design-brief.md → summarized design rationale and design system notes for this redesign
- .stitch/DESIGN.md → source-of-truth design system for future screens

## Notes for Executor
Generate `.stitch/DESIGN.md` first from the shared design system in these prompts, then produce `design-brief.md`, then generate screens in the order listed above. Keep every screen desktop-only, preserve the dark charcoal + electric azure visual family, and do not introduce stock photography, mascot illustrations, or unsupported feature claims such as time tracking, expense management, payment gateway integrations, client portals, or team collaboration as primary UI.
