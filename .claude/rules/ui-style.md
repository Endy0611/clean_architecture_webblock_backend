---
paths:
  - "apps/web/**/*.tsx"
  - "apps/web/**/*.css"
  - "apps/mobile/**"
---
# UI style (WebBlock design system)

- Clean and calm: white background, one blue accent. Page titles `#4379D6`. Neutral borders `#E5E7EB`.
- Fonts: headings Familjen Grotesk, body DM Sans.
- Status badge: pill shape, light tinted background, no border, normal case, medium weight, with an icon per status.
- Toasts: white card, coloured left bar, coloured title (Success / Warning / Error), message, close ✕, slide in from the right. Use only when needed. Delete = red.
- Tables: "No." first column (admin); footer "Showing … / pagination" pinned to the bottom of the card even with few rows.
- Main content 15px from the sidebar and 15px from the right edge. Sidebars show no count badges.
- Product photos are 4:3.
- Reuse existing components before making new ones. No gradients/AI-looking decoration on admin/monitoring pages ("quiet ops console").
- Accessible: labels on inputs, focus rings, contrast AA.
