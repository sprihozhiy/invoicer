# Invoicer: Design System & Brand Guidelines

This document outlines the design system for the Invoicer SaaS application, covering both marketing and in-app interfaces. The aesthetic is modern, professional, and minimalist, built on a premium dark theme.

---

## 1. Aesthetic Goals

- **Modern & Professional:** The UI should feel current, clean, and trustworthy, reinforcing the idea that our users can create professional-grade documents.
- **Minimalist:** We prioritize clarity and ease of use. Every element should have a purpose. We avoid visual clutter.
- **Breathable:** We use generous white space (negative space) through padding and margins to create a calm, uncluttered, and premium feel.
- **Action-Oriented:** The design should guide the user towards primary actions like "New Invoice" or "Record Payment" with clear visual hierarchy.

---

## 2. Color Palette (Dark Mode)

The entire product uses a single dark mode theme. All color combinations meet WCAG AA contrast standards.

| Role | Hex | Usage |
|---|---|---|
| **Backgrounds** | | |
| `bg-primary` | `#0F0F0F` | Main page background for both marketing and app. |
| `bg-surface` | `#1A1A1A` | Cards, panels, sidebars, and main content areas. |
| `bg-elevated` | `#242424` | Modals, dropdowns, popovers, and input fields. |
| `bg-hover` | `#2E2E2E` | Hover state for list items and interactive neutral surfaces. |
| **Text** | | |
| `text-primary` | `#F5F5F5` | Headings and primary body content. |
| `text-secondary`| `#A0A0A0` | Subheadings, secondary body content, and descriptive text. |
| `text-muted` | `#6B6B6B` | Helper text, disabled states, and placeholder text. |
| **Borders** | | |
| `border-primary`| `#2E2E2E` | Default border for cards, inputs, and layout divisions. |
| `border-focus` | `#6366F1` | Border color for focused interactive elements (see Accent). |
| **Accent (Indigo)** | | |
| `accent-primary`| `#6366F1` | Primary CTAs, links, focus rings, and key icons. |
| `accent-hover` | `#818CF8` | Hover state for accent-colored elements. |
| `accent-active` | `#4F46E5` | Pressed/active state for accent-colored elements. |
| `accent-text` | `#FFFFFF` | Text color on top of `accent-primary` backgrounds. |
| **Semantic Colors** | | |
| `success-fg` | `#22C55E` | "Paid" status, success messages. |
| `success-bg` | `#052E16` | Background for "Paid" status badge. |
| `warning-fg` | `#F59E0B` | "Partial" status, warning messages. |
| `warning-bg` | `#431407` | Background for "Partial" status badge. |
| `danger-fg` | `#EF4444` | "Overdue" status, error messages, delete/void actions. |
| `danger-bg` | `#450A0A` | Background for "Overdue" status badge. |
| `info-fg` | `#6366F1` | "Sent" status, informational messages (re-uses accent). |
| `info-bg` | `#1E1B4B` | Background for "Sent" status badge. |
| `neutral-fg` | `#A0A0A0` | "Draft" status. |
| `neutral-bg` | `#1C1C1C` | Background for "Draft" status badge. |
| `void-fg` | `#6B6B6B` | "Void" status. |
| `void-bg` | `#171717` | Background for "Void" status badge. |

---

## 3. Typography

- **Font:** Inter (sans-serif). Sourced from Google Fonts. It offers excellent readability at all sizes.
- **Weights:** Regular (400), Medium (500), SemiBold (600), Bold (700).

| Element | Font Size (px) | Font Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|
| Display | 60 | Bold (700) | 1.2 | -0.02em | Marketing hero title. |
| Heading 1 | 48 | Bold (700) | 1.2 | -0.02em | Marketing section heads, App page titles. |
| Heading 2 | 36 | SemiBold (600) | 1.3 | -0.01em | Sub-sections, large modal titles. |
| Heading 3 | 24 | SemiBold (600) | 1.4 | 0 | Card titles, feature titles. |
| Heading 4 | 20 | Medium (500) | 1.5 | 0 | Minor headings. |
| Body (Lg) | 18 | Regular (400) | 1.6 | 0 | Marketing body copy. |
| Body (Md) | 16 | Regular (400) | 1.6 | 0 | App body copy, form inputs. |
| Body (Sm) | 14 | Regular (400) | 1.5 | 0 | Table text, helper text, metadata. |
| Label | 12 | Medium (500) | 1.0 | 0.01em | Form labels, status badges, uppercase tags. |

---

## 4. Spacing

A 4-point grid system is used for all spacing (margins, padding, gaps).

| Token | Value (px) | Usage |
|---|---|---|
| `space-1` | 4 | |
| `space-2` | 8 | |
| `space-3` | 12 | |
| `space-4` | 16 | Standard padding inside components. |
| `space-5` | 20 | |
| `space-6` | 24 | Padding for larger components (cards, modals). |
| `space-8` | 32 | Gap between components. |
| `space-10` | 40 | |
| `space-12` | 48 | |
| `space-16` | 64 | Gap between page sections. |
| `space-24` | 96 | Large vertical gap for marketing pages. |
| `space-32` | 128 | |

---

## 5. Icons (Lucide)

- **Library:** [Lucide](https://lucide.dev/)
- **Source:** CDN - `https://unpkg.com/lucide@latest`
- **Implementation:** Icons are injected using JavaScript (`lucide.createIcons()`).
- **Standard Stroke Width:** `1.5px` for a thin, modern feel.
- **Sizing:**
  - **Navigation / UI:** `18px` (e.g., sidebar, buttons, table actions).
  - **Feature / Hero:** `24px` (e.g., feature lists on marketing pages).
  - **Decorative:** Sizes may vary, but should not exceed `48px`.
- **Color:** Icons should inherit color via `currentColor` to match parent text color (e.g., `text-secondary` for a gray icon).

---

## 6. Layout & Breakpoints

- **Breakpoints:**
  - **Mobile:** `375px` (Base styles)
  - **Tablet:** `768px` (min-width)
  - **Desktop:** `1440px` (min-width)
- **Container:**
  - A centered container with a `max-width` of `1280px` is used for both app and marketing pages on desktop.
  - Padding: `24px` on mobile, `48px` on tablet/desktop.
- **Marketing Page Layout:**
  - Full-width sections with centered content containers.
  - Responsive grids for feature lists and pricing tables.
- **App Layout:**
  - **Desktop:** A fixed vertical sidebar (`240px` width) with main content area.
  - **Tablet/Mobile:** The sidebar collapses into a hamburger-menu-driven drawer or a top navigation bar.

---

## 7. Component Patterns

- **Buttons:**
  - **Primary:** `accent-primary` background, `accent-text` color.
  - **Secondary:** `bg-elevated` background, `text-primary` color.
  - **Destructive:** Transparent background, `danger-fg` border and text.
  - **Padding:** `12px 20px` for standard buttons.
  - **Radius:** `8px`.
  - **Focus:** `2px` solid `accent-primary` ring with a `2px` transparent offset.

- **Forms:**
  - **Inputs/Textareas:** `bg-elevated` background, `border-primary` border. On focus, border becomes `border-focus`. `16px` font size. `12px 16px` padding.
  - **Labels:** `12px` font size, `text-secondary` color, placed `8px` above the input.
  - **Selects:** Styled to match inputs, with a chevron icon from Lucide (`chevron-down`).

- **Cards:**
  - **Background:** `bg-surface`.
  - **Border:** `1px solid border-primary`.
  - **Radius:** `12px`.
  - **Padding:** `24px`.

- **Modals:**
  - **Overlay:** `rgba(0, 0, 0, 0.7)`.
  - **Dialog:** `bg-elevated` background, `16px` radius, `32px` padding.
  - **Sizing:** Max width `500px` on desktop.

- **Tables:**
  - No outer border. Rows are separated by a `1px solid border-primary` line.
  - Header: `12px` uppercase `text-secondary`.
  - Body: `14px` `text-primary`.
  - Row Hover: `bg-hover`.

---

## 8. Animation

- **Timing Function:** `cubic-bezier(0.4, 0, 0.2, 1)` for most transitions.
- **Duration:** `200ms` for fast feedback (hovers), `300ms` for transitions (modals, drawers).
- **Marketing Page Animations:**
  - **Hero:** Staggered fade-in/slide-up animation for headline, sub-headline, and CTA.
  - **Scroll Reveal:** Elements (feature cards, testimonials) fade in and slide up slightly as they enter the viewport.
- **App Animations:**
  - Subtle fade-in for page content on navigation.
  - Modal/Drawer entrance/exit animations (scale and fade for modals, slide for drawers).
  - List item animations on add/remove (fade and height transition).
