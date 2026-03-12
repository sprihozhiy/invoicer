# Invoicer Design System

## Overview
This design system ensures a coherent, premium, and modern aesthetic across the Invoicer SaaS application (both the marketing landing page and the core application UI). It prioritizes clarity, usability, and a professional look that appeals to freelancers and small businesses.

## Design Principles
1.  **Clarity First:** Financial data must be instantly readable. High contrast, clear typography, and generous whitespace.
2.  **Professional Polish:** Users trust applications that look premium. Use subtle shadows, rounded corners, and a constrained color palette to inspire confidence.
3.  **Action-Oriented:** Primary actions (like "Create Invoice" or "Send") should be unmistakably clear.
4.  **Responsive Foundation:** Every component must gracefully scale from mobile to large desktop displays.

## Design Tokens

### Color Palette

**Primary & Accents:**
*   `--primary`: `#4F46E5` (Indigo 600) - Used for primary buttons, active states, and brand highlights.
*   `--primary-hover`: `#4338CA` (Indigo 700)
*   `--primary-light`: `#EEF2FF` (Indigo 50) - Used for subtle backgrounds on active list items.

**Grayscale & Surfaces:**
*   `--bg-app`: `#F8FAFC` (Slate 50) - Application background.
*   `--bg-surface`: `#FFFFFF` - Card and modal backgrounds.
*   `--border-light`: `#E2E8F0` (Slate 200) - Dividers and input borders.
*   `--text-main`: `#0F172A` (Slate 900) - Primary text and headings.
*   `--text-muted`: `#64748B` (Slate 500) - Secondary text, placeholders, and table headers.

**Semantic Feedback:**
*   `--success`: `#10B981` (Emerald 500) - Paid status, success toasts.
*   `--success-light`: `#D1FAE5`
*   `--success-text`: `#065F46`
*   `--warning`: `#F59E0B` (Amber 500) - Partial payments, pending status.
*   `--warning-light`: `#FEF3C7`
*   `--warning-text`: `#92400E`
*   `--danger`: `#EF4444` (Red 500) - Overdue status, destructive actions.
*   `--danger-light`: `#FEE2E2`
*   `--danger-text`: `#991B1B`

### Typography
*   **Font Family:** 'Inter', system-ui, -apple-system, sans-serif.
*   **Scale:**
    *   H1: `2.25rem` (36px), 700 weight, tight tracking.
    *   H2: `1.875rem` (30px), 600 weight.
    *   H3: `1.5rem` (24px), 600 weight.
    *   Body Large: `1.125rem` (18px), 400 weight.
    *   Body: `1rem` (16px), 400 weight.
    *   Small: `0.875rem` (14px), 500 weight.

### Spacing & Borders
*   **Spacing Base:** `0.25rem` (4px). Standard gaps are `1rem` (16px) or `1.5rem` (24px).
*   **Border Radius:**
    *   `--radius-sm`: `0.375rem` (Buttons, inputs).
    *   `--radius-md`: `0.5rem` (Cards).
    *   `--radius-lg`: `0.75rem` (Modals, feature blocks).
*   **Shadows:**
    *   `--shadow-sm`: Subtle elevation for buttons and inputs.
    *   `--shadow-md`: Cards and dropdowns.
    *   `--shadow-lg`: Floating elements, modals.

## Component Patterns

### Buttons
*   **Primary:** Solid background (`--primary`), white text, no border. Hover darkens background.
*   **Secondary:** White background, `--border-light` border, `--text-main`. Hover changes background to `--bg-app`.
*   **Destructive:** Solid background (`--danger`), white text.
*   **Ghost:** Transparent background, `--text-muted`. Hover changes background to `--bg-app`.

### Inputs
*   Always feature a clear, associated label.
*   1px solid `--border-light` border, `--radius-sm`.
*   Focus state: 2px ring with `--primary`, border changes to `--primary`.

### Data Display (Tables/Lists)
*   Table headers use `--text-muted`, uppercase, small font size with generous tracking.
*   Rows have a bottom border (`--border-light`). Hovering a row changes its background slightly to `--bg-app`.
*   Status badges use semantic colors (light background + dark text).

### Navigation
*   Sidebar uses a clean white surface with active states highlighted in `--primary-light` with `--primary` text.
*   Top bar for mobile navigation and contextual actions (like "New Invoice").
