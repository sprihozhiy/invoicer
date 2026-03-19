# Design Brief: Invoicer Redesign

This document provides the visual design specification for the Invoicer redesign, intended for frontend developers and QA reviewers. It is derived from the established design system and prototypes.

## 1. CSS Custom Properties (Tokens)

```css
:root {
  /* Color Tokens */
  --color-background: #0F1115; /* Graphite Canvas */
  --color-surface: #171B22; /* Carbon Surface */
  --color-surface-elevated: #202632; /* Slate Lift */
  
  --color-primary: #178DEE; /* Cobalt Action */
  --color-primary-hover: #3BA2F5; /* Cobalt Hover */
  
  --color-text-primary: #F3F6FA; /* Ice Text */
  --color-text-secondary: #98A2B3; /* Mist Text */
  --color-text-ink: #1E2430; /* Paper Ink */
  
  --color-border: #2C3442; /* Ledger Line */
  --color-document: #F7F4EE; /* Paper Tint */
  
  /* Semantic Tokens */
  --color-success: #1FB36A; /* Success Emerald */
  --color-warning: #E7A63B; /* Warning Amber */
  --color-danger: #E45858; /* Danger Red */

  /* Typography */
  --font-family-base: 'Inter', sans-serif;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  
  /* Spacing & Layout */
  --spacing-container-max: 1280px;
  --spacing-nav-width: 240px;
  --spacing-outer-padding: 32px;
  --spacing-inner-padding: 24px;
  
  /* Radii */
  --radius-card: 18px;
  --radius-input: 12px;
  --radius-pill: 9999px;
  
  /* Transitions */
  --transition-base: 200ms ease-out;
}
```

## 2. Component State Specifications

- **Hover:** Buttons and interactive cards should transition smoothly (200ms ease-out) to a slightly lighter state. Primary buttons shift to `--color-primary-hover`. Rows in tables should display a subtle background highlight.
- **Active:** Primary actions retain the `--color-primary` state with a slight visual depression or zero offset if shadows are used.
- **Focus:** All interactive elements must support `focus-visible` with a 2px solid `--color-primary` outline and a 2px outline-offset.
- **Disabled:** Opacity reduced to 50%, pointer-events disabled, no hover effects.
- **Loading:** Use a subtle pulse animation on containers or a standard spinner inside buttons; no layout shifting.
- **Error:** Inputs and relevant containers outline in `--color-danger` with concise, inline error text below the input.
- **Empty States:** Display a clear, low-contrast message using `--color-text-secondary` and an optional call-to-action button; avoid playful illustrations in favor of operational clarity.

## 3. WCAG AA Compliance Notes

- **Contrast Ratios:** Ensure text on `--color-background` and `--color-surface` meets the 4.5:1 ratio for standard text and 3:1 for large text. The `--color-primary` (#178DEE) on `--color-background` (#0F1115) meets accessibility guidelines for non-text contrast and large text. Ensure text on the document preview (`--color-document`) uses `--color-text-ink` for maximum legibility.
- **Touch Targets:** Minimum 44px height and width for all interactive elements (buttons, links, inputs) on mobile devices.
- **Reduced Motion:** Observe `prefers-reduced-motion: reduce` by disabling non-essential transitions and animations.

## 4. Responsive Breakpoint Behavior

- **Desktop (1280px+):** Full 12-column grid. Left navigation rail (240px) is persistent and permanently visible.
- **Tablet (768px - 1279px):** Content areas adjust to 2-column grids where appropriate. Typography and spacing scale proportionally. Navigation rail may become collapsible.
- **Mobile (<768px):** Single-column layout. Navigation becomes a hamburger menu or vertical stack. Touch targets scale to a minimum of 44px. Reduced outer and section padding (e.g., 16px to 24px).

## 5. Prototype Files

The following HTML prototypes have been generated to demonstrate the design system in context:

1. **`landing-prototype.html`**: Public marketing landing page prototype. Demonstrates the acquisition funnel, product proof, and value proposition.
2. **`dashboard-prototype.html`**: Authenticated dashboard workspace prototype. Shows the financial overview, outstanding invoices, and recent activity.
3. **`invoice-builder-prototype.html`**: Invoice creation workflow prototype. Showcases the document builder interface, line-item editor, and catalog integration.
4. **`invoice-detail-prototype.html`**: Single-invoice detail and payment tracking prototype. Displays the client-facing invoice view alongside payment history and lifecycle actions.