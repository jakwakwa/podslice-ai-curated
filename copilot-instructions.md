# PODSLICE.ai - Warp Commands

AI-powered podcast content curation platform documentation for common development tasks.

## Quick Start

### Development
Workflow: PDev
```warp-runnable-command
pnpm dev
```

### Build
Workflow: Pbuild
```warp-runnable-command
pnpm build
```

## Development Guidelines

> **Source of Truth**: Complete rules live in [`.cursor/rules/critical-project-rules.mdc`](.cursor/rules/critical-project-rules.mdc).
> This section provides a quick reference for key development patterns.

### Next.js App Router Patterns

#### Page Structure
- **Protected pages**: Place under `app/(protected)/...` for automatic sidebar/header layout
- **Thin pages**: Keep `page.tsx` minimal, do data fetching in Server Components
- **Co-location**: Put `loading.tsx`, `error.tsx`, `route.ts` alongside `page.tsx`
- **API routes**: Place handlers in `app/api/.../route.ts`

#### Component Architecture
- **Server Components first**: Default to Server Components for data fetching
- **Client Components**: Use `"use client"` only for interactivity
- **Data flow**: Pass data to Client Components via props only

### TypeScript Best Practices

#### Type Safety
- **Explicit typing**: All functions must have explicit return types
- **Runtime validation**: Use Zod schemas to validate API responses
- **Prisma types**: Import from `@/lib/types.ts`, use exact schema field names
- **Type imports**: Always use `import type` for type-only imports

#### Schema Validation Example
```typescript
const MyDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

type MyData = z.infer<typeof MyDataSchema>;
```

### Database & Prisma Patterns

> **Schema Source**: [`.cursor/rules/schema-source-of-truth.mdc`](.cursor/rules/schema-source-of-truth.mdc)

#### Schema Rules (Critical)
- **Source of truth**: `prisma/schema.prisma` defines ALL field names - never invent new ones
- **Field naming**: Use exact snake_case field names from schema (e.g., `podcast_id`, `published_at`)
- **Relations**: Use camelCase relation names as defined (e.g., `ownerUser`, `bundle`, `podcast`, `userProfile`)
- **Types**: Import Prisma-generated types, don't create custom interfaces in pages
- **When unsure**: Always check `prisma/schema.prisma` directly

#### Correct Query Examples
```typescript
// ✅ Good: exact field names and relations from schema
await prisma.episode.findMany({
  where: { podcast_id: somePodcastId, profile_id: null },
  orderBy: { published_at: "desc" },
  include: { podcast: true, bundle: true, userProfile: true },
});

// ✅ Good: relation includes with proper casing
await prisma.bundle.findMany({
  where: { is_active: true, is_static: true },
  include: { ownerUser: true, bundle_podcast: true, episodes: true },
});
```

#### Emergency Fix Protocol
1. **Revert immediately** any change with casing mismatches
2. **Verify names** directly in `prisma/schema.prisma`
3. **Cross-check** working API routes under `app/api/**`
4. **Never regenerate** Prisma Client without verifying field names

#### Data Fetching
- **Caching**: Prefer `fetch(url, { next: { revalidate: <seconds> } })`
- **Dynamic content**: Use `import { unstable_noStore as noStore } from "next/cache"`
- **Parallel fetching**: Use `Promise.all` for independent data

### Code Scaffolds

#### Server Page Template
```typescript
// app/(protected)/example/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import type { MyData } from "@/lib/types";

export const revalidate = 3600; // ISR preferred

const MyDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

async function fetchData(): Promise<MyData[]> {
  const res = await fetch("/api/example", { next: { revalidate } });
  if (!res.ok) throw new Error("Failed to load");
  const data = await res.json();
  return z.array(MyDataSchema).parse(data) as MyData[];
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Example", description: "Example page" };
}

export default async function Page() {
  const dataPromise = fetchData();
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <pre>{JSON.stringify(await dataPromise, null, 2)}</pre>
    </Suspense>
  );
}
```

#### Client Component Template
```typescript
// app/(protected)/example/_components/client-component.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MyData } from "@/lib/types";

type ClientProps = {
  data: MyData[];
  label: string;
};

export function ClientComponent({ data, label }: ClientProps) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>{label}: {count}</p>
      <Button onClick={() => setCount((n) => n + 1)}>Increment</Button>
    </div>
  );
}
```

### Pre-commit Checklist

- [ ] Page is under `app/(protected)/...` if it needs authenticated layout
- [ ] Server Components by default; Client Components only for interactivity  
- [ ] No hardcoded interfaces in page files; types imported from `lib/types.ts`
- [ ] Uses `<Image />` and existing shadcn/ui components
- [ ] Co-located `loading.tsx` and `error.tsx` where applicable
- [ ] Uses `fetch` with `revalidate` or `noStore` for dynamic content
- [ ] Parallelizes data fetching with `Promise.all` when useful
- [ ] `pnpm build` and `pnpm lint` pass with no errors before commit

### Special Notes

#### Google Cloud Storage
- Use lazy initialization for upload routes
- Accept: `GCS_UPLOADER_KEY_JSON` | `GCS_UPLOADER_KEY` | `GCS_UPLOADER_KEY_PATH`
- Never print credentials or paths in logs

#### Middleware
- Existing middleware is protected in `.cursorignore`
- Don't question its location - look for other issues if problems arise

## Core Architectural Mandate: Media Processing

> **Source**: [`.cursor/rules/dos-and-donts.mdc`](.cursor/rules/dos-and-donts.mdc)
> **Critical**: This principle prevents timeout errors and system failures.

### The Golden Rule: Source URL is the Single Source of Truth

The transcription workflow begins with a single input: a `srcUrl` (YouTube video URL).

- **✅ DO**: Work directly with the URL
- **❌ DON'T**: Download the full file as a preliminary step
- **Why**: The `srcUrl` is raw material, not a download link

### Forbidden Pattern: No Full Downloads

**NEVER** attempt to download full audio/video content as a preliminary step.

- **❌ No "source audio" files** stored in GCS for transcription input
- **❌ No `download-and-store-audio` steps** - this causes timeouts
- **❌ No dependency** on pre-downloaded source files

### Valid Transcription Methods

#### Method A: Direct API Processing (Default)
```typescript
// ✅ Good: Pass srcUrl directly to Gemini
const transcript = await gemini.processVideo(srcUrl);
```

#### Method B: On-Demand Stream Chunking (Long Videos)
```typescript
// ✅ Good: Stream processing workflow
1. Orchestrator: Fetch metadata only (duration)
2. Fan-Out: Calculate chunks (30-min segments)
3. Worker: Process segment directly from srcUrl stream
4. ffmpeg: Extract segment without downloading full file
```

### Architecture Mantra

> **"Process the stream, not the file. The URL is the source, not a download link."**

#### Stream Processing Pattern
```bash
# ✅ Good: Process specific segment from stream
ffmpeg -i "$srcUrl" -ss $startTime -t $duration -vn output.wav

# ❌ Bad: Download first, then process
yt-dlp "$srcUrl" -o full_video.mp4  # This causes timeouts!
ffmpeg -i full_video.mp4 output.wav
```

## Development Commands

### Server & Development
```warp-runnable-command
pnpm dev
```
Start the Next.js development server

```warp-runnable-command
pnpm dev:turbo
```
Start development server with Turbopack (faster builds)

```warp-runnable-command
pnpm dev:legacy
```
Development with Tailwind watching and Turbo mode

```warp-runnable-command
pnpm start
```
Start production server

### Build Commands
```warp-runnable-command
pnpm build
```
Production build with Prisma generation

```warp-runnable-command
pnpm build:fast
```
Fast build with optimizations (skips env validation)

## Database Commands

### Prisma Operations
```warp-runnable-command
pnpm prisma:generate
```
Generate Prisma client

```warp-runnable-command
pnpm prisma:push
```
Push schema changes to database

```warp-runnable-command
pnpm prisma:migrate
```
Run database migrations

```warp-runnable-command
pnpm test:db:deploy
```
Deploy database for testing

### Data Seeding
```warp-runnable-command
pnpm seed
```
Seed the database with initial data

```warp-runnable-command
pnpm seed:personas
```
Seed test user personas

## Code Quality & Testing

### Linting & Formatting
```warp-runnable-command
pnpm lint
```
Run Biome linter

```warp-runnable-command
pnpm lint:fix
```
Fix linting issues automatically

```warp-runnable-command
pnpm format
```
Format code with Biome

```warp-runnable-command
pnpm format:fix
```
Format and fix linting issues

### Testing
```warp-runnable-command
pnpm test
```
Run all tests

```warp-runnable-command
pnpm test:watch
```
Run tests in watch mode

```warp-runnable-command
pnpm test:ci
```
Run tests with coverage for CI

## Background Jobs & Services

### Inngest
```warp-runnable-command
pnpm inngest
```
Start Inngest development server for background jobs

### Caching
```warp-runnable-command
pnpm caching
```
Run caching operations

## Package Management

### Installation Commands
```warp-runnable-command
pnpm install
```
Standard install

```warp-runnable-command
pnpm install:legacy
```
Install with legacy peer deps (npm)

```warp-runnable-command
pnpm install:fast
```
Fast install with legacy peer deps

```warp-runnable-command
pnpm install:clean
```
Clean install (removes node_modules and lock files)

```warp-runnable-command
pnpm install:diagnose
```
Diagnose installation issues

```warp-runnable-command
pnpm switch:pnpm
```
Switch from npm to pnpm

### Dependency Management
```warp-runnable-command
pnpm deps:cleanup
```
Clean up dependencies

```warp-runnable-command
pnpm deps:analyze
```
Analyze dependency structure

## Data Management

### Duration Updates
```warp-runnable-command
pnpm durations:update
```
Update all content durations

```warp-runnable-command
pnpm durations:update:episodes
```
Update episode durations only

```warp-runnable-command
pnpm durations:update:user
```
Update user episode durations

## Docker & Testing

### Docker
```warp-runnable-command
docker-compose -f docker-compose.test.yml up -d
```
Start test database container

```warp-runnable-command
docker-compose -f docker-compose.test.yml down
```
Stop test database container

## Environment Setup

### Prerequisites Check
```warp-runnable-command
node --version
```
Check Node.js version (should be v22)

```warp-runnable-command
pnpm --version
```
Check pnpm version

### Database Status
```warp-runnable-command
npx prisma studio
```
Open Prisma Studio for database management

```warp-runnable-command
npx prisma db push
```
Push schema changes without migrations

## Project Structure

### Key Directories
- `/app` - Next.js App Router pages and layouts
- `/components` - Reusable React components
- `/lib` - Utility functions and configurations
- `/prisma` - Database schema and migrations
- `/scripts` - Utility scripts for seeding and maintenance
- `/public` - Static assets

### Important Files
- `package.json` - Project dependencies and scripts
- `prisma/schema.prisma` - Database schema
- `next.config.mjs` - Next.js configuration
- `.env.local` - Environment variables (not in repo)

## Quick Troubleshooting

### Common Issues
```warp-runnable-command
pnpm install:clean
```
Fix dependency conflicts

```warp-runnable-command
pnpm prisma:generate
```
Regenerate Prisma client after schema changes

```warp-runnable-command
pnpm format:fix
```
Fix code formatting issues

### Debug Commands
```warp-runnable-command
pnpm install:diagnose
```
Diagnose installation problems

```warp-runnable-command
pnpm deps:analyze
```
Analyze dependency issues

## Tech Stack Quick Reference

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **AI**: Google Gemini for summarization and TTS
- **Background Jobs**: Inngest
- **Payments**: Paddle
- **Storage**: Google Cloud Storage
- **Styling**: Tailwind CSS + shadcn/ui
- **Package Manager**: pnpm