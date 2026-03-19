# Design System: invoicer
**Project ID:** 13522279910898874620

## 1. Visual Theme & Atmosphere
The overall mood is composed, premium, and operational. It blends a dark software-as-a-service aesthetic with warm document-like elements. It aims to evoke calm financial control and professional credibility, avoiding generic tech blobs or overwhelming dashboard clutter.

## 2. Color Palette & Roles
- Graphite Canvas (#0F1115) — Background for the workspace.
- Carbon Surface (#171B22) — Primary panels and containers.
- Slate Lift (#202632) — Elevated cards, inputs, and selected states.
- Cobalt Action (#178DEE) — Primary action buttons and active states.
- Cobalt Hover (#3BA2F5) — Interactive hover states.
- Ice Text (#F3F6FA) — Headings and primary numerical values.
- Mist Text (#98A2B3) — Secondary text and descriptions.
- Ledger Line (#2C3442) — Borders and subtle dividers.
- Paper Tint (#F7F4EE) — Invoice document surfaces and previews.
- Paper Ink (#1E2430) — Text specifically placed on document surfaces.
- Success Emerald (#1FB36A) — Paid status and positive confirmations.
- Warning Amber (#E7A63B) — Partial states and prominent warnings.
- Danger Red (#E45858) — Overdue statuses and destructive actions.

## 3. Typography Rules
- Family: Inter.
- Styling: Semibold for headings and compact titles; medium weight for UI labels.
- Numbers: Tabular numerals mandatory for money and dates to ensure crisp column alignment.
- Contrast: Restrained uppercase applied to table headers.

## 4. Component Stylings
- Shapes: 18px border radius for primary cards and panels; 12px border radius for inputs. Pill shapes for status badges.
- Borders: Crisp 1px solid borders using Ledger Line (#2C3442).
- Shadows: Minimal use of shadows, favoring border layering.
- Motion: 160-220ms ease-out transitions. Only subtle fades and rise reveals; strictly no bounce or parallax effects.

## 5. Layout Principles
- Desktop Grid: 12-column foundation.
- Max Width: 1280px primary content container.
- Authenticated App: 240px persistent left navigation rail.
- Spacing: 32px outer padding on views; 24px inner padding within cards. Clear vertical separation between summary metrics and data tables.

## 6. Design System Notes for Stitch Generation
DESIGN SYSTEM (REQUIRED):
- Platform: Web, Desktop-first
- Theme: Dark
- Background: Graphite Canvas (#0F1115)
- Surface: Carbon Surface (#171B22) for cards and elevated containers
- Primary Accent: Cobalt Action (#178DEE) for primary actions and active states
- Text Primary: Ice Text (#F3F6FA)
- Text Secondary: Mist Text (#98A2B3) for supporting content
- Font: Inter
- Buttons: Rounded 12px radius, strong primary visual weight
- Cards: 18px rounded corners with 1px border lines
- Layout: 1280px max-width, 32px outer padding, generous spacing