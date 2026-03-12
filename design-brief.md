# Design Brief: Invoicer

## 1. Overview & Philosophy

This document outlines the design system for the Invoicer application and its marketing website. The guiding philosophy is to combine the design polish and intuitive user experience of a premium product like FreshBooks with a generous, accessible feature set.

The brand is professional, modern, and trustworthy. The UI should feel effortless, enabling freelancers and small business owners to manage their finances with confidence. We prioritize clarity, consistency, and a calm, focused user experience.

## 2. Color System

The color palette is minimal and purposeful, built around a primary accent color and a set of neutral grays. This ensures that important information and actions are always clear. All colors are defined as CSS variables for easy theming and maintenance, adhering to the Tailwind v4 approach.

| Role | CSS Variable | Hex | Usage |
|---|---|---|---|
| **Primary Accent** | `--accent-primary` | `#4F46E5` | Main CTAs, links, active states, key metrics. |
| **Primary Accent (Hover)** | `--accent-primary-hover` | `#4338CA` | Hover state for primary elements. |
| **Primary Accent (Muted)** | `--accent-muted` | `#EEF2FF` | Backgrounds for highlighted sections, subtle accents. |
| **Neutral (Text)** | `--text-primary` | `#111827` | Body copy, headlines. |
| **Neutral (Text Secondary)** | `--text-secondary` | `#6B7280` | Subheadings, labels, secondary info. |
| **Neutral (Border)** | `--border-primary` | `#D1D5DB` | Borders for inputs, cards, dividers. |
| **Neutral (Border Hover)** | `--border-hover` | `#9CA3AF` | Hover state for bordered elements. |
| **Neutral (Background)** | `--bg-primary` | `#FFFFFF` | Main background for pages and cards. |
| **Neutral (Background Alt)** | `--bg-secondary` | `#F9FAFB` | Alternate, slightly darker background. |
| **Success** | `--status-success` | `#10B981` | Paid, successful actions. |
| **Warning** | `--status-warning` | `#F59E0B` | Partial, pending. |
| **Danger** | `--status-danger` | `#EF4444` | Overdue, errors, destructive actions. |
| **Info** | `--status-info` | `#3B82F6` | Draft, informational messages. |

## 3. Typography

The typographic scale is designed for clarity and hierarchy on both marketing and app pages. We use a single, modern, sans-serif font for all text.

*   **Font Family:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`

| Element | Font Size | Font Weight | Line Height | Usage |
|---|---|---|---|---|
| Display | 3rem (48px) | 700 | 1.2 | Main hero headline on landing page. |
| H1 | 2.25rem (36px) | 700 | 1.25 | Page titles, major section headers. |
| H2 | 1.5rem (24px) | 700 | 1.3 | Sub-section headers. |
| H3 | 1.25rem (20px) | 600 | 1.4 | Card titles, minor headers. |
| H4 | 1rem (16px) | 600 | 1.5 | Small titles, bold labels. |
| Body (Large) | 1.125rem (18px) | 400 | 1.6 | Landing page body copy. |
| Body | 1rem (16px) | 400 | 1.5 | Main application text, paragraphs. |
| Small | 0.875rem (14px) | 400 | 1.4 | Form labels, table headers, metadata. |
| Tiny | 0.75rem (12px) | 500 | 1.3 | Badges, utility text. |

## 4. Spacing & Layout

A consistent 4px-based spacing scale is used for all padding, margins, and gaps. This creates a harmonious rhythm and visual consistency.

*   **Base Unit:** 4px
*   **Scale:** `4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 96px`

**Layout Principles:**
*   **Max Width:** Content on marketing pages is constrained to `1280px`. App content is fluid within the main content area.
*   **Gutters:** A standard `24px` gutter is used between major layout elements.
*   **App Shell:** The application uses a responsive sidebar layout. The sidebar is visible on desktop and collapses to a mobile-friendly menu on smaller screens. The main content area has `32px` padding.

## 5. Component System

Components are the building blocks of the UI. They are designed to be reusable, accessible, and consistent.

### Buttons

| Variant | Background | Text Color | Border | Usage |
|---|---|---|---|---|
| **Primary** | `var(--accent-primary)` | `white` | None | Main CTAs (e.g., "New Invoice", "Save"). |
| **Secondary** | `var(--bg-primary)` | `var(--text-primary)` | `var(--border-primary)` | Secondary actions (e.g., "Cancel", "Export"). |
| **Danger** | `var(--status-danger)` | `white` | None | Destructive actions (e.g., "Delete", "Void"). |
| **Link** | `transparent` | `var(--accent-primary)` | None | Tertiary actions, inline links. |

*   **Interaction:** Buttons have a subtle scale transform (`scale(0.98)`) on press and a darker background/border on hover.
*   **States:** Disabled state has `opacity: 0.5` and `cursor: not-allowed`.

### Form Fields

*   **Appearance:** Inputs have a `1px` border (`var(--border-primary)`), a `var(--bg-primary)` background, and `12px` padding.
*   **States:**
    *   **Focus:** Border color changes to `var(--accent-primary)` with a subtle box-shadow.
    *   **Error:** Border color changes to `var(--status-danger)`. An error message is displayed below the input.
*   **Labels:** Labels use "Small" typography and are placed above their corresponding input.

### Cards

*   **Appearance:** Cards have a `var(--bg-primary)` background, `1px` border (`var(--border-primary)`), and rounded corners (`8px`). They use a soft box-shadow for depth.
*   **Padding:** Standard card padding is `24px`.

### Modals

*   **Appearance:** Modals appear centered on the screen with a dark, semi-transparent backdrop. They use the same styling as Cards.
*   **Behavior:** Modals are dismissible by clicking the backdrop or an explicit "Close" / "Cancel" button.

### Status Badges

*   **Appearance:** Small, pill-shaped badges with soft background colors derived from the status palette.
*   **Styling:**
    *   **Paid/Success:** `background-color: var(--status-success); color: white;`
    *   **Partial/Warning:** `background-color: var(--status-warning); color: white;`
    *   **Overdue/Danger:** `background-color: var(--status-danger); color: white;`
    *   **Draft/Info:** `background-color: var(--status-info); color: white;`

## 6. Responsiveness

The design is fully responsive and optimized for both desktop and mobile experiences.

*   **Breakpoints:**
    *   **Mobile:** `< 768px`
    *   **Tablet:** `768px - 1024px`
    *   **Desktop:** `> 1024px`
*   **Mobile Strategy:**
    *   App sidebar collapses into a hamburger menu.
    *   Data tables become a stack of card-like rows.
    *   Typography and spacing are scaled down appropriately.
    *   Marketing page sections stack vertically.

## 7. Interaction & Motion

Motion is used sparingly to enhance the user experience, not distract from it.
*   **Timing:** `150ms` ease-in-out for most transitions (color, transform).
*   **Feedback:** Interactive elements provide clear visual feedback on hover, focus, and active states.
*   **Loading States:** Skeletons or spinners are used to indicate loading content, preventing layout shift.
*   **Empty States:** Empty pages (e.g., no invoices) will feature a clean illustration and a clear call-to-action to guide the user's next step.
