# Design Brief: Invoicer Redesign

## 1. Concept & Positioning
The redesign shifts Invoicer from a utilitarian dark-mode tool to a premium, highly polished SaaS product. Drawing inspiration from FreshBooks and Stripe, the aesthetic is clean, professional, and trustworthy. The goal is to make small business owners feel confident and look professional when managing their finances.

## 2. Color System
We use a high-contrast light mode for the main workspace to ensure readability of financial data, paired with a dark sidebar to anchor the navigation.

*   **Brand Primary:** Indigo 600 (`#4f46e5`) — Used for primary actions, active states, and marketing highlights.
*   **Brand Secondary:** Violet 600 (`#7c3aed`) — Used for gradients and marketing visual interest.
*   **Backgrounds:**
    *   **Page Background:** Slate 50 (`#f8fafc`) — Soft and airy.
    *   **Surface/Card:** White (`#ffffff`) — Crisp separation from the background.
    *   **App Sidebar:** Slate 900 (`#0f172a`) — Professional, high-contrast navigation.
*   **Text:**
    *   **Primary:** Slate 900 (`#0f172a`) — Headings and primary data.
    *   **Secondary:** Slate 600 (`#475569`) — Body text, table headers, labels.
    *   **Muted:** Slate 400 (`#94a3b8`) — Placeholders, disabled states.
*   **Semantic/Status Colors:**
    *   **Success/Paid:** Text Emerald 700 (`#047857`), Bg Emerald 100 (`#d1fae5`)
    *   **Error/Overdue/Void:** Text Red 700 (`#b91c1c`), Bg Red 100 (`#fee2e2`)
    *   **Warning/Draft/Partial:** Text Amber 700 (`#b45309`), Bg Amber 100 (`#fef3c7`)
    *   **Info/Sent:** Text Blue 700 (`#1d4ed8`), Bg Blue 100 (`#dbeafe`)

## 3. Typography
*   **Font Family:** `Inter`, system-ui, sans-serif
*   **Scale:**
    *   `text-xs` (12px) - Badges, small labels.
    *   `text-sm` (14px) - Table data, standard inputs, secondary text.
    *   `text-base` (16px) - Primary body copy, standard buttons.
    *   `text-lg` (18px) - Subheadings.
    *   `text-xl` (20px) to `text-2xl` (24px) - Card titles, page headers.
    *   `text-4xl` (36px) to `text-5xl` (48px) - Marketing headlines, dashboard metrics.

## 4. Spacing & Layout
*   **Grid System:** Based on a 4px/8px baseline grid.
*   **App Layout:** Fixed 256px dark sidebar on desktop. The main content area has a maximum width (1024px to 1200px) centered within the remaining space to ensure tables and forms don't stretch uncomfortably on ultra-wide monitors.
*   **Marketing Layout:** Full-width sections with generous vertical padding (`py-24` or 96px). Content is constrained to a `max-w-7xl` (1280px) container.

## 5. Components & UI Patterns
*   **Buttons:**
    *   *Primary:* Solid Indigo 600, white text, 8px border radius, subtle hover lift (`-translate-y-px`) and shadow.
    *   *Secondary:* White background, Slate 200 border, Slate 700 text.
    *   *Ghost:* Transparent, Slate 600 text, Slate 100 background on hover.
*   **Inputs & Forms:**
    *   White background, 1px Slate 200 border, 8px radius.
    *   Focus state features a 2px Indigo 500 ring with an offset to ensure accessibility.
*   **Cards & Surfaces:**
    *   White background, 12px border radius, 1px Slate 200 border, and a very subtle shadow (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1)`).
*   **Tables:**
    *   Edge-to-edge inside cards. Slate 50 background for the header row. Left-aligned text, right-aligned monetary values. Subtle `border-bottom` on rows.
*   **Status Badges:**
    *   Pill-shaped (`rounded-full`), `text-xs`, bold font weight.

## 6. Interaction States
*   **Hover:** Interactive elements should respond immediately. Buttons darken or lift. Table rows receive a subtle Slate 50 hover background.
*   **Empty States:** Centered illustrations or icons with muted text and a clear primary CTA.
*   **Loading:** Skeleton loaders matching the shape of the incoming data, rather than generic spinners.
