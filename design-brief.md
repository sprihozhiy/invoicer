# Design System Brief: Invoicer

## 1. Product Positioning & Goal
Invoicer is positioned as a premium, intuitive billing solution for freelancers and small businesses. Our research indicates that users value the design polish and ease-of-use of tools like FreshBooks, but desire the generous feature access of tools like Zoho. 

**Design Ethos**: "Polished Professionalism." The UI must be exceptionally clean, building trust through precision, clear typography, and subtle, tactile interactions. It should feel like a modern, high-end consumer app rather than legacy enterprise software.

## 2. Shared Design Tokens
These tokens are shared across both the Marketing Site (`landing-prototype.html`) and the App UI (`app-prototype.html`) to ensure a coherent product family.

### 2.1 Color Palette
*   **Brand Primary**: A trustworthy indigo/blue.
    *   `--primary-50`: `#eef2ff`
    *   `--primary-100`: `#e0e7ff`
    *   `--primary-500`: `#6366f1` (Primary Actions)
    *   `--primary-600`: `#4f46e5` (Hover States)
    *   `--primary-900`: `#312e81`
*   **Surface & Background**:
    *   `--bg-app`: `#f8fafc` (Slate 50 - slightly cool gray for depth)
    *   `--surface`: `#ffffff` (Pure white for content cards)
    *   `--border`: `#e2e8f0` (Slate 200 - crisp, visible but not distracting)
*   **Text**:
    *   `--text-primary`: `#0f172a` (Slate 900 - high contrast readability)
    *   `--text-secondary`: `#64748b` (Slate 500 - supporting text)
    *   `--text-tertiary`: `#94a3b8` (Slate 400 - placeholders)
*   **Semantic**:
    *   **Success** (Paid): `--success-bg`: `#ecfdf5`, `--success-text`: `#059669`
    *   **Warning** (Draft/Pending): `--warning-bg`: `#fffbeb`, `--warning-text`: `#d97706`
    *   **Danger** (Overdue/Void): `--danger-bg`: `#fef2f2`, `--danger-text`: `#dc2626`

### 2.2 Typography
*   **Font Family**: `Inter`, `-apple-system`, `sans-serif`. (System fonts used in prototypes for zero dependencies).
*   **Scale**:
    *   `text-xs` (12px): Badges, table headers.
    *   `text-sm` (14px): UI controls, secondary body.
    *   `text-base` (16px): Standard body text.
    *   `text-lg` (18px): Section headers.
    *   `text-2xl` (24px): Page titles.
    *   `text-4xl` (36px): Hero headlines.
*   **Weights**: 400 (Regular), 500 (Medium for UI labels), 600 (Semibold for headings).

### 2.3 Spacing & Layout
*   **Base Grid**: 4px / 8px scale.
*   **Radii**: 
    *   Inputs/Buttons: `8px` (`--radius-md`)
    *   Cards/Modals: `12px` (`--radius-lg`)
*   **Elevation (Shadows)**:
    *   Card Default: `0 1px 3px rgba(0,0,0,0.05)`
    *   Dropdown/Hover: `0 4px 6px -1px rgba(0,0,0,0.1)`
    *   Modal: `0 10px 15px -3px rgba(0,0,0,0.1)`

## 3. Component Guidelines
*   **Buttons**: Solid primary for the main action on a page. White background with border for secondary actions. Always 8px border radius.
*   **Forms**: Inputs must have visible borders that transition to a primary color ring on focus. Labels are `text-sm` and medium weight.
*   **Tables**: Clean, flush edges within a card container. Light gray background for headers, uppercase tracking for header text. Subtle hover states on rows.
*   **Status Badges**: Pill-shaped (`border-radius: 99px`), utilizing the semantic color pairs (light background, dark text) for immediate visual scanning.
*   **Empty States**: Should include a soft illustration (or icon) and a clear CTA to create the first item.

## 4. Responsive Strategy
*   **Mobile (< 768px)**: Sidebar collapses into a hamburger menu. Data tables switch to stacked card views (conceptual in HTML). Modals become full-screen.
*   **Desktop (≥ 768px)**: Persistent 250px left sidebar. Main content area centers forms with a maximum width (e.g., 800px) to maintain readability. Tables expand to fill available space.