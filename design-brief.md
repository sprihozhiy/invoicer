# Invoicer — Design Brief

## 1. Aesthetic & Philosophy

-   **Goal:** To create a visual identity that feels premium, trustworthy, and modern, positioning Invoicer as a high-end tool that is nonetheless accessible. The design should immediately convey professionalism and ease of use, targeting freelancers and small business owners who value their brand image.
-   **Core Principles:**
    -   **Dark & Focused:** A dark-themed UI minimizes visual noise and places the user's content—their invoices and business data—at the forefront. It reduces eye strain and communicates a sleek, professional aesthetic.
    -   **Clarity over Clutter:** Every element is chosen for its purpose. We avoid decorative-only elements, ensuring a clean, data-first presentation. Generous whitespace and a structured layout guide the user's eye.
    -   **Tactile & Responsive:** The interface uses subtle animations, gradients, and shadows to create a sense of depth and interactivity. Elements feel tangible and respond to user input, making the experience engaging and intuitive.

## 2. Color Palette

The palette is built on a foundation of deep, muted grays, accented by a vibrant indigo to draw attention to primary actions. This creates a high-contrast, legible, and visually striking experience.

| Role | Hex | SCSS Variable | Description |
| :--- | :--- | :--- | :--- |
| **Primary Background** | `#0B0B0F` | `$color-bg-primary` | The darkest base color, used for the main page background. |
| **Surface** | `#1A1A1A` | `$color-surface` | For card backgrounds and distinct sections. |
| **Elevated / Interactive**| `#242424` | `$color-elevated` | For inputs, modals, and elements that float above the surface. |
| **Borders** | `#2E2E2E` | `$color-border` | Subtle borders for separating elements and defining component edges. |
| **Accent Primary** | `#6366F1` | `$color-accent-primary`| The main interactive color for CTAs, links, and focus states. |
| **Accent Hover** | `#818CF8` | `$color-accent-hover` | A lighter shade for hover states on interactive elements. |
| **Text Primary** | `#F5F5F5` | `$color-text-primary` | For headings and primary body text. High contrast. |
| **Text Secondary** | `#A0A0A0` | `$color-text-secondary`| For subheadings, labels, and less important text. |
| **Text Muted** | `#6B6B6B` | `$color-text-muted` | For placeholder text and disabled states. |
| **Success** | `#22C55E` | `$color-success` | Used for "Paid" status and positive feedback. |
| **Warning** | `#F59E0B` | `$color-warning` | Used for "Partial" status. |
| **Error** | `#EF4444` | `$color-error` | Used for "Overdue" status and destructive action hovers. |
| **Gradient Start** | `rgba(99, 102, 241, 0.2)` | `$color-gradient-start` | Start of decorative background gradients. |
| **Gradient End** | `rgba(11, 11, 15, 0)` | `$color-gradient-end` | End of decorative background gradients (fades to black). |


## 3. Typography

The typography is chosen for its clarity, modern feel, and excellent readability on dark backgrounds across a range of screen sizes.

-   **Primary Font:** **Lexend** (from Google Fonts)
    -   **Why Lexend?** It's a clean, geometric sans-serif designed for high readability. Its variable font weights allow for fine-tuned control over the typographic hierarchy.
-   **Weights Used:**
    -   `300` (Light): For subtle labels or secondary text.
    -   `400` (Regular): For body copy and paragraphs.
    -   `500` (Medium): For subheadings and bolded text within paragraphs.
    -   `600` (Semi-Bold): For primary headings and CTAs.

### Typographic Scale (Mobile / Desktop)

-   **h1 (Hero Title):** 48px / 64px, Weight 600
-   **h2 (Section Title):** 32px / 40px, Weight 600
-   **h3 (Card/Feature Title):** 20px / 24px, Weight 500
-   **Body Large (Hero Subtitle):** 18px / 20px, Weight 400, Color `$color-text-secondary`
-   **Body Regular:** 16px / 16px, Weight 400
-   **Button/CTA Text:** 16px / 16px, Weight 500
-   **Label/Small Text:** 14px / 14px, Weight 300, Color `$color-text-secondary`

## 4. Layout & Spacing

A consistent spacing and grid system creates rhythm and visual harmony, making the layout feel intentional and easy to scan.

-   **Grid:** A 12-column grid is used for the main content areas. The maximum content width is `1200px`.
-   **Spacing Unit:** The base unit is `8px`. All padding, margins, and gaps are multiples of this unit.
    -   `8px` (x1): Small gaps between inline elements.
    -   `16px` (x2): Padding within small components (e.g., buttons).
    -   `24px` (x3): Gaps between related items (e.g., icon and text).
    -   `32px` (x4): Padding within cards and larger components.
    -   `64px` (x8): Gaps between feature cards in a grid.
    -   `96px` (x12): Major vertical spacing between page sections.
-   **Breakpoints:**
    -   **Mobile:** `< 768px` (single-column layout, fluid)
    -   **Tablet:** `≥ 768px` (2 or 4-column grids appear)
    -   **Desktop:** `≥ 1440px` (full 12-column grid, max-width content)

## 5. Component Library

This is a list of the key components designed for the landing page prototype.

-   **Button (Primary CTA):**
    -   Background: `$color-accent-primary`
    -   Text: `$color-text-primary` (white)
    -   Hover: Background `$color-accent-hover`
    -   Border Radius: `8px`
    -   Padding: `12px 24px`
    -   Special: Includes a subtle background glow and a `translateY(-2px)` on hover.
-   **Button (Secondary):**
    -   Background: `transparent`
    -   Text: `$color-text-primary`
    -   Border: `1px solid $color-border`
    -   Hover: Background `$color-elevated`
    -   Border Radius: `8px`
    -   Padding: `12px 24px`
-   **Feature Card:**
    -   Background: `$color-surface`
    -   Border: `1px solid $color-border`
    -   Border Radius: `16px`
    -   Padding: `32px`
    -   Structure: Icon, `h3` title, `p` description.
    -   Interaction: Subtle background glow and border color change on hover.
-   **Animated Hero Invoice:**
    -   A simplified, stylized representation of an invoice UI.
    -   Uses nested `div`s with borders, backgrounds, and flexbox for layout.
    -   Elements animate into place using staggered CSS `transform` and `opacity` transitions.
-   **Scroll-Reveal Elements:**
    -   Standard sections and cards that fade and slide in from below on scroll.
    -   Uses Intersection Observer API in JS to add a `.is-visible` class.
    -   CSS handles the `transform: translateY(20px)` and `opacity: 0` transition to the visible state.
-   **Navigation Bar:**
    -   Sticky to the top.
    -   Background: `$color-bg-primary` with a semi-transparent blur effect (`backdrop-filter: blur(10px)`).
    -   Border: `1px solid $color-border` on the bottom.
    -   Contains logo, nav links, and CTA buttons.

## 6. Animation & Motion

Animation is used to guide the user, provide feedback, and create a sense of premium craftsmanship.

-   **Hero Animation:**
    -   **Goal:** To immediately capture attention and visually communicate the product's purpose.
    -   **Execution:** A stylized invoice UI animates into view on page load.
        1.  Main card fades and scales in.
        2.  Header elements slide down.
        3.  Line item rows fade and slide in from the bottom, one by one, with a slight delay.
        4.  The "Total" section lights up at the end.
    -   **Technology:** Pure CSS using `@keyframes` and `animation-delay`.
-   **Scroll-Reveal:**
    -   **Goal:** To make the experience of scrolling down the page more dynamic and engaging.
    -   **Execution:** As the user scrolls, sections and feature cards animate into view. The effect is a gentle fade-in and slide-up.
    -   **Technology:** JavaScript's `IntersectionObserver` API to detect when an element enters the viewport, adding a CSS class that triggers a `transform`/`opacity` transition.
-   **Micro-interactions:**
    -   **Buttons/Links:** Smooth `transform` and `background-color` transitions on hover.
    -   **Feature Cards:** A subtle lift (`translateY`) and border/glow highlight on hover to indicate interactivity.
    -   **Focus States:** A prominent, non-subtle focus ring (`2px solid $color-accent-primary`) on all interactive elements for accessibility.

This design brief establishes a clear and consistent system to be implemented in the `design-prototype.html` file, ensuring all elements work together cohesively to meet the project's goals.