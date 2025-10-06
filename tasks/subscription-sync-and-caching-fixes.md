### Phase 1: Root Cause Analysis & Security Fixes

- Paddle authentication_malformed investigation
  1. Verify environment and runtime:
     - Ensure the sync code runs in a Node runtime, not Edge (Edge proxies can mutate headers).
       - In all Paddle API routes/server actions, add:
         ```ts
         export const runtime = "nodejs";
         ```
     2. Audit env vars (build and runtime):
        - `PADDLE_API_KEY` (correct environment: live vs sandbox).
        - No trailing spaces/newlines. Locally: `echo -n "$PADDLE_API_KEY" | hexdump -C` to spot whitespace.
        - CI/hosting: confirm secret is set in the correct project/environment.
     3. Normalize all Paddle requests via a single client:
        - Centralize headers to prevent inconsistent formatting and proxy-induced mutations.
        - Always send `Authorization: Bearer <PADDLE_API_KEY>`.
        - Optionally send `Paddle-Version` pinned to your tested version to avoid schema drift.
        - Capture and log `x-request-id` from responses for support/debugging.
        ```ts
        // lib/paddle.ts
        import { headers as nextHeaders } from "next/headers";

        const PADDLE_BASE_URL = process.env.PADDLE_BASE_URL ?? "https://api.paddle.com";
        const PADDLE_API_KEY = process.env.PADDLE_API_KEY ?? "";

        if (!PADDLE_API_KEY) {
          throw new Error("PADDLE_API_KEY is not configured");
        }

        type PaddleFetchInit = Omit<RequestInit, "headers"> & { headers?: Record<string, string> };

        export async function paddleFetch(path: string, init: PaddleFetchInit = {}) {
          const h = {
            Authorization: `Bearer ${PADDLE_API_KEY}`,
            "Content-Type": "application/json",
            // Keep version pinned to what you tested against (set your known-good date here)
            // "Paddle-Version": "2024-08-27",
            ...init.headers,
          };

          const res = await fetch(`${PADDLE_BASE_URL}${path}`, {
            ...init,
            headers: h,
            cache: "no-store",
            // Force node runtime semantics and avoid any subtle edge behavior
            next: { revalidate: 0 },
          });

          // Surface Paddle request id for debugging
          const requestId = res.headers.get("x-request-id") ?? "unknown";
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            // Never log secrets
            console.error("Paddle API error", {
              status: res.status,
              requestId,
              path,
              body: text.slice(0, 2000),
            });
            throw new Error(`Paddle API ${res.status} (req ${requestId})`);
          }
          return res;
        }
        ```
     4. Check for infrastructure/proxy interference:
        - Confirm no CDN/edge function in front of server-to-Paddle calls.
        - If using a fetch interceptor/middleware, ensure it never rewrites `Authorization`.
     5. Add targeted retry logic:
        - Retry only on 429/5xx with exponential backoff; never retry 401/403.

- CSP violation fix for Clerk telemetry
  - Add the Clerk telemetry origin to `connect-src`. Use the origin, not the URL path.
  - If you manage CSP via Next headers, update:
    ```ts
    // next.config.mjs
    /** @type {import('next').NextConfig} */
    const nextConfig = {
      async headers() {
        return [
          {
            source: "/(.*)",
            headers: [
              {
                key: "Content-Security-Policy",
                value: [
                  // Keep your existing directives; only the connect-src line shown here
                  // Example (merge with your current policy carefully):
                  "default-src 'self';",
                  "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
                  "style-src 'self' 'unsafe-inline';",
                  "img-src 'self' data: blob:;",
                  "font-src 'self' data:;",
                  "frame-src 'self';",
                  "connect-src 'self' https://clerk-telemetry.com;",
                ].join(" "),
              },
            ],
          },
        ];
      },
    };

    export default nextConfig;
    ```
  - If you maintain CSP in middleware or a custom header utility, add `https://clerk-telemetry.com` to `connect-src` there instead.

### Phase 2: Data Flow and Synchronization Deep Dive

- End-to-end subscription sync flow
  1. Webhook reception (Paddle → Next.js):
     - Route: `app/api/paddle/webhook/route.ts` (Node runtime, no cache).
     - Verify authenticity using Paddle’s signature (`paddle-signature`) and your `PADDLE_WEBHOOK_SECRET`.
     - Enforce idempotency (store `event_id` to avoid double-processing).
  2. Normalize payload → internal shape:
     - Extract `subscription_id`, `status`, `canceled_at`, `next_billed_at` (for `cancel_at_period_end`), `user_id` linkage from your DB mapping.
  3. Persist with Prisma in a transaction:
     - Update `subscription.status`, `subscription.canceled_at`, `subscription.cancel_at_period_end` (if present).
     - Also update `current_period_end` when available from Paddle payload.
  4. Invalidate application caches:
     - After DB commit, call `revalidateTag` for `subscription:<user_id>` so UI reads fresh data next request.

  Example webhook handler:
  ```ts
  // app/api/paddle/webhook/route.ts
  import { NextResponse } from "next/server";
  import { revalidateTag } from "next/cache";
  import { prisma } from "@/lib/prisma";
  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";

  function verifyPaddleSignature(rawBody: string, signature: string): boolean {
    // Implement per Paddle docs using your PADDLE_WEBHOOK_SECRET.
    // Keep it concise here; use their official verifier if available.
    return true;
  }

  export async function POST(req: Request) {
    const signature = req.headers.get("paddle-signature") ?? "";
    const raw = await req.text();

    if (!verifyPaddleSignature(raw, signature)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(raw);
    const type = event?.event_type ?? event?.type ?? "";
    const eventId = event?.event_id ?? event?.id ?? "";

    // Idempotency check
    const already = await prisma.webhook_event.findUnique({ where: { event_id: eventId } });
    if (already) return NextResponse.json({ ok: true, idempotent: true });

    // upsert event record
    await prisma.$transaction(async (tx) => {
      await tx.webhook_event.create({
        data: { event_id: eventId, type, raw: raw as unknown as object },
      });

      // Map Paddle event fields to your schema
      const paddleSubId = event?.data?.id ?? event?.data?.subscription_id;
      const status = event?.data?.status; // e.g. "active" | "canceled" | "past_due" | ...
      const canceledAt = event?.data?.canceled_at ? new Date(event.data.canceled_at) : null;
      const cancelAtPeriodEnd =
        event?.data?.pause?.resumes_at ||
        event?.data?.scheduled_change?.effective_at ||
        event?.data?.next_billed_at ||
        null;

      if (!paddleSubId) return;

      await tx.subscription.updateMany({
        where: { paddle_subscription_id: paddleSubId },
        data: {
          status, // keep 1:1 with Paddle or map to your enum
          canceled_at: canceledAt,
          cancel_at_period_end: cancelAtPeriodEnd ? new Date(cancelAtPeriodEnd) : null,
          current_period_end: event?.data?.current_billing_period?.ends_at
            ? new Date(event.data.current_billing_period.ends_at)
            : undefined,
        },
      });

      // Optional: also look up user_id from subscription and revalidate by tag
      const sub = await tx.subscription.findFirst({
        where: { paddle_subscription_id: paddleSubId },
        select: { user_id: true },
      });
      if (sub?.user_id) {
        revalidateTag(`subscription:${sub.user_id}`);
      }
    });

    return NextResponse.json({ ok: true });
  }
  ```

- Protected route access logic must use DB as source of truth
  - In `app/(protected)/generate-my-episodes/page.tsx`, bypass all caches and read directly from DB on every request. If not active, render a gate that shows a blocking modal (Phase 4).
  ```ts
  // app/(protected)/generate-my-episodes/page.tsx
  import type { Metadata } from "next";
  import { unstable_noStore as noStore } from "next/cache";
  import { prisma } from "@/lib/prisma";
  import { SubscriptionGate } from "./_components/subscription-gate";

  export const revalidate = 0;

  export async function generateMetadata(): Promise<Metadata> {
    return { title: "Generate my episodes" };
  }

  export default async function Page() {
    noStore();

    // Replace with your auth provider to obtain current user_id
    const userId = /* get from auth */ "";

    const subscription = await prisma.subscription.findFirst({
      where: { user_id: userId },
      select: { status: true },
    });

    const isActive = subscription?.status === "active";

    if (!isActive) {
      // Render a gate that blocks interaction and shows the required modal
      return <SubscriptionGate status="inactive" />;
    }

    // ...rest of your server component when active...
    return <div>/* generate episodes UI */</div>;
  }
  ```

### Phase 3: Caching and State Inconsistency Mitigation

- Next.js caching controls for subscription-critical paths
  - Pages that gate on subscription:
    - Use `noStore()` and `export const revalidate = 0`.
  - API endpoints that expose subscription status:
    ```ts
    // app/api/subscription/route.ts
    import { NextResponse } from "next/server";
    import { prisma } from "@/lib/prisma";
    export const runtime = "nodejs";
    export const dynamic = "force-dynamic";

    export async function GET(req: Request) {
      // get user_id from auth
      const userId = "";
      const subscription = await prisma.subscription.findFirst({
        where: { user_id: userId },
        select: { status: true, canceled_at: true, cancel_at_period_end: true },
      });
      return NextResponse.json(subscription ?? { status: null }, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    ```
  - Tag-based revalidation:
    - For any `fetch` you keep (if you don’t query Prisma directly in a page), add a tag and `revalidate: 0`:
      ```ts
      await fetch("/api/subscription", {
        cache: "no-store",
        next: { tags: [`subscription:${userId}`], revalidate: 0 },
      });
      ```
    - In webhook after writing the DB, call `revalidateTag(`subscription:${userId}`)` to purge any previous artifacts.

- Prisma/Accelerate caching
  - For critical reads (gating access), query Prisma directly inside Server Components with `noStore()`. This sidesteps most app-level caches.
  - If you enabled Prisma Accelerate caching, disable or set TTL=0 for the `subscription` model reads either:
    - Globally: turn off caching in your Accelerate config for `subscription` tables.
    - Per-query: use the non-cached client or configuration that bypasses cache for these reads (ensure these run in Node runtime and do not cross a caching proxy).
  - Do not memoize subscription reads in app-level helpers; call Prisma directly in the request path where you enforce access.

- Frontend state (Zustand) invalidation
  - Centralize subscription state and always refetch from the server on:
    - App mount for authenticated sessions.
    - After any membership-related server action.
    - On `router.refresh()` when a webhook likely changed status (e.g., after return from billing portal).
  ```ts
  // app/(protected)/_stores/subscription.ts
  "use client";
  import { create } from "zustand";

  type SubscriptionState = {
    subscription: { status: string | null } | null;
    loading: boolean;
    fetchSubscription: () => Promise<void>;
    clear: () => void;
  };

  export const useSubscriptionStore = create<SubscriptionState>((set) => ({
    subscription: null,
    loading: false,
    fetchSubscription: async () => {
      set({ loading: true });
      try {
        const res = await fetch("/api/subscription", { cache: "no-store" });
        const data = await res.json();
        set({ subscription: data, loading: false });
      } catch {
        set({ loading: false });
      }
    },
    clear: () => set({ subscription: null }),
  }));
  ```
  - After server actions that may change status, call:
    ```ts
    "use client";
    import { useRouter } from "next/navigation";
    import { useSubscriptionStore } from "@/app/(protected)/_stores/subscription";

    // ...
    await someServerAction();
    useSubscriptionStore.getState().fetchSubscription();
    const router = useRouter();
    router.refresh();
    ```

### Phase 4: Frontend UX Implementation (Mandatory)

- Gate check in protected route
  - Already covered in Phase 2: render a blocking gate if status is not active.
- Persistent, non-dismissible dialog/modal behavior
  - Implement `SubscriptionGate` as a Client Component that opens a persistent modal. Closing it redirects away from the protected page. “Upgrade Membership” navigates to manage membership.

  ```ts
  // app/(protected)/generate-my-episodes/_components/subscription-gate.tsx
  "use client";
  import { useEffect, useState } from "react";
  import { useRouter, usePathname } from "next/navigation";
  import { Button } from "@/components/ui/button";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

  type Props = { status: "inactive" | "active" };

  export function SubscriptionGate({ status }: Props) {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
      if (status === "inactive") setOpen(true);
    }, [status]);

    const onUpgrade = () => {
      router.push("/app/(protected)/manage-membership");
    };

    const onClose = () => {
      // If on protected page, force redirect to a safe location
      if (pathname?.startsWith("/app/(protected)/generate-my-episodes")) {
        router.replace("/dashboard");
      } else {
        setOpen(false);
      }
    };

    return (
      <Dialog open={open} onOpenChange={() => { /* non-dismissible on protected page */ }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Membership required</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p>Your membership has expired or been cancelled, resulting in restricted feature access.</p>
          </div>
          <DialogFooter>
            <Button onClick={onUpgrade}>Upgrade Membership</Button>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  ```

- Dashboard consistency
  - Ensure the dashboard reads subscription via:
    - Server-side Prisma read with `noStore()`; or,
    - Client fetch from `/api/subscription` with `cache: "no-store"`.
  - Do not derive plan display (“curate control”) from stale client state; always reflect the DB-backed endpoint.

- End-to-end behavior
  - Webhook marks subscription canceled and calls `revalidateTag`.
  - Next request to protected page runs server-side check (noStore) → renders `SubscriptionGate`.
  - Modal presents actions:
    - Upgrade → `/app/(protected)/manage-membership`
    - Close on protected page → redirect to `/dashboard`
  - Zustand store plus `router.refresh()` ensures the dashboard and header badges reflect current status.

Validation and rollout checklist
- Security
  - 403/authentication_malformed resolved: requests go through centralized `paddleFetch`, Node runtime, correct Bearer header.
  - Webhook signature verification enforced; idempotency in place.
- Caching
  - Protected routes and subscription API endpoints: `noStore`/`force-dynamic` and `Cache-Control: no-store`.
  - Tag-based invalidation wired from webhook.
  - Any Accelerate caching disabled for `subscription` reads.
- UX
  - Blocking modal on inactive status with required copy and actions.
  - Dashboard and header badges reflect DB truth.
- Testing
  - Simulate Paddle webhook events (active → canceled).
  - Confirm: dashboard state updates; protected route blocks; modal flows and redirects correct.
  - Observe logs include Paddle `x-request-id` for support.

- Operational guardrails
  - Add synthetic monitoring to poll `/api/subscription` for a test user, alert on mismatches between Paddle and DB state.
  - Alert on webhook signature failures and repeated authentication errors to catch regressions fast.

- Data correction (one-time)
  - Use the `paddle-log.json` evidence (status "canceled", canceled_at "2025-08-22") to backfill any inconsistent rows by running a one-off admin script or manual query to set:
    - `status = "canceled"`
    - `canceled_at = '2025-08-22T11:24:43.988Z'`
    - `cancel_at_period_end = NULL` (if not set)
  - Then trigger `revalidateTag("subscription:<user_id>")`.

Summary
- Centralized and hardened Paddle auth; Node-only runtime and proper Bearer header use.
- Strict webhook verification, transactional DB updates, and tag-based cache invalidation.
- Protected routes query Prisma with `noStore()` and block via a persistent modal if inactive.
- API endpoints and fetches marked `no-store`; Zustand invalidation and `router.refresh()` ensure the UI reflects DB truth.
