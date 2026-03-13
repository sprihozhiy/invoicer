# Design Brief: Invoicer SaaS

## 1. Product Positioning
A premium, easy-to-use invoice generator targeting freelancers and small businesses. It combines the aesthetic polish and intuitiveness of FreshBooks with a generous freemium model similar to Zoho Invoice. The brand exudes trust, clarity, and ease of use.

## 2. Design Principles
* **Clarity over Density:** Ample whitespace, clear typographic hierarchy. We don't overwhelm the user with data.
* **Trust and Professionalism:** Crisp borders, subtle shadows, and a restrained color palette.
* **Frictionless Action:** Primary actions (Create Invoice, Send, Pay) are unmistakably prominent.
* **Coherence:** Marketing pages and the application share the exact same visual DNA.

## 3. Design System (Tokens)

### 3.1 Colors
* **Brand / Accent:** 
  * `--brand-500`: `#4f46e5` (Indigo - Primary actions)
  * `--brand-600`: `#4338ca` (Indigo Hover)
  * `--brand-50`: `#eef2ff` (Indigo Light - Soft backgrounds)
* **Neutrals (Slate):**
  * `--bg-main`: `#f8fafc` (App background)
  * `--surface`: `#ffffff` (Cards, modals)
  * `--text-primary`: `#0f172a` (Headings, strong text)
  * `--text-secondary`: `#475569` (Body, labels)
  * `--text-muted`: `#94a3b8` (Placeholders, disabled)
  * `--border`: `#e2e8f0` (Dividers, inputs)
* **Semantic (Status & Alerts):**
  * `--success`: `#10b981` (Paid status)
  * `--success-bg`: `#d1fae5`
  * `--warning`: `#f59e0b` (Draft/Pending status)
  * `--warning-bg`: `#fef3c7`
  * `--danger`: `#ef4444` (Overdue/Void status, Destructive actions)
  * `--danger-bg`: `#fee2e2`

### 3.2 Typography
* **Font Family:** `Inter`, `system-ui`, `-apple-system`, `sans-serif`
* **Scale:**
  * `--text-xs`: 0.75rem (12px)
  * `--text-sm`: 0.875rem (14px)
  * `--text-base`: 1rem (16px)
  * `--text-lg`: 1.125rem (18px)
  * `--text-xl`: 1.25rem (20px)
  * `--text-2xl`: 1.5rem (24px)
  * `--text-3xl`: 1.875rem (30px)
* **Weights:** Regular (400), Medium (500), SemiBold (600), Bold (700).

### 3.3 Spacing & Layout
* **Scale:** `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`.
* **Border Radius:** 
  * `--radius-sm`: `4px`
  * `--radius-md`: `8px`
  * `--radius-lg`: `12px`
  * `--radius-full`: `9999px`
* **Shadows:**
  * `--shadow-sm`: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
  * `--shadow-md`: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`
  * `--shadow-lg`: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)`

## 4. Components
* **Buttons:** Solid for primary (Brand), outline/ghost for secondary. Border radius `8px`. Padding `8px 16px`.
* **Cards:** White background (`--surface`), 1px solid border (`--border`), subtle shadow (`--shadow-sm`).
* **Badges:** Pill-shaped (`--radius-full`) with semantic background/text colors for Invoice Status. Padding `2px 8px`, `text-xs`, `font-medium`.
* **Inputs:** 1px solid border (`--border`), rounded (`--radius-md`), padding `8px 12px`. Focus state gets a brand-colored outline.
* **Tables:** Clean, edge-to-edge inside cards, with light grey borders separating rows.
