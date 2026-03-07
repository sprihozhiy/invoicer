# Invoicer — Design System & Brief

This document outlines the design system for the Invoicer SaaS application. It provides the foundational aesthetic and component guidelines for both the public-facing marketing website and the authenticated web application, ensuring a cohesive, premium, and intuitive user experience.

The design philosophy is centered around a **premium dark aesthetic**. The UI should feel modern, focused, and professional, helping freelancers and small businesses present a sophisticated brand image while managing their finances with clarity.

---

## 1. Color Palette

The color system is designed for a dark UI, ensuring legibility and a clear visual hierarchy. Colors are specified in `functional-spec.md` (AC-11-2, AC-11-3, AC-11-4).

### 1.1. Core Palette

| Role | Hex | Usage |
|------|:---:|-------|
| Primary Background | `#0F0F0F` | Main page background. |
| Surface | `#1A1A1A` | Cards, sidebars, main content panels. |
| Elevated Surface | `#242424` | Modals, dropdowns, form inputs, popovers. |
| Border | `#2E2E2E` | Separators, component outlines, table rows. |

### 1.2. Text Palette

| Role | Hex | Usage |
|------|:---:|-------|
| Primary Text | `#F5F5F5` | Headings, primary data, active navigation links. |
| Secondary Text | `#A0A0A0` | Sub-headings, secondary data, body copy, labels. |
| Muted Text | `#6B6B6B` | Placeholders, disabled text, footer links. |

*All text and background combinations must maintain a minimum WCAG AA contrast ratio of 4.5:1.*

### 1.3. Accent Palette

The accent color is used for primary actions, interactive elements, and focus states to guide the user.

| Role | Hex | Usage |
|------|:---:|-------|
| Accent | `#6366F1` | Primary buttons, links, active tabs, focus rings. |
| Accent Hover | `#818CF8` | Hover state for accent-colored elements. |
| Accent Pressed | `#4F46E5` | Clicked/active state for accent-colored elements. |

### 1.4. Semantic & Status Palette

These colors provide immediate feedback for states like success, error, or warning. They are primarily used for status badges and feedback messages.

| Status | Text Color | Background Color | Usage |
|--------|:----------:|:----------------:|-------|
| **Draft** | `#A0A0A0` | `#1C1C1C` | Invoice is a draft. |
| **Sent** | `#6366F1` | `#1E1B4B` | Invoice has been sent. |
| **Partial** | `#F59E0B` | `#431407` | Invoice is partially paid. |
| **Paid** | `#22C55E` | `#052E16` | Invoice is fully paid. |
| **Overdue**| `#EF4444` | `#450A0A` | Invoice is past its due date. |
| **Void** | `#6B6B6B` | `#171717` | Invoice is voided and inactive. |
| | | | |
| **Success**| `#22C55E` | `#052E16` | Success toasts, validation success. |
| **Error** | `#EF4444` | `#450A0A` | Error toasts, validation errors, delete buttons. |
| **Warning**| `#F59E0B` | `#431407` | Confirmation modals, warnings. |

---

## 2. Typography

We use a single, modern, sans-serif font family to maintain a clean and consistent look. **Inter** is chosen for its excellent readability on screens.

- **Font Family:** `Inter`, with a fallback to `sans-serif`.

### 2.1. Font Scale & Styles

| Element | Font Size | Font Weight | Letter Spacing | Usage |
|---------|:---------:|:-----------:|:--------------:|-------|
| Display | `48px` / `3rem` | `700` (Bold) | `-0.025em` | Marketing hero titles. |
| Heading 1 | `36px` / `2.25rem` | `700` (Bold) | `-0.025em` | Main page titles (`<h1>`). |
| Heading 2 | `24px` / `1.5rem` | `700` (Bold) | `-0.025em` | Section titles (`<h2>`). |
| Heading 3 | `20px` / `1.25rem`| `600` (SemiBold) | `normal` | Card titles, modal titles (`<h3>`). |
| Body (Lg) | `18px` / `1.125rem`| `400` (Regular)| `normal` | Marketing body copy. |
| Body (Md) | `16px` / `1rem` | `400` (Regular)| `normal` | Default body text, form inputs, paragraphs. |
| Body (Sm) | `14px` / `0.875rem`| `400` (Regular)| `normal` | Secondary text, table data, labels. |
| Caption | `12px` / `0.75rem` | `500` (Medium) | `0.025em` | Status badges, metadata, microcopy. |

---

## 3. Spacing & Layout

A consistent 8-point grid system is used for spacing and layout. All margins, paddings, and positional values should be multiples of 8px (e.g., `8px`, `16px`, `24px`, `32px`).

### 3.1. Spacing Scale

- `xx-small`: `4px` (for micro-adjustments)
- `x-small`: `8px`
- `small`: `16px`
- `medium`: `24px`
- `large`: `32px`
- `x-large`: `48px`
- `xx-large`: `64px`

### 3.2. Breakpoints & Grid

- **Mobile:** `375px` - Single-column layout.
- **Tablet:** `768px` - Content reflows into 2-3 columns where appropriate.
- **Desktop:** `1440px` - Full multi-column layouts, utilizing horizontal space.

A standard 12-column grid is used within main content areas, with a max-width of `1280px` to ensure comfortable line lengths on large monitors. Gutters are `24px`.

---

## 4. Component Patterns

Components are the building blocks of the UI. They must be consistent, accessible, and reusable.

### 4.1. Buttons

- **Primary:** Solid accent color background. For the main CTA of a view (e.g., "Save", "Send Invoice").
- **Secondary:** Transparent background with a solid border. For secondary actions (e.g., "Cancel", "Add Item").
- **Destructive:** Transparent background with a red border and red text. For actions that delete data (e.g., "Delete", "Void").
- **Ghost/Link:** No border or background. For tertiary actions (e.g., "Edit" inline).
- **Icon Button:** A square, borderless button containing only an icon. Used for actions in tight spaces like table rows or page headers (e.g., "More Actions" `⋮`).
- **States:** All buttons must have distinct `hover`, `focus`, and `disabled` states. Focus state is a `2px` solid accent color ring with a `2px` transparent offset.

### 4.2. Form Inputs & Controls

- **Text Inputs & Textareas:** Use the `Elevated Surface` background, `Border` color for the outline, and `Muted Text` for placeholders. On focus, the border color changes to `Accent`.
- **Selects / Dropdowns:** Styled similarly to text inputs, with a chevron icon on the right.
- **Toggles / Switches:** A pill-shaped control that slides a knob to indicate on/off state. The "on" state uses the `Accent` color.
- **Autocomplete:** A text input that reveals a dropdown list of suggestions (`Elevated Surface`) as the user types.
- **Labels:** Placed above their corresponding input, using `Secondary Text` color and `Body (Sm)` style. Required fields are denoted by a red asterisk or "(required)" text.

### 4.3. Modals

- A floating `Elevated Surface` panel centered on screen.
- An overlay with a dark, semi-transparent background (`#000000` at `50%` opacity) covers the page content behind it.
- Contains a title, content area, and action buttons (e.g., "Save", "Cancel") in the footer.
- Can be dismissed by clicking the "Cancel" button or pressing the `Escape` key.

### 4.4. Tables

- **Header:** Uses `Secondary Text` color, `Body (Sm)` style, and `600` (SemiBold) weight.
- **Rows:** Separated by a `1px` `Border` color line.
- **Row Hover:** Row background changes to `Elevated Surface` on hover to indicate interactivity.
- **Data:** `Primary` or `Secondary` text depending on importance. Monetary values are right-aligned.

### 4.5. Status Badges

- A small, pill-shaped (`border-radius: 9999px`) element.
- Uses `Caption` typography.
- Color pairs are defined in the **Semantic & Status Palette**.

---

## 5. Animation & Motion

Motion is used sparingly to enhance the user experience, provide feedback, and add a touch of polish without being distracting.

- **Duration:** Default transition duration is `200ms`.
- **Easing:** Use `ease-in-out` for most transitions to create a smooth, natural feel.
- **Micro-interactions:** Interactive elements like buttons and inputs have subtle transitions on `hover` and `focus` states.
- **Page Transitions:** Fade-in transitions for new page loads in the app to create a seamless flow.
- **Marketing Page Animations:**
  - **Hero Animation:** The main hero graphic or text will have a subtle, continuous animation (e.g., slow drift, gradient shift) to draw attention.
  - **Scroll Reveal:** Elements in the marketing page (feature sections, testimonials) will fade in and slide up as they enter the viewport during scrolling.
- **Modal & Dropdown Animations:** Modals and dropdown menus will scale and fade in from their trigger point.

This brief serves as the single source of truth for the Invoicer visual language. All development should adhere to these guidelines to build a world-class product.
