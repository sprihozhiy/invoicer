Wrote [design-plan.md](/home/jeeves/agency/worktrees/invoicer/task-invoicer-redesign-v8/design-plan.md).
is a single-account invoicing SaaS for freelancers and small service businesses who need to create branded invoices, manage clients, reuse catalog items, and track payments without feeling like they are using accounting software. The current functional spec preserves every workflow and route, so this design task is about redesigning the public marketing surface and the authenticated workspace without changing product scope. The design has to solve two trust problems at once: convince non-technical owners that the product is easy and worth adopting, and make the invoices, statuses, and money views feel credible enough to run real client work through. The most important flows to support visually are acquisition on `/`, quick financial orientation on `/dashboard`, invoice authoring on `/invoices/new`, and lifecycle management on `/invoices/[id]`.

## Domain Design Signals
### Desired Signals
- Professional enough that a freelancer would feel confident sending client-facing invoices generated from it.
- Calm financial control, with money and status information feeling legible rather than stressful.
- Fast-moving and practical for solo operators who switch between client work and admin work all day.
- Approachable to non-accountants, with plain-language structure and low cognitive overhead.
- Premium in finish, so the free offering still feels valuable instead of stripped down.
- Document credibility, using invoice-paper cues, tabular numerals, and status semantics that feel precise.
- Focused and disciplined, with clear hierarchy around outstanding balances, overdue items, and next actions.

### Anti-Signals
- Crypto, trading, or fintech-speculation aesthetics with neon glows and performance-dashboard energy.
- Open-source admin-panel clutter that feels configurable but intimidating.
- Enterprise ERP heaviness with cramped controls, dense chrome, and back-office bureaucracy.
- Cheap template-marketplace styling that makes the product feel disposable.
- Cute bookkeeping visuals or illustration-first SMB tropes that trivialize money and collections.
- Generic startup landing-page gradients and abstract blobs with no product proof.
- Overly sterile monochrome minimalism that hides urgency, payment state, and operational clarity.

## Visual Direction
Extend the existing dark product direction rather than replacing it, but refine it from generic dark SaaS into a graphite-and-cobalt invoicing workspace with warmer document accents. The overall mood should be composed, premium, and operational: matte charcoal surfaces, precise blue action states, restrained semantic colors, and occasional paper-tint previews that remind users they are producing client-facing documents. Typography should stay in the Inter family so implementation remains realistic, with compact semibold headings, quiet labels, and tabular figures that make amounts, invoice numbers, and dates feel exact. Spacing should separate by context: marketing sections are spacious and persuasive, while dashboard and invoice views are moderately dense and highly scannable. Surface language should rely on thin borders, layered dark panels, and minimal shadow rather than glassmorphism; image treatment should be product-led, using dashboard and invoice compositions instead of stock photography. Interaction tone should feel decisive and low-friction, with crisp hover states, subtle motion, and an emotional posture of being in control of cash flow rather than wrestling with accounting software.

## Design Rationale
The research brief points to a clear opening between FreshBooks-level polish and the free, generous positioning associated with Wave and Zoho Invoice, so the redesign should feel easier and more elegant than traditional invoicing software without looking cheap. The visually dominant messages should be professional output, fast setup, and immediate cash-flow clarity: on marketing, that means the hero, dashboard proof, and free pricing claim; in-app, that means outstanding totals, overdue signals, invoice status, and real-time totals during invoice creation. Dashboard and invoice lifecycle screens should be data-dense but calm, using hierarchy and contrast instead of compression; onboarding, settings, and form-heavy areas should feel quieter and more guided. Trust comes from concrete product proof, consistent financial semantics, invoice-document cues, and avoiding the utilitarian clutter called out in Invoice Ninja while preserving the non-intimidating simplicity users value in Wave. This direction also respects the current codebase, which already uses a dark theme, a blue accent, and custom Tailwind-built components, but needs sharper hierarchy and a less interchangeable SaaS look.

## Screens to Generate

### Screen 1: Marketing Landing Page
- **Output file:** landing-prototype.html
- **Device type:** DESKTOP
- **Purpose:** Public acquisition page for freelancers and small business owners deciding whether Invoicer is credible, simple, and generous enough to try. It must translate the promise of free, professional invoicing into immediate visual trust while previewing the actual app experience.
**Visual Priorities:**
- Professional invoice creation and payment clarity must be obvious in the first viewport.
- The free core offer and low-friction signup message must read within seconds without making the product feel cheap.
- Product proof should dominate over abstract branding, using dashboard and invoice mockups instead of lifestyle imagery.
- The page should feel easier and more polished than accounting software, but still serious about money.
- **Stitch prompt:**
```md
Confident, polished desktop landing page for a free invoicing SaaS, with a calm premium atmosphere and strong product-proof visuals for freelancers and small service businesses.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, desktop-first
- Palette: Graphite Canvas (#0F1115 background), Carbon Surface (#171B22 primary panels), Slate Lift (#202632 elevated cards and inputs), Cobalt Action (#178DEE primary buttons and active states), Cobalt Hover (#3BA2F5 interaction hover), Ice Text (#F3F6FA headings and key numbers), Mist Text (#98A2B3 secondary text), Ledger Line (#2C3442 borders and dividers), Paper Tint (#F7F4EE invoice/document surfaces), Paper Ink (#1E2430 document text), Success Emerald (#1FB36A paid states), Warning Amber (#E7A63B partial states), Danger Red (#E45858 overdue and destructive states)
- Typography: Inter or a nearly identical neutral grotesk; semibold compact headings, medium-weight UI labels, tabular numerals for money, restrained uppercase table headers
- Layout: 12-column desktop grid, max content width 1280px, 32px outer padding, 24px card padding, generous vertical rhythm between sections
- Shapes: 18px card radius, 12px input radius, pill badges for statuses, crisp 1px borders, minimal shadows
- Motion: 160-220ms ease-out transitions, subtle fade and rise reveals only, no bounce, no parallax

**VISUAL LANGUAGE:**
- Use a premium dark editorial-product look: matte graphite page, cobalt action color, and warm paper-tint invoice previews inside the hero mockup.
- Keep the landing page visually related to the authenticated app, not like a separate brand campaign.
- Favor product UI compositions, invoice snippets, status pills, and numeric highlights over stock photography or illustrations.
- Avoid generic startup blobs, glassmorphism, crypto-dashboard neon, or cheerful bookkeeping cartoons.

**PAGE STRUCTURE:**
1. Sticky top navigation with wordmark, anchor links for Features / How It Works / Pricing, secondary "Sign In" action, and high-contrast primary "Get Started Free" button.
2. Hero section with eyebrow "Free to start — no credit card required," bold headline "Professional invoices that get paid.", concise subheadline, primary CTA, secondary CTA, and a large split product composition showing a dashboard panel beside a warm invoice preview card.
3. Product proof strip directly under hero with concise proof chips such as unlimited invoices, unlimited clients, branded PDF generation, dashboard payment tracking, and 20 supported currencies.
4. Six-card feature grid for Effortless invoicing, Client management, Payment tracking, Catalog items, At-a-glance dashboard, and Professional PDF, using icon-led cards with strong hierarchy and one-sentence value framing.
5. Dashboard showcase section with an oversized app screenshot composition focused on outstanding, overdue, paid-this-month, and recent invoices, plus supporting copy that frames clarity and cash-flow control.
6. How-it-works section with three clearly sequenced steps: set up profile, build invoice, send and track, using structured step cards rather than playful illustrations.
7. Pricing section with a single dominant free-plan card that highlights unlimited invoices, unlimited clients, branded PDFs, payment tracking, catalog items, and multi-currency support, plus roadmap note for team features and advanced reporting.
8. Final CTA section emphasizing "Your clients judge your invoice before they pay it." with one strong CTA and compact supporting line.
9. Footer with product, company, and legal columns in a restrained low-contrast layout.
```

### Screen 2: Dashboard Workspace
- **Output file:** dashboard-prototype.html
- **Device type:** DESKTOP
- **Purpose:** Main authenticated home screen where a business owner quickly understands what is outstanding, what is overdue, and what needs action today. This screen should make the app feel immediately useful and financially trustworthy after login.
**Visual Priorities:**
- Outstanding, overdue, and paid-this-month amounts must dominate the screen with clear numeric hierarchy.
- The user should understand where to act next: create invoice, inspect overdue accounts, or open recent invoices.
- Data density should feel controlled and calm, not like a finance terminal.
- Status badges, due dates, and money values must read as precise and dependable.
- **Stitch prompt:**
```md
Calm, high-clarity desktop dashboard for an invoicing workspace, with a disciplined dark atmosphere and immediate cash-flow visibility for a solo business owner.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, desktop-first
- Palette: Graphite Canvas (#0F1115 background), Carbon Surface (#171B22 primary panels), Slate Lift (#202632 elevated cards and inputs), Cobalt Action (#178DEE primary buttons and active states), Cobalt Hover (#3BA2F5 interaction hover), Ice Text (#F3F6FA headings and key numbers), Mist Text (#98A2B3 secondary text), Ledger Line (#2C3442 borders and dividers), Paper Tint (#F7F4EE invoice/document surfaces), Paper Ink (#1E2430 document text), Success Emerald (#1FB36A paid states), Warning Amber (#E7A63B partial states), Danger Red (#E45858 overdue and destructive states)
- Typography: Inter or a nearly identical neutral grotesk; semibold compact headings, medium-weight UI labels, tabular numerals for money, restrained uppercase table headers
- Layout: 12-column desktop grid, 240px left navigation rail, 1280px content container, 32px outer padding, 24px card padding, strong vertical separation between summary and table zones
- Shapes: 18px card radius, 12px input radius, pill badges for statuses, crisp 1px borders, minimal shadows
- Motion: 160-220ms ease-out transitions, subtle fade and rise reveals only, no bounce, no parallax

**VISUAL LANGUAGE:**
- Make the dashboard feel like an operational control room for a small business, not a speculative finance dashboard.
- Use color sparingly and semantically: cobalt for action, emerald for received money, amber for partial states, red for overdue urgency.
- Emphasize numerical calm with tabular figures, clean separators, and controlled contrast.
- Avoid Bloomberg-terminal density, crypto charts, KPI clutter, or bright enterprise-dashboard gradients.

**PAGE STRUCTURE:**
1. Persistent app shell with left navigation rail for Dashboard, Invoices, Clients, Catalog, and Settings; compact brand lockup at top and account utility area at bottom.
2. Page header row with "Dashboard" title, one-line explanatory subtitle, and high-contrast "New Invoice" primary button.
3. Three primary metric cards for Total Outstanding, Total Overdue, and Paid This Month, each with a subtle semantic accent treatment and large tabular numeric values.
4. Compact currency disclaimer or context note placed below the metric row, styled quietly so it informs without competing.
5. Main content split into a wide Recent Invoices table and a narrower Overdue Invoices panel; both should use consistent table styling, precise status badges, and clickable row affordances.
6. Recent Invoices table with columns for client, invoice number, amount, status, and due date, plus tidy row hover behavior and empty-state treatment.
7. Overdue panel with stacked rows that prioritize client, amount due, days overdue, and a direct action affordance to open the invoice.
8. Secondary lower strip or compact side card for quick operational context such as recent activity, next recommended action, or a concise "keep cash moving" helper message based on current app data patterns.
```

### Screen 3: Invoice Builder
- **Output file:** invoice-builder-prototype.html
- **Device type:** DESKTOP
- **Purpose:** Primary creation screen where users turn service work into a client-ready invoice. It must feel significantly easier than a spreadsheet while still giving confidence that totals, payment terms, and client details are under control.
**Visual Priorities:**
- The client selection and invoice metadata must be immediately understandable and easy to edit.
- The line-item editor must dominate, with totals and monetary consequences visible without scrolling far.
- The screen should feel calm and guided, not like a complex accounting form.
- The user must sense that creating a polished invoice is the product’s core competence.
- **Stitch prompt:**
```md
Focused, premium desktop invoice-creation screen with a calm document-authoring atmosphere and precise financial structure for non-accountants.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, desktop-first
- Palette: Graphite Canvas (#0F1115 background), Carbon Surface (#171B22 primary panels), Slate Lift (#202632 elevated cards and inputs), Cobalt Action (#178DEE primary buttons and active states), Cobalt Hover (#3BA2F5 interaction hover), Ice Text (#F3F6FA headings and key numbers), Mist Text (#98A2B3 secondary text), Ledger Line (#2C3442 borders and dividers), Paper Tint (#F7F4EE invoice/document surfaces), Paper Ink (#1E2430 document text), Success Emerald (#1FB36A paid states), Warning Amber (#E7A63B partial states), Danger Red (#E45858 overdue and destructive states)
- Typography: Inter or a nearly identical neutral grotesk; semibold compact headings, medium-weight UI labels, tabular numerals for money, restrained uppercase table headers
- Layout: 12-column desktop grid, 240px left navigation rail, 1280px content container, 32px outer padding, 24px card padding, strong emphasis on the editing canvas
- Shapes: 18px card radius, 12px input radius, pill badges for statuses, crisp 1px borders, minimal shadows
- Motion: 160-220ms ease-out transitions, subtle fade and rise reveals only, no bounce, no parallax

**VISUAL LANGUAGE:**
- Treat this like a structured document builder, not a spreadsheet and not a dense ERP form.
- Introduce warm paper cues inside totals or preview modules so users remember the end result is client-facing.
- Keep controls custom, crisp, and understated, with the line-item grid and totals panel doing the visual heavy lifting.
- Avoid tiny inputs, excessive table chrome, bright gradient cards, or a tax-software aesthetic.

**PAGE STRUCTURE:**
1. Persistent app shell with left navigation rail and a page header containing breadcrumbs, "New Invoice" title, and primary save/create action cluster.
2. Top configuration band with two large cards: client selection on the left and invoice metadata on the right, covering invoice number, issue date, due date, and currency.
3. Client selection card with searchable client picker, visible selected-client summary state, and a compact inline affordance to add a new client without leaving the page.
4. Main line-items editor card occupying the largest area, with a structured editable table for description, quantity, unit price, taxable toggle, row amount, reorder controls, and remove-row actions.
5. Show one active line item with a catalog autocomplete dropdown or suggestion panel open, proving that reusable catalog items accelerate entry.
6. Secondary controls below the line-items grid for adding a line item, applying tax rate, choosing discount type, and entering discount value.
7. Right-side or lower totals summary card with subtotal, tax amount, discount amount, total, amount paid, and amount due, all in tabular numerals with clear visual hierarchy.
8. Notes and payment terms section in a quieter panel, with enough space for default terms and invoice-specific notes.
9. Sticky bottom action bar or persistent header actions for save draft, cancel, and final create action, keeping the workflow anchored.
```

### Screen 4: Invoice Detail and Payment Tracking
- **Output file:** invoice-detail-prototype.html
- **Device type:** DESKTOP
- **Purpose:** Operational detail screen for reviewing a single invoice, confirming what has been sent, what is still owed, and what action comes next. This is where the product proves it can manage the full invoice lifecycle, not just generate a form.
**Visual Priorities:**
- Invoice status, amount due, due date, and next actions must dominate above the fold.
- The page must feel trustworthy enough to represent a real client-facing financial document.
- Payment history and status progression should be instantly legible.
- Download PDF, send, duplicate, void, and record payment actions must feel controlled rather than risky.
- **Stitch prompt:**
```md
Composed, high-trust desktop invoice detail screen with a premium dark workspace atmosphere and clear payment-lifecycle visibility for a real client account.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, desktop-first
- Palette: Graphite Canvas (#0F1115 background), Carbon Surface (#171B22 primary panels), Slate Lift (#202632 elevated cards and inputs), Cobalt Action (#178DEE primary buttons and active states), Cobalt Hover (#3BA2F5 interaction hover), Ice Text (#F3F6FA headings and key numbers), Mist Text (#98A2B3 secondary text), Ledger Line (#2C3442 borders and dividers), Paper Tint (#F7F4EE invoice/document surfaces), Paper Ink (#1E2430 document text), Success Emerald (#1FB36A paid states), Warning Amber (#E7A63B partial states), Danger Red (#E45858 overdue and destructive states)
- Typography: Inter or a nearly identical neutral grotesk; semibold compact headings, medium-weight UI labels, tabular numerals for money, restrained uppercase table headers
- Layout: 12-column desktop grid, 240px left navigation rail, 1280px content container, 32px outer padding, 24px card padding, balanced split between summary actions and document detail
- Shapes: 18px card radius, 12px input radius, pill badges for statuses, crisp 1px borders, minimal shadows
- Motion: 160-220ms ease-out transitions, subtle fade and rise reveals only, no bounce, no parallax

**VISUAL LANGUAGE:**
- Blend operational dashboard cues with a polished invoice-document presentation so the screen feels both actionable and client-ready.
- Use semantic color carefully to distinguish sent, partial, paid, overdue, and void states without making the screen noisy.
- Let the invoice document module feel slightly warmer and more paper-like than the surrounding workspace.
- Avoid cluttered activity feeds, skeuomorphic paper textures, or aggressive warning-red overuse.

**PAGE STRUCTURE:**
1. Persistent app shell with left navigation rail and a page-level breadcrumb back to Invoices.
2. Hero header card with invoice number, client identity, high-contrast status badge, amount due, due date, and a tight action cluster for Download PDF, Send Invoice, Record Payment, Duplicate, and Void.
3. Summary metric strip with compact cards for total, amount paid, amount due, issue date, and payment terms, using precise tabular numerals.
4. Main content area split into a large invoice presentation card and a right-side operational rail.
5. Invoice presentation card styled as a clean digital document with business identity, client block, line-item table, subtotal/tax/discount/total stack, notes, and terms.
6. Operational rail with payment history timeline, each entry showing amount, method, paid date, and reference, plus a compact empty state when no payments exist.
7. Additional contextual card for client snapshot or invoice lifecycle details, reinforcing ownership, send state, and timing without inventing new product features.
8. Quiet secondary area for destructive or low-frequency actions, visually separated so the primary job of reviewing and recording payment remains dominant.
```

## Output Files
- landing-prototype.html → public marketing landing page prototype
- dashboard-prototype.html → authenticated dashboard workspace prototype
- invoice-builder-prototype.html → invoice creation workflow prototype
- invoice-detail-prototype.html → single-invoice detail and payment tracking prototype
- design-brief.md → summarized visual design specification for implementation handoff
- .stitch/DESIGN.md → source-of-truth design system derived from the shared prompt system above

## Notes for Executor
Create `.stitch/DESIGN.md` first from the shared design system used across these prompts, then generate the four desktop screens against it. Keep product scope exactly aligned to the current routes and features: no team-management UI, no payment-processor widgets, no analytics beyond the existing dashboard stats, and no light-theme divergence from the established dark workspace.
