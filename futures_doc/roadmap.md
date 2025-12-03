# Future Hardening Roadmap

## High Priority Items

1. **Tighten the global CSP**  
   Replace the blanket `'unsafe-inline'` and `'unsafe-eval'` allowances in `next.config.mjs` with hashed scripts and explicit host lists so we can keep interactive embeds whitelisted without disabling the CSP entirely. Use separate CSP entries for sandbox-only Paddle hosts to minimize the production surface area.

2. **Consolidate mobile breakpoint logic**  
   Merge `hooks/use-mobile.ts` and `hooks/use-mobile.tsx` into a single source of truth that reads the breakpoint from `tailwind.config` (or a shared constants file) to avoid hydration mismatches. Update dependents to import the shared hook so the responsive behaviour is consistent across the dashboard.

3. **Strip PII from API logs**  
   Replace the `console.log` statements in `app/api/notifications/route.ts` and the subscription `GET` handler with structured debug logs that omit email addresses and Paddle IDs. Gate verbose logging behind `NODE_ENV !== "production"` or a feature flag so operational debugging is still possible locally.

## Low Priority Items

1. **Calm noisy env logging**  
   Update `lib/env.ts` to gate the verbose `getMaxDurationSeconds` logging behind a debug flag (or `NODE_ENV === "development"`) so production logs only capture misconfiguration warnings instead of every call site.

2. **Remove the legacy JS audio store**  
   Delete `store/audioPlayerStore.js` after ensuring no modules import it. The TypeScript version already exports the fully typed store, so dropping the duplicate avoids accidental circular mocks and simplifies tree shaking.

