# Design Brief: Invoicer Modern Dashboard

This document summarizes the design system for the Invoicer project, intended for use by frontend developers and QA reviewers.

## 1. Core Visual Identity
The system uses a **Professional & Modern Financial** aesthetic. It relies on a high-contrast interaction between deep navy accents and soft, off-white backgrounds to create a sense of trust and precision.

## 2. Color Tokens
- **Primary (Deep Slate-Navy):** `#0f1729`. Used for branding, primary CTAs, and active navigation states.
- **Background (Soft Cloud):** `#f6f7f8`. The primary app background.
- **Surface (White):** `#ffffff`. Used for cards and sidebar.
- **Muted Text (Steel Slate):** `#64748b`. Used for secondary labels and headers.
- **Success (Emerald):** `#059669`. Used for 'Paid' statuses and positive growth.
- **Warning (Amber):** `#d97706`. Used for 'Outstanding' status.
- **Danger (Rose):** `#e11d48`. Used for 'Overdue' status and critical alerts.

## 3. Typography Scale
- **Font:** Inter (Sans-serif)
- **Headings:** Bold (700), tight tracking. 
    - Dashboard Title: 30px
    - Section Headers: 18px
- **Body:** Standard (14px) and Small (12px).
- **Navigation:** Medium (500), 14px.

## 4. Component Patterns
- **Cards:** 12px (`rounded-xl`) corner radius, 1px border (`#e2e8f0`), and a very light shadow.
- **Buttons:** 8px (`rounded-lg`) corner radius, 10px vertical padding (`py-2.5`).
- **Status Badges:** Pill-shaped (`rounded-full`), using light background tints of the status color with darker text.
- **Inputs:** Default Tailwind forms style with soft borders and primary-colored focus rings.

## 5. Spacing & Layout
- **Container:** Main content is centered with a max-width of 1200px.
- **Padding:** Base padding unit is 24px (`p-6`), scaling up to 40px (`p-10`) on large screens.
- **Sidebar:** Fixed width of 256px (`w-64`) on desktop.
- **Grid:** 3-column layout for metric cards, single column for the main data table.
