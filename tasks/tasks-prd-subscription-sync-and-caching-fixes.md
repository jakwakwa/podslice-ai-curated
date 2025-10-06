## Relevant Files

- `lib/paddle-server/paddle.ts` - This file will contain the new centralized `paddleFetch` client.
- `next.config.mjs` - This file will be updated to modify the Content Security Policy.
- `app/api/account/subscription/sync-paddle/route.ts` - API route that needs Node.js runtime enforced.
- `app/api/account/subscription/swap/route.ts` - API route that needs Node.js runtime enforced.
- `app/api/account/subscription/portal/route.ts` - API route that needs Node.js runtime enforced.
- `app/api/account/subscription/cancel/route.ts` - API route that needs Node.js runtime enforced.
- `app/api/account/subscription/route.ts` - API route that needs Node.js runtime enforced.
- `lib/env.ts` - This file will be updated to include a check for the `PADDLE_API_KEY`.

### Notes

- Unit tests should be created for the new `paddleFetch` client to ensure its functionality.
- Use `pnpm test` to run all tests.

## Tasks

- [ ] 1.0 Harden the Centralized Paddle API Client
  - [ ] 1.1 Rename `paddleApiRequest` to `paddleFetch` in `lib/paddle-server/paddle.ts`.
  - [ ] 1.2 Add `cache: 'no-store'` to the `fetch` options to prevent stale data.
  - [ ] 1.3 Add the `Paddle-Version` header, pinned to `2024-08-27`.
  - [ ] 1.4 Capture the `x-request-id` from the response headers.
  - [ ] 1.5 In the error handling block, log the error, status code, and the `x-request-id`.
  - [ ] 1.6 Add a startup check in `lib/env.ts` or a similar global setup file to ensure `PADDLE_API_KEY` is present in the environment, throwing an error if it's missing.
- [ ] 2.0 Migrate All Paddle API Calls to the Hardened Client
  - [ ] 2.1 Since all server-side Paddle calls are already using `paddleApiRequest`, renaming it to `paddleFetch` and updating the internal functions in `lib/paddle-server/paddle.ts` will complete the migration. No other files need to be changed for this step.
- [ ] 3.0 Update Content Security Policy
  - [ ] 3.1 In `next.config.mjs`, add `https://clerk-telemetry.com` to the `connect-src` directive within the Content Security Policy header configuration.
- [ ] 4.0 Enforce Node.js Runtime for Paddle Communication
  - [ ] 4.1 In `app/api/account/subscription/sync-paddle/route.ts`, export the constant `export const runtime = "nodejs"`.
  - [ ] 4.2 In `app/api/account/subscription/swap/route.ts`, export the constant `export const runtime = "nodejs"`.
  - [ ] 4.3 In `app/api/account/subscription/portal/route.ts`, export the constant `export const runtime = "nodejs"`.
  - [ ] 4.4 In `app/api/account/subscription/cancel/route.ts`, export the constant `export const runtime = "nodejs"`.
  - [ ] 4.5 In `app/api/account/subscription/route.ts`, export the constant `export const runtime = "nodejs"`.
- [ ] 5.0 Review and Verify Implementation
  - [ ] 5.1 Manually review all code changes to ensure they meet the requirements.
  - [ ] 5.2 Create a test plan to verify that the subscription sync is working correctly and no CSP errors are present.
  - [ ] 5.3 Run `pnpm build` and `pnpm lint` to ensure there are no build errors or linting issues.
