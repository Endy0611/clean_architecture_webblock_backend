---
name: change-puck-block
description: Change a WebBlock Puck block (Hero, Text, Product Cards, About, Location, Footer) or a design setting, keeping editor config, AI component definitions and generator renderers in sync. Use for any Puck block or editor-setting change.
argument-hint: "[BlockName]"
---
# Change Puck block: $ARGUMENTS

Allowed blocks: Hero, Text, Product Cards, About, Location, Footer. A new block = product decision → ask first.

Change these **together**:
1. `packages/puck-blocks/<block>/config.tsx` — Puck fields + defaultProps (only allowed settings: columns 2–4, alignment, spacing, palette, font, button style).
2. `packages/puck-blocks/<block>/schema.json` — JSON Schema of editable props → seeds `ai_codegen_puck_component_definitions` (`editable_props_schema`, `allowed_operations`). Bump `component_catalog_version`.
3. `templates/site-template/.../blocks/<block>` — renderer used by the generator; must look the same as the editor preview.
4. Migration/seed for the new catalog version in ai-generator-service.

Check:
- Old saved `puck_tree`s still load (add a migration function if props were renamed).
- CTA text uses "Contact us" wording.
- Product Cards get products from the Catalog API, not from props.
- Tests: config renders, schema validates sample props, generator output snapshot matches.
