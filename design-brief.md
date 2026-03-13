# Design Brief

## Color Tokens
- **Primary:** `#178dee`
- **Background (Light):** `#f6f7f8`
- **Background (Dark):** `#101a22`
- **Surface:** `white` / `slate-900`
- **Text:** `slate-900` (headings, primary text), `slate-600` / `slate-500` (secondary text)
- **Status Colors:**
  - Success/Paid: `emerald`
  - Warning/Pending: `amber`
  - Danger/Overdue: `red`

## Typography
- **Font Family:** `Inter`
- **Weights:** Regular (400), Medium (500), SemiBold (600), Bold (700)
- **Patterns:** Headings use `leading-tight` and `font-bold`.

## Spacing & Layout
- **Sidebar Width:** `min-w-[280px]`
- **Main Content Padding:** `p-8`
- **Container Max Width:** `max-w-[1200px]`
- **Gaps:** Common gaps include `gap-3`, `gap-6`, `gap-8`.

## Component Patterns
- **Sidebar Navigation:** Items have an icon (Material Symbols) and text, rounded corners (`rounded-lg`), hover states (`hover:bg-slate-100`), and a primary active state style (`bg-primary/10 text-primary`).
- **Top Header:** Sticky top, contains a search bar and user profile actions, separated by a bottom border.
- **Cards (Stats):** Rounded-xl (`rounded-xl`), bordered (`border-slate-200`), with an icon, main value, and percentage change.
- **Tables:** Full width, left-aligned, text wrapping (`whitespace-nowrap`), with status badges (pill-shaped `rounded-full` backgrounds with text).
- **Icons:** Uses `Material Symbols Outlined`.
- **Border Radius:** Frequently uses `rounded-lg` (0.5rem) and `rounded-xl` (0.75rem) for main components, and `rounded-full` for badges/avatars.
