# Design System: invoicer
**Project ID:** 17168312793327566039

## 1. Visual Theme & Atmosphere
The 'invoicer' system exudes a professional, trustworthy, and modern financial atmosphere. It utilizes a high-contrast 'Deep Night' primary color against clean, light backgrounds to establish a sense of authority and clarity. The design is characterized by generous whitespace, soft shadows, and subtle border definitions, creating a layered and organized interface that simplifies complex financial data.

## 2. Color Palette & Roles
- **Deep Slate-Navy (#0f1729):** The **Primary** color, used for branding, primary buttons, and core navigation elements. It provides a strong visual anchor.
- **Pure White (#ffffff):** Used for **Surface** elements like cards and the side navigation, ensuring maximum readability and a clean look.
- **Soft Cloud Gray (#f6f7f8):** The main **App Background**, providing a low-strain canvas for data-heavy views.
- **Steel Slate (#64748b):** The **Muted Text** role, used for descriptions, table headers, and secondary information.
- **Emerald Green (#059669):** The **Success/Paid** indicator, used for positive trends and completed transactions.
- **Amber Gold (#d97706):** The **Warning/Outstanding** role, highlighting pending actions without immediate urgency.
- **Rose Red (#e11d48):** The **Danger/Overdue** role, used to flag critical issues or missed deadlines.

## 3. Typography Rules
- **Font Family:** **Inter**, a highly legible sans-serif font optimized for UI clarity.
- **Headings:** Bold weights (700) with tight tracking (-0.025em) for a modern, impactful look.
- **Body Text:** Medium weight (500) for UI elements and Regular (400) for long-form content.
- **Sizes:** 
  - Desktop Headings: 30px (2xl)
  - Section Titles: 18px (lg)
  - Standard Body: 14px (sm)
  - Small/Captions: 12px (xs)

## 4. Component Stylings
- **Buttons:** Primary buttons use the Deep Slate-Navy background with white text, `rounded-lg` (8px) corners, and a `py-2.5` padding for a substantial, tactile feel.
- **Cards:** Data containers feature `rounded-xl` (12px) corners, a subtle `border-slate-200`, and a `shadow-sm` for a floating, elevated appearance.
- **Status Badges:** Pill-shaped (`rounded-full`) with light background fills and high-contrast text for immediate category recognition.
- **Navigation:** Side navigation uses high-contrast active states (Primary/10 fill) and subtle hover transitions to guide user focus.

## 5. Layout Principles
- **Grid Strategy:** A responsive 12-column grid system, adapting to a 3-column layout on medium screens and single-column on mobile.
- **Whitespace:** Generous padding (`p-6` to `p-10`) is used to separate sections and reduce cognitive load.
- **Content Width:** Main application content is constrained to a `max-w-[1200px]` to maintain readability on ultra-wide displays.
- **Depth:** Subtle borders and soft shadows create a clear hierarchical distinction between the background, surfaces, and interactive elements.

## 6. Design System Notes for Stitch Generation
```markdown
DESIGN SYSTEM REQUIRED:
- Platform: Web (Desktop/Mobile)
- Theme: Modern Financial / Professional
- Color Palette: 
    - Primary: Deep Slate-Navy (#0f1729)
    - Background: Soft Cloud Gray (#f6f7f8)
    - Surface: Pure White (#ffffff)
    - Muted: Steel Slate (#64748b)
    - Success: Emerald Green (#059669)
    - Warning: Amber Gold (#d97706)
    - Danger: Rose Red (#e11d48)
- Font: Inter (Sans-serif)
- Roundness: ROUND_TWELVE (12px for cards, 8px for buttons)
- Shadow Style: Soft/Subtle Elevation
```
