# Design Brief: Invoicer SaaS

## 1. Vision & Strategy

**Product:** A modern, beautiful, and intuitive invoicing application for freelancers and small businesses.

**Design Goals:**
- **Clarity and Ease of Use:** The UI should be self-explanatory, minimizing the learning curve. Users should be able to create and send their first invoice in seconds.
- **Professionalism:** The design should empower users to present a polished, professional image to their clients.
- **Cohesion:** The marketing site and the application itself should feel like a single, unified product family.

## 2. Visual Language

### 2.1. Color System

Colors are defined using CSS variables to align with the project's Tailwind CSS v4 setup.

| Role | Light Mode | Dark Mode | CSS Variable |
|---|---|---|---|
| **Primary Accent** | `#4F46E5` | `#818CF8` | `var(--accent-primary)` |
| **Background** | `#F9FAFB` | `#111827` | `var(--background)` |
| **Surface** | `#FFFFFF` | `#1F2937` | `var(--surface)` |
| **Text (Primary)**| `#1F2937` | `#F9FAFB` | `var(--text-primary)` |
| **Text (Secondary)**| `#6B7280` | `#9CA3AF` | `var(--text-secondary)` |
| **Borders** | `#E5E7EB` | `#374151` | `var(--border)` |
| **Success** | `#10B981` | `#34D399` | `var(--status-success)` |
| **Warning** | `#F59E0B` | `#FBBF24` | `var(--status-warning)` |
| **Error** | `#EF4444` | `#F87171` | `var(--status-error)` |
| **Info** | `#3B82F6` | `#60A5FA` | `var(--status-info)` |


### 2.2. Typography

A clean, sans-serif scale for optimal readability.

| Usage | Font Size | Line Height | Font Weight |
|---|---|---|---|
| Display | 3rem (48px) | 1.1 | 700 (Bold) |
| Heading 1 | 2.25rem (36px)| 1.2 | 700 (Bold) |
| Heading 2 | 1.875rem (30px)| 1.25| 700 (Bold) |
| Heading 3 | 1.5rem (24px) | 1.3 | 600 (SemiBold) |
| Heading 4 | 1.25rem (20px)| 1.4 | 600 (SemiBold) |
| Body (Large) | 1.125rem (18px)| 1.6 | 400 (Regular) |
| Body (Base) | 1rem (16px) | 1.5 | 400 (Regular) |
| Small | 0.875rem (14px)| 1.4 | 400 (Regular) |
| Caption | 0.75rem (12px) | 1.3 | 500 (Medium) |

### 2.3. Spacing & Sizing

A 4px-based grid system for consistent padding, margins, and component sizing.

- **xs:** 4px
- **sm:** 8px
- **md:** 12px
- **lg:** 16px
- **xl:** 24px
- **2xl:** 32px
- **3xl:** 48px
- **4xl:** 64px

### 2.4. Border Radius

- **sm:** 4px
- **md:** 8px
- **lg:** 16px
- **full:** 9999px (for pills and circles)

## 3. Component Library

A base set of reusable components.

### 3.1. Buttons

| Variant | State | Background | Text | Border |
|---|---|---|---|---|
| **Primary** | Default | `var(--accent-primary)` | `white` | `none` |
| | Hover | `darker(--accent-primary)`| `white` | `none` |
| **Secondary**| Default | `var(--surface)` | `var(--text-primary)` | `var(--border)` |
| | Hover | `var(--background)` | `var(--text-primary)` | `var(--border)` |
| **Destructive**| Default | `var(--status-error)` | `white` | `none` |
| | Hover | `darker(--status-error)` | `white` | `none` |

### 3.2. Form Fields

- **Input:** `var(--surface)` background, `var(--border)` border. On focus, border changes to `var(--accent-primary)`.
- **Label:** `var(--text-secondary)`, `small` font size.
- **Error State:** Border becomes `var(--status-error)`, with a small error message below the input.

### 3.3. Status Badges

- **Paid/Success:** `var(--status-success)` background (light tint), `var(--status-success)` text.
- **Pending/Warning:** `var(--status-warning)` background (light tint), `var(--status-warning)` text.
- **Draft/Info:** `var(--status-info)` background (light tint), `var(--status-info)` text.
- **Void/Error:** `var(--status-error)` background (light tint), `var(--status-error)` text.

## 4. Layout & Responsiveness

- **Breakpoints:**
    - **Mobile:** < 768px
    - **Tablet:** 768px - 1024px
    - **Desktop:** > 1024px
- **Containers:** Max width of `1280px` on desktop, with appropriate padding for smaller screens.
- **App Layout:** A primary sidebar for navigation on desktop, which collapses into a hamburger menu on mobile.
- **Marketing Layout:** Standard centered hero with multi-column feature sections.

## 5. Interaction States

- **Hover:** Buttons and links should show a clear visual change (e.g., background color change, underline).
- **Focus:** All interactive elements must have a visible focus state (e.g., a ring around the element) for accessibility.
- **Loading:** Use subtle skeleton loaders for content areas and spinners for buttons/actions.
- **Empty:** Empty states should be friendly and provide a clear call-to-action (e.g., "Create your first invoice").
