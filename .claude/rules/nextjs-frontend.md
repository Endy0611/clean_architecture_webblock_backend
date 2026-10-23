---
paths:
  - "apps/web/**"
---
# Next.js web app (landing, auth, dashboard, editor, Business Portal, Admin Portal)

- App Router + TypeScript strict. Server Components by default; `"use client"` only for interaction.
- Route groups keep areas apart: `(marketing)`, `(auth)`, `(dashboard)`, `editor/[projectId]`, `portal/[websiteId]` (owner), `admin/**` (admin). Admin code never imports from portal code and vice versa.
- Auth via Keycloak (OIDC). Guard routes by role in middleware; never trust a client-side role check alone.
- Forms: react-hook-form + zod. Same rules as the backend (required fields from the Business Info dialog: name, type, description; phone, email, address, opening hours).
- Data fetching through the typed API client in `lib/api`. No raw `fetch` to services from components.
- Show loading, empty, error states for every list (empty My Websites → guide to Template Selection).
- Long jobs (generation/deploy) show progress and tell the user they can leave and will be notified.
- `npm run lint && npm run typecheck` must pass before "done".
