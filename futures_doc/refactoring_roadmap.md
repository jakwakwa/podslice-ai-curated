# Refactoring Roadmap

This document outlines the plan for future improvements to the codebase, focusing on architecture, type safety, security, and cleanup.

## 1. Architecture: Logic Extraction

**Goal**: Move business logic and data fetching out of `page.tsx` and `route.ts` files into dedicated service layers.

**Current Status**: Started with `lib/services/dashboard-service.ts` for the dashboard page.

**Planned Actions**:
- **Identify Heavy Pages**: Scan `app/(protected)` for pages with significant logic (e.g., `my-episodes`, `curated-bundles`).
- **Create Services**: For each identified domain, create a service file in `lib/services/` (e.g., `episode-service.ts`, `bundle-service.ts`).
- **Migration**: Move fetching, transformation, and complex processing logic to these services.
- **Benefit**: Improves testability, reusability, and separation of concerns.

## 2. Type Safety: Centralization

**Goal**: Eliminate `any` and `as unknown as` casts by defining and using robust shared types.

**Current Status**: `lib/types.ts` exists but some types are redefined locally or loosely typed in components.

**Planned Actions**:
- **Audit Types**: Review `lib/types.ts` and remove duplicate or conflicting type definitions.
- **Standardize API Responses**: Define return types for all API routes and service functions.
- **Strict Mode**: gradually enable stricter TypeScript checks if possible, or at least forbid `any` in new code.
- **Shared Types**: Ensure complex types like `BundleWithPodcasts` are defined once and used everywhere (Backend & Frontend).

## 3. Security: Input Validation

**Goal**: Systematically validate all user inputs at the API boundary using Zod.

**Current Status**: Implemented for `app/api/user-episodes/route.ts`.

**Planned Actions**:
- **Audit API Routes**: List all `POST`, `PUT`, `PATCH` routes.
- **Create Schemas**: Define Zod schemas for all request bodies and query parameters.
- **Implement Validation**: Apply validation logic to all API routes, returning consistent 400 errors for violations.
- **Sanitization**: Ensure inputs are sanitized where necessary (though Prisma handles SQL injection, XSS is still a concern for rendered content).

## 4. Cleanup: Codebase Hygiene

**Goal**: Remove dead code, unused imports, and deprecated patterns.

**Planned Actions**:
- **Unused Exports**: Use tools to find and remove unused exports.
- **Deprecated Files**: Identify files marked as deprecated or legacy and schedule them for removal or refactoring.
- **Comments**: Update or remove outdated "TODO" or "FIXME" comments that have been resolved or are no longer relevant.
- **Consolidate Utils**: specific utility functions scattered across the codebase should be grouped logically in `lib/utils`.

