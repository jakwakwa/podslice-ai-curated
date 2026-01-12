---
trigger: always_on
---

description: Single source of truth for Prisma field names and relations used across the app.
alwaysApply: true
---

## Schema source of truth

- **Use exact field names from `prisma/schema.prisma`** in Prisma Client queries and mutations.
- **Field casing**: Prisma model fields are snake_case and use `@map` to snake_case DB columns. Relations use camelCase where defined (e.g., `ownerUser`, `bundle`, `podcast`, `userProfile`, `selectedBundle`, `user`).
- **Do not invent types or fields**. Import types from `@/lib/types` or use Prisma Client types.
- **When unsure, open `prisma/schema.prisma`**: [schema.prisma](mdc:prisma/schema.prisma)
- **Do not regenerate or modify the schema** without verifying field names and existing API usage.

### Examples

- Correct field names in queries:
```ts
// Good: snake_case fields, camelCase relations where they exist
await prisma.episode.findMany({
  where: { podcast_id: somePodcastId, profile_id: null },
  orderBy: { published_at: "desc" },
  include: { podcast: true, bundle: true, userProfile: true },
});
```

- Relation includes:
```ts
await prisma.bundle.findMany({
  where: { is_active: true, is_static: true },
  include: { ownerUser: true, bundle_podcast: true, episodes: true },
});
```

### Emergency Fix Protocol
1. Revert any change that introduces casing mismatches immediately.
2. Verify names directly in [schema.prisma](mdc:prisma/schema.prisma).
3. Cross-check working API routes under `app/api/**`.
4. Never regenerate Prisma Client or change schema without verifying names.

This document is the single source of truth for Prisma field names and relation casing.