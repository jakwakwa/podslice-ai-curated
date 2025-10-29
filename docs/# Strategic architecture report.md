# Strategic architecture report

## Executive Summary

**PODSLICE** is an **AI-driven podcast summarization** and curation platform. It converts long-form podcast and video content (notably YouTube) into concise, weekly personalized audio episodes and curated bundles. The application targets two main user values:

- **Personalized**, time-efficient consumption: Users receive weekly episodes tailored to their interests, saving time while retaining insight.
- **Curated** **discovery** and control: Users can either subscribe to pre-curated “Bundles” of shows or build a personalized feed, and power users can generate on-demand episodes from arbitrary sources.

Commercially, the platform monetizes via subscription plans (Paddle), where plan gates unlock access to advanced features (e.g., curated bundles access levels, user-generated episodes, advanced profile features). The system couples a Next.js App Router frontend with Inngest background jobs, Prisma/PostgreSQL, Google Cloud Storage for audio assets, and Clerk for authentication, forming a scalable, modern, server-first architecture.

## Application Domain & Business Logic

### Purpose and Real-World Problem

Long-form audio/video content is valuable yet time-consuming. PODSLICE provides AI-generated condensations, enabling users to keep up with knowledge without consuming full episodes. It also offers curated bundles to match user interests and a pipeline for generating bespoke episodes from links (e.g., YouTube), bridging curation and personalization.

### Key Business Entities (from `prisma/schema.prisma`)

- **User**: The application’s primary actor. Has preferences (email/in-app notifications), image, subscription linkage (`paddle_customer_id`), and relationships to content and notifications.
- **Subscription**: Links a user to plan status (active, trialing, canceled), period dates, and plan type (normalized string mapped from Paddle price IDs). Drives plan-gated features.
- **Bundle**: A curated collection of podcasts with `min_plan` (a `PlanGate` enum). Bundles can be static or user-owned (for admin creation workflows). Junction with podcasts via `BundlePodcast`.
- **Podcast**: A show in the catalog. Owner may be null (global) or a specific user (for admin-created content), with episodes.
- **Episode**: Curated episode entity (catalog) linked to a podcast and optionally to a bundle or user profile. Represents content available for playback in the catalog view.
- **UserCurationProfile**: The active profile per user defining either a bundle selection or a set of podcasts for personalization. Links to episodes, selected bundle, and podcasts via `ProfilePodcast`.
- **UserEpisode**: User-generated episode from a YouTube URL (or other sources) with lifecycle status (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`). Stores GCS audio URL and transcript/summary.
- **Notification**: In-app notifications for events like episode readiness.
- **EpisodeFeedback**: Optional user feedback on episodes (thumbs up/down/neutral).

### Core User Journeys

1. **New user signs up and receives personalized content**
    - User signs up via Clerk (SignIn/SignUp routes) → visits protected area.
    - `app/(protected)/layout.tsx` checks auth and POSTs `/api/sync-user` to ensure a local `user` row exists.
    - User creates a `UserCurationProfile` by selecting a curated `Bundle` or custom podcasts via `/api/user-curation-profiles`. Plan gates (from `subscription.plan_type`) are enforced; higher plans unlock more bundles/features.
    - The dashboard fetches episodes with `/api/episodes`: it returns content from the user’s profile or podcasts in the selected bundle. Episodes are played using a global audio player portal.
2. **Power user generates their own episode**
    - In `generate-my-episodes`, the `EpisodeCreator` accepts a YouTube URL and optional parameters (voices, short/long). It fetches transcripts via `/api/youtube-transcribe` (custom pipeline) or fallback `/api/transcripts/get` orchestrator.
    - `/api/user-episodes/create` validates limits (plan-appropriate) and enqueues an Inngest job (`user.episode.generate.requested` or `.multi.requested`).
    - Inngest function (`lib/inngest/user-episode-generator*.ts`) performs: transcript normalization → AI generation (`ai` + Google GenAI) → TTS → upload to GCS → update `userEpisode` status.
    - The client polls `/api/user-episodes/[id]/status` (via `useEpisodeProgress`) to show progress and, on completion, plays the signed audio URL from `/api/user-episodes/list`.
3. **Admin curates catalog content**
    - Admin generates or uploads episodes into the catalog: `/api/admin/generate-bundle-episode` enqueues content generation for bundle+podcast; `/api/admin/upload-episode` uploads audio and creates an `episode` with proper relationships.
    - Admin-only enforcement leverages a shared `requireAdminMiddleware` (expected at `@/lib/admin-middleware`) or `lib/admin.ts` checks.
4. **Subscription purchase and plan-gated access**
    - Users purchase via Paddle checkout (client not shown here). The app receives checkout completion at `/api/account/subscription` with a body including `price_id`, `customer.id`, and `transaction_id` (validated by Zod, enriched via Paddle API), and upserts `subscription` for the user.
    - Webhooks at `/api/paddle-webhook` process authoritative updates (created/updated events) and normalize plan type via `utils/paddle/plan-utils.ts` (mapping `priceId` → `plan_type`). On cancellation, it schedules cleanup (delete GCS files and user episodes) for data hygiene.
    - API routes that require plan gates (e.g., curated bundles, profile creation/updates) compute allowed gates for the user, enforcing access.

## Core Application Architecture

### Architectural Style

- **Next.js App Router (15.x), server-first**: Thin pages and server components fetch data server-side to reduce client complexity and improve performance/security. API routes handle mutations and side effects.
- **Event-driven background jobs (Inngest)**: Decouples long-running tasks (AI generation, TTS, storage) from request/response cycles, improving reliability and UX.
- **Prisma + PostgreSQL**: Typed ORM with strong schema constraints and indexes for content and subscription data.
- **Clerk Authentication**: Managed authentication with minimal boilerplate and SSR support.
- **GCS for audio**: Cost-effective, scalable binary storage with signed URL delivery.
- **Paddle for billing**: Modern subscription billing with robust webhooks and customer portal sessions.

This combination optimizes for fast time-to-market, maintainability, and a clear separation of concerns (web UI, API handlers, job orchestration, storage, billing).

### Data Flow (textual diagram)

1. Auth & User Sync
    - Browser → Clerk SignIn → receives session → visits `(protected)` → `useAuth()`
    - `(protected)/layout.tsx` → POST `/api/sync-user` → Prisma `user.upsert` (id/email/image) → ok
2. Catalog Episodes Fetch
    - Browser (Dashboard/Episodes page) → GET `/api/episodes`
    - Server: Clerk `auth()` → Prisma read:
        - `userCurationProfile` (selected bundle) → derive allowed podcast IDs
        - `episode.findMany` with OR of: userProfile match, podcasts in selected bundle, or selected bundle id
    - Response → Client `EpisodeList` renders; `AudioPlayer` plays direct `episode.audio_url`
3. User Episode Generation
    - Browser (EpisodeCreator):
        - GET `/api/youtube-transcribe` (or `/api/transcripts/get`) → transcript
        - POST `/api/user-episodes/create` → Prisma `userEpisode.create(PENDING)` → Inngest event
    - Inngest job:
        - Fetch transcript (or re-derive) → LLM summarize (`ai` + Google GenAI) → TTS → upload to GCS
        - Update `userEpisode` to `COMPLETED` with `gcs_audio_url`; send notification/email
    - Browser polls `/api/user-episodes/[id]/status` → on `COMPLETED`, fetch `/api/user-episodes/list` (signed URLs) → play
4. Billing
    - Browser completes Paddle checkout
    - App: POST `/api/account/subscription` with payload → Zod validate → enrich via Paddle API → `subscription.upsert`
    - Paddle → Webhook `/api/paddle-webhook` → authoritative update → normalize plan type → cleanup on cancel
    - Plan gates enforced in `/api/curated-bundles`, `/api/user-curation-profiles*`

## Key Systems and Logic Breakdown

### User & Auth System

Integration points:
* Sign-in/sign-up UIs (`app/sign-in/*`, `app/sign-up/*`) embed Clerk components.
* Protected layout (`app/(protected)/layout.tsx`) checks `useAuth`, redirects unauthenticated users, and synchronizes the user via `/api/sync-user` (using `currentUser()` for details). A global portal enables a persistent audio player across pages.
* Middleware: The project states middleware exists (hidden). The layout’s checks act as a UX layer; middleware remains the enforcement layer.

Roles/Admin:
* Admin checks rely on a missing-but-referenced `@/lib/admin-middleware` (must return a `NextResponse` on denial) and `lib/admin.ts` which checks `ADMIN_USER_ID` equality. Admin APIs gate every operation with this middleware first (e.g., `admin/check`, `admin/upload-episode`).

Pros/Cons:
* Pros: Clerk simplifies auth, SSR-ready; user sync guarantees a local DB presence for downstream relations; double-checked gating (middleware + layout) improves UX.
* Cons: Admin middleware’s missing source risks drift; layout-based checks can be bypassed if middleware misconfigured; `ADMIN_USER_ID` is a blunt role mechanism—consider role claims via Clerk or DB roles.

### Content Pipeline (Generation & Curation)

Inputs:
* Curated catalog episodes: Admin can upload or AI-generate episodes into `episode` tied to podcasts/bundles.
* User-generated episodes: User provides YouTube URL; the pipeline extracts transcripts through:
* `/api/youtube-transcribe` (custom transcriber) with heuristics for anti-bot/size errors.
* `/api/transcripts/get` orchestrator that chains providers (`PodcastRssProvider`, `ListenNotesProvider` if enabled, `RevAiProvider`, `PaidAsrProvider`) depending on URL kind and `allowPaid`.

AI stack and synthesis:
* `lib/inngest/gemini-tts.ts` uses `ai` SDK with Google GenAI (`createGoogleGenerativeAI` and `@google/genai`). Config in `config/ai.ts` selects `gemini-2.5-flash` and preview TTS model. Inngest functions orchestrate text generation, TTS, and audio handling.

Storage and delivery:
* Audio assets are uploaded to Google Cloud Storage (safe lazy init; supports JSON or path credentials). Playback to clients is via signed URLs for user episodes (`/api/user-episodes/list`). Catalog episodes often store public `audio_url` suitable for direct playback.

Persistence and retrieval:
* Prisma models provide a normalized schema with indices for common access paths (`episode_podcast_week_idx`, etc.). Catalog episodes are filtered by the current user’s active profile/bundle selection.

Performance/Resilience considerations:
* Inngest removes long-run work from request cycle; API routes set `maxDuration` where needed.
* `lib/utils.ts` offers timeouts to prevent function overruns.
* YouTube transcribe endpoints detect anti-bot blocks and surface user-facing errors.

### Billing & Subscription System

Plan definition and mapping:
* `config/paddle-config.ts` defines `PRICING_TIER` with `PlanGate` IDs and price IDs. `utils/paddle/plan-utils.ts` maps Paddle `price_id` to a normalized DB `plan_type` string, which routes use to compute allowed gates.

Acquisition flow:
* On checkout completion, client POSTs to `/api/account/subscription` with a Paddle payload. Zod validates shape; the server enriches via Paddle API (`lib/paddle-server/paddle.ts`), identifies a preferred subscription (active/trialing), extracts period dates, and upserts `subscription`. It is idempotent on `paddle_subscription_id` (falls back to `transaction_id` if needed) and prevents multiple active-like subs per user.

Webhook flow:
* `/api/paddle-webhook` unmarshals signature and dispatches to `utils/paddle/process-webhook.ts` which updates local subscription fields, sets plan type (via price ID mapping), and on cancellation deletes GCS files and user episodes to reflect access loss and manage storage costs.

Robustness & Scalability:
* Having both client POST and webhook allows timely UI updates and authoritative reconciliation. Upsert design and normalization guard against drift. Cleanup on cancellation keeps storage costs predictable.
* Future-proofing includes expanding webhook handlers and making all plan gate checks rely solely on normalized `plan_type`/`PlanGate` mapping.

## Tech Stack & Dependencies

- **Next.js 15 (App Router)**: Server-first rendering, co-located route handlers, and Suspense-ready server components reduce client complexity and improve SSR.
- **React 19**: Modern concurrent features; compatible with Next’s server/client component split.
- **Prisma 6.14 + Accelerate**: Type-safe DB with performance enhancements; schema-driven development.
- **PostgreSQL**: Relational data with strong consistency fits the domain (subscriptions, relationships among users/bundles/podcasts/episodes).
- **Clerk**: Managed authentication—fast integration, SSR compatibility, secure session handling.
- **Inngest 3.x**: Event-driven job orchestration; fits long-running AI and audio tasks.
- **Google GenAI +** **`ai`** **SDK**: Text generation and TTS; chosen for multi-modal capabilities and robust SDKs.
- **Google Cloud Storage**: Durable, scalable storage for audio; signed URLs for secure delivery.
- **Paddle Node SDK + REST**: Modern billing platform; comprehensive webhook model and customer portal.
- **Zod**: Runtime validation; crucial at API boundaries for safety.
- **Zustand**: Lightweight client state for dashboards; avoids global Redux overhead.
- **shadcn/ui + Radix UI + Tailwind 4**: Rapid, consistent UI with design tokens and accessible primitives.
- **Resend**: Email sending with minimal setup; supports templated transactional mail.
- **ffmpeg-static + fluent-ffmpeg**: Audio handling during generation pipelines.

Each choice aligns with speed-to-market and low operational overhead, while leaving room to scale horizontally (stateless APIs, externalized jobs/storage).

## Insights & Strategic Recommendations

### Architectural/Technical Debt

- **Admin middleware source missing**: Multiple APIs import `@/lib/admin-middleware` that is not present. Action: add a single-source admin gate module returning `NextResponse | undefined` and use it consistently.
- **Plan string normalization**: Some routes perform ad-hoc plan string normalization. Action: centralize into a utility (plan parse → `PlanGate[]`) to avoid drift.
- **Inconsistent import paths**: Some APIs import Prisma via relative paths (e.g., `../../../lib/prisma`) instead of `@/lib/prisma`. Action: standardize on path aliases to reduce brittle imports.
- **Duplicate/unused hooks**: `hooks/use-mobile.ts` and `use-mobile.tsx` duplicates; `useUserInfo.ts` is empty. Action: consolidate/remove.
- **Client-POST subscription trust boundary**: `/api/account/subscription` accepts client payload. While webhook reconciles, ensure server confirms transaction validity (e.g., verify transaction ID with Paddle API every time) to harden against spoofing.
- **Inngest function size/complexity**: `gemini-tts.ts` is large. Action: factor into smaller domain services (transcript, LLM, TTS, storage, DB) to improve testability and observability.
- **Observability**: Minimal structured logging/metrics. Action: add request/job correlation IDs, metrics (duration, failure rates), and structured logs.

### Opportunities & Future Features

- **Deeper personalization**: Learning-to-rank recommendations based on feedback (`EpisodeFeedback`) and listening behavior.
- **Multi-language support**: Extend transcript and TTS pipeline to multilingual sources and outputs.
- **Edge/CDN for audio**: Serve audio via CDN-backed signed URLs for better latency at scale.
- **RBAC**: Move from single `ADMIN_USER_ID` to role claims and DB-backed roles; integrate with Clerk organizations if needed for team/admin.
- **Self-serve admin tools**: Safer content management with audit logs and preview flows.

### Performance, Security, Maintainability

- **Performance**:
    - Cache public curated endpoints with `revalidate` where safe; keep user-scoped endpoints dynamic.
    - Add job-level idempotency keys in Inngest; retry policies per step.
    - Ensure critical DB indices match dominant filters (confirmed for `episode`/`bundle`).
- **Security**:
    - Ensure all signed URLs are short-lived; avoid exposing GCS bucket names in user-facing contexts beyond necessary.
    - Redact secrets from logs (already done in GCS utils) and confirm in Inngest logs.
    - Harden admin routes (complete the middleware, add rate-limits).
- **Maintainability**:
    - Create a domain service layer (server-side): `episodesService`, `profilesService`, `billingService`. Concentrate business rules (plan gating, membership checks, selection constraints) in one place.
    - Provide typed client SDK for API routes used by Client Components to reduce duplicate fetch/error handling logic.
    - Expand test coverage: integration tests for subscription lifecycle, episode generation end-to-end (using mocked providers), and admin actions.

This architecture is well-aligned with the product’s goals: server-first SSR, background jobs for AI pipelines, and strong separation of concerns. Addressing the noted gaps (admin middleware, normalization, observability, and modularization) will improve scalability, reliability, and developer velocity.

[Core Application Structure](https://www.notion.so/Core-Application-Structure-2850d2f44a7381c48a19cfa2c37979e0?pvs=21)

[Strategic Codebase Analysis](https://www.notion.so/Strategic-Codebase-Analysis-2850d2f44a7381d790d4dbed01054d97?pvs=21)

[Strategic architecture report](https://www.notion.so/Strategic-architecture-report-2850d2f44a7381f8b784d33d81fcae86?pvs=21)
