---
paths:
  - "packages/puck-blocks/**"
  - "apps/web/**/editor/**"
  - "templates/site-template/**/blocks/**"
---
# Puck editor & blocks

- Only 6 blocks: **Hero, Text, Product Cards, About, Location, Footer**. Adding a block is a product decision — ask first.
- `packages/puck-blocks` is the single source: the editor config, the AI assistant's `puck_component_definitions` (editable props JSON Schema + allowed operations) and the generator's block renderers must stay in sync. Change all three together.
- Allowed settings only: Product Card columns 2–4; alignment left/center/right; spacing tight/normal/roomy; site palette accent/background/text; font Editorial/Clean/Rounded; buttons square/rounded/pill.
- Product Cards read products from the Catalog API; they never hold product data inside the Puck JSON.
- The saved tree is `pages.puck_tree` (jsonb). Saving sends the current `edit_revision`; a conflict shows a reload prompt, never a silent overwrite.
- Editor UX from the workflow: Save Draft is disabled when nothing changed; leaving with unsaved changes shows "Save changes?"; Deploy with no changes shows "No changes to deploy"; Undo is disabled when there's nothing to undo.
- Buttons on generated sites say "Contact us" — never buy/order wording.
