Of course. Here is the content of the `prd-paddle-integration-and-security-fixes.md` file.

```markdown
# PRD: Stabilize Paddle Integration and Security Policies

## 1. Introduction/Overview

This document outlines the requirements for resolving critical backend errors related to our Paddle integration and addressing a content security policy (CSP) violation. The primary goal is to eliminate `authentication_malformed` errors that are causing subscription sync failures and to ensure our application's security policies are correctly configured. This effort will stabilize our billing system, improve reliability, and establish a robust foundation for all server-to-Paddle communications.

## 2. Goals

*   **Eliminate Paddle Authentication Errors:** Resolve the root cause of the `authentication_malformed` errors by centralizing and hardening all server-side API requests to Paddle.
*   **Fix Content Security Policy Violations:** Correct the CSP to allow required telemetry from Clerk, removing browser console errors.
*   **Improve Debuggability:** Enhance logging for Paddle API interactions to enable faster debugging of future issues.
*   **Standardize API Client:** Implement a single, standardized client for all Paddle communications to ensure consistency and prevent regressions.

## 3. User Stories

*   **As a user, I want my subscription status to be reliably synced so that I have uninterrupted access to the features I've paid for.**
*   **As a business owner, I want to eliminate payment-related API errors to ensure revenue is not impacted and user trust is maintained.**

## 4. Functional Requirements

1.  **Centralized Paddle API Client:**
    *   A new `paddleFetch` function must be created in a central location (e.g., `lib/paddle.ts`).
    *   This function must handle all server-side requests to the Paddle API.
    *   It must automatically include the `Authorization: Bearer <PADDLE_API_KEY>` and `Content-Type: application/json` headers in every request.
    *   It must enforce a `no-store` cache policy to prevent stale data.
    .
2.  **Immediate Migration to New Client:**
    *   All existing `fetch` calls to Paddle throughout the codebase must be replaced with the new `paddleFetch` client. This is a mandatory, single-effort migration.

3.  **Enforce Node.js Runtime:**
    *   All API routes and server actions that communicate with Paddle must explicitly export `runtime = "nodejs"` to prevent execution in Edge runtimes which can interfere with headers.

4.  **Enhanced Error Logging:**
    *   The `paddleFetch` client must capture the `x-request-id` from Paddle API responses.
    *   In the event of a non-OK response, the client must log the error, including the status code and the `x-request-id`, without logging any secrets.

5.  **Environment Variable Audit:**
    *   The `PADDLE_API_KEY` environment variable must be verified in all environments (local, CI, production) to ensure it is correct and contains no trailing whitespace or newlines.
    *   The application should throw a startup error if `PADDLE_API_KEY` is not configured.

6.  **CSP Violation Fix:**
    *   The application's Content Security Policy must be updated.
    *   The `connect-src` directive must be modified to include `https://clerk-telemetry.com`.

## 5. Non-Goals (Out of Scope)

*   Implementing webhook processing logic (Phase 2).
*   Addressing caching strategies beyond the `no-store` policy for direct API calls (Phase 3).
*   Implementing frontend UX for subscription gating (Phase 4).
*   Adding retry logic for API requests.

## 6. Technical Considerations

*   **API Version Pinning:** The `paddleFetch` client must include the `Paddle-Version` header, pinned to a specific, known-good version that has been tested (e.g., `2024-08-27`).

## 7. Success Metrics

*   Zero `authentication_malformed` errors from Paddle are present in application logs over a continuous 7-day period.
*   100% of server-side Paddle API calls are verifiably routed through the new `paddleFetch` client.
*   Zero CSP violation reports related to `clerk-telemetry.com` are observed in browser monitoring tools.

## 8. Open Questions

*   None at this time. The implementation path is clearly defined in the associated task document.
```
