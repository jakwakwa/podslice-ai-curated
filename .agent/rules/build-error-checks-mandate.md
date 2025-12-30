---
trigger: model_decision
description: When asked by the user to fix build errors
---

Run Proactive Check: Execute npx tsc --noEmit --pretty and bun run lint to generate the full error manifest. THEN Execute npx tsc --noEmit --pretty and bun run lint to generate the full error manifest.
Batch Fixes: Apply fixes for all identified errors in one pass 