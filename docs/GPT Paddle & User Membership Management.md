## Executive Summary

- Paddle powers paid membership: client-side `@paddle/paddle-js` handles checkout, server routes persist subscriptions, and Paddle webhooks keep the local database in sync with real billing events, ensuring accurate status tracking and notifications.
- Membership tiers (Free Slice, Casual Listener, Curate Control) unlock AI-generated episode quotas, curated bundle access, and download rights. Tier metadata lives in `config/paddle-config.ts`, letting UI, validation, and business logic share a single source of truth.
- Users authenticate with Clerk; server handlers enforce plan gates before creating content or serving premium assets. Prisma models capture subscriptions, usage, and curated bundle entitlements, giving downstream features consistent access control.

## Core Structure

- **Client checkout & state** – `PricingPlans` initializes Paddle JS with the client token, opens checkouts, and forwards completed payloads to `/api/account/subscription` for persistence; `useSubscriptionInit` keeps a shared Zustand store updated so layouts and feature components react to membership changes immediately.
- **Server subscription lifecycle** – REST endpoints under `/api/account/subscription` upsert local `subscription` rows, schedule cancellations, open purchaser portal sessions, and synchronize with Paddle when users reconnect or return from the hosted billing portal.
- **Webhook pipeline** – `/api/paddle-webhook` verifies signatures and delegates to `ProcessWebhook`, which updates subscriptions, attaches Paddle customer IDs, raises notifications, and cleans up generated assets on cancellation, ensuring parity with Paddle events beyond client-driven flows.
- **Plan gating** – Shared helpers map stored plan strings to allowed gates; routes that expose premium data (curated bundles, downloads, AI episode generation) reuse these helpers to keep authorization consistent across features.
- **Usage limits & supporting config** – Episode creation APIs call shared quota logic, referencing tier metadata (episode limits, summary weightings). Client validation fetches environment-tuned processing limits via `/api/config/processing`.

## Business Logic

- **Onboarding & checkout** – Protected layout syncs Clerk users into Prisma, bootstraps subscription state, and routes unauthenticated users to Clerk-hosted auth pages. Manage Membership page shows current plan data, loads localized prices, and triggers Paddle checkout or portal access depending on status.
- **Subscription persistence** – When Paddle signals a `checkout.completed`, clients call `POST /api/account/subscription`. The handler upserts the user, looks up Paddle subscriptions for billing dates, enforces one active plan, and records plan type/period metadata for consistent gating elsewhere.
- **Portal & modifications** – Users retrieve Paddle portal sessions via `/portal`, use Paddle UI to upgrade/downgrade, and the client polls `/sync-paddle` plus `/api/account/subscription` until plan changes land locally. Cancel and swap endpoints schedule changes against Paddle’s API and mirror flags such as `cancel_at_period_end` for UI feedback.
- **Webhook reconciliation** – `ProcessWebhook` listens for subscription/customer/transaction events: it updates plan status, issues notifications (activation, payment failure, scheduled cancellation), and deletes generated audio when access ends. This guarantees that involuntary churn or Paddle-side updates are reflected without user action.
- **Plan-gated experiences** –
  - Curated bundle browsing (`app/(protected)/curated-bundles`, `app/api/curated-bundles`) filters content by bundle `min_plan`, allowing admins to publish tiered collections.
  - AI episode creation routes compute weighted usage against `episodeLimit` from the Curate Control tier and block overages with actionable messaging; layout gating redirects Non-Free Slice users toward upgrade flows.
  - Downloads and auto-generated episode toggles require Curate Control; authorization checks ensure only owners with matching plans can access premium assets.

## Key Architectural Patterns

- **Shared configuration & helpers** – Tier definitions (`PlanTier[]`) and plan utilities back both UI copy and server validation, reducing drift between marketing pages and enforcement logic.
- **Thin API route wrappers** – Each route isolates authentication (Clerk) and instrumentation, then delegates to Prisma or Paddle helpers. Variations (cancel, sync, swap) mirror Paddle REST semantics, simplifying maintenance and testing.
- **Webhook-first resiliency** – Webhooks, not client callbacks, are authoritative. `ProcessWebhook` handles idempotent upserts and deduplicated notifications, allowing checkout or portal polling to be best-effort enhancements.
- **Client state normalization** – Zustand stores wrap normalized subscription data (`PaddleSubscription`), exposing computed fields for UI logic and decoupling presentation components from raw API responses.
- **Plan gating through layout & middleware** – `GenerateMyEpisodesLayout` performs server-side plan validation; `middleware.ts` ensures protected routes require Clerk auth; the protected layout adds another client guard plus data sync so route handlers can trust `userId` and plan context.

## Tech Stack Analysis

- **Framework & runtime** – Next.js 15 (App Router, Server Components) with Bun for scripts, Prisma for PostgreSQL, Clerk for auth, and Inngest for background pipelines.
- **Payments** – `@paddle/paddle-js` for checkout, `@paddle/paddle-node-sdk` for webhook verification/API calls, featuring sandbox/production auto-detection and API version negotiation.
- **State & UI** – Zustand stores handle plan data, notifications, and episode usage; Shadcn UI + Tailwind (4.1) provide components themed via `app/globals.css`. Global providers attach SWR caching and theme configuration for client components.
- **Validation & tooling** – Zod guards API routes against malformed payloads; `utils/paddle/plan-utils.ts` and `lib/types/summary-length.ts` define reusable validation rules and messaging. Build scripts rely on `bunx prisma generate` before Next build to align Prisma client versions.
- **Notifications & observability** – Paddle events trigger Prisma-backed `notification` records for in-app toasts; additional logging around sync endpoints aids troubleshooting. In-memory counters track premium service usage (currently for observability).

## Key Files and Components

- **`config/paddle-config.ts`** – Centralized tier definitions with price IDs, features, and episode limits consumed by pricing UI, quota enforcement, and plan mapping utilities.
- **`utils/paddle/plan-utils.ts`** – Maps Paddle price IDs to stored plan strings, resolves hierarchical access, and offers helpers like `hasCurateControlAccess` used across server routes and UI checks.
- **`app/api/account/subscription/*`** – Complete subscription CRUD:
  - `route.ts` handles checkout upsert + GET with active-preferred logic.
  - `cancel`, `swap`, `portal`, `sync`, `sync-paddle` orchestrate Paddle API calls and local persistence.
  - Schema transformations cover Paddle payload variations to keep handlers resilient.
- **`utils/paddle/process-webhook.ts`** – Core webhook executor: validates payloads with Zod, upserts subscriptions, emits notifications, and revokes assets on cancellation; consolidates Paddle event handling in one class for easier auditing.
- **`components/manage-plan`** – Client-only management experience: fetches/syncs subscriptions, launches Paddle checkout, polls for portal updates, and renders plan status cards plus pricing tiles with localized price preview (`usePaddlePrices`).
- **`hooks/useSubscriptionInit.ts`** – Normalizes server responses into typed client state, ensuring date serialization and status fallbacks so UI logic can rely on consistent enums.
- **`app/(protected)/generate-my-episodes/layout.tsx`** – Server-side gate for AI generation features, redirecting inactive or under-tier users to Manage Membership before rendering downstream pages.
- **`app/api/user-episodes/*`** – Creation and listing routes enforce quotas, track weighted usage, and trigger Inngest workflows; integrate with plan limits via `SUMMARY_LENGTH_OPTIONS` and Paddle tier metadata.
- **`app/api/episodes/[id]/download/route.ts`** – Demonstrates gate checks (plan + ownership) before returning signed audio URLs; admin override ensures support team access without modifying plan state.
- **`app/(protected)/dashboard/page.tsx`** – Server component fetching subscription info to toggle Curate Control-only widgets and to display latest curated bundle content; leverages shared plan logic for UI decisions.
- **`app/globals.css` & `components.json`** – Tailwind + Shadcn configuration establishing visual language (dark-themed gradients, custom utilities) that pricing and membership pages rely on for consistent styling.

---

### Next Steps Suggestions

- Verify webhook secrets and Paddle environment variables in deployment environments; failures short-circuit the entire webhook pipeline.
- Consider centralizing plan label/description rendering (currently duplicated in pricing and status cards) to avoid mismatch when tiers change.
- Expand automated tests around `/api/account/subscription` to cover checkout variations and ensure ongoing compatibility with Paddle payload evolution.
