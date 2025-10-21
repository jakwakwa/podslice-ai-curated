# Migration Guide: Using Refactored Patterns

This guide explains how to use the new refactored components and patterns established in the Episodes and Curated Bundles pages.

---

## Table of Contents

1. [Content Extraction Pattern](#content-extraction-pattern)
2. [Using Skeleton Components](#using-skeleton-components)
3. [Creating Filter Components](#creating-filter-components)
4. [Using CommonSectionWithChildren](#using-commonsectionwithchildren)
5. [Best Practices](#best-practices)
6. [Examples](#examples)

---

## Content Extraction Pattern

### When to Extract Content

Extract content into a `content.ts` file when:
- Page has 3+ hardcoded strings
- Text is repeated across components
- Copy needs to be easily updated by non-developers
- Page has complex state messages (error, empty, loading)

### How to Create content.ts

```typescript
// app/(protected)/your-page/content.ts

/**
 * Your Page content
 * Centralized static copy and configuration
 */

export const yourPageContent = {
  header: {
    title: "Page Title",
    description: "Page description text goes here...",
  },
  sections: {
    main: {
      title: "Main Section Title",
      description: "Section description...",
    },
  },
  states: {
    error: {
      title: "Error Title",
      description: "Error message...",
      button: "Retry",
    },
    empty: {
      title: "Empty State Title",
      description: "No items found...",
    },
    loading: {
      message: "Loading...",
    },
  },
  buttons: {
    primary: "Primary Action",
    secondary: "Secondary Action",
  },
} as const;
```

### Using Content in Components

```typescript
import { yourPageContent } from "./content";

export function YourComponent() {
  return (
    <div>
      <h1>{yourPageContent.header.title}</h1>
      <p>{yourPageContent.header.description}</p>
    </div>
  );
}
```

---

## Using Skeleton Components

### Episodes Skeletons

Located in `components/shared/skeletons/episodes-skeleton.tsx`

```typescript
import {
  EpisodesPageSkeleton,
  EpisodesListSkeleton,
  EpisodeCardSkeleton,
  EpisodesFilterSkeleton,
} from "@/components/shared/skeletons/episodes-skeleton";

// Full page skeleton
<EpisodesPageSkeleton />

// List with custom count
<EpisodesListSkeleton count={10} />

// Single card
<EpisodeCardSkeleton />

// Filter bar
<EpisodesFilterSkeleton />
```

### Bundles Skeletons

Located in `components/shared/skeletons/bundles-skeleton.tsx`

```typescript
import {
  BundlesPageSkeleton,
  BundleGridSkeleton,
  BundleCardSkeleton,
  BundlesFilterSkeleton,
} from "@/components/shared/skeletons/bundles-skeleton";

// Full page skeleton
<BundlesPageSkeleton />

// Grid with custom count
<BundleGridSkeleton count={9} />

// Single card
<BundleCardSkeleton />

// Filter bar
<BundlesFilterSkeleton />
```

### Creating New Skeletons

Follow this pattern:

```typescript
// components/shared/skeletons/your-feature-skeleton.tsx

import { Skeleton } from "@/components/ui/skeleton";

export function YourCardSkeleton() {
  return (
    <div className="bg-[#2f4383]/30 rounded-2xl p-4 animate-pulse">
      <Skeleton className="bg-[#1f2d5f]/50 h-6 w-3/4" />
      <Skeleton className="bg-[#1f2d5f]/50 h-4 w-full mt-2" />
      <Skeleton className="bg-[#1f2d5f]/50 h-10 w-full mt-4" />
    </div>
  );
}

export function YourListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <YourCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

---

## Creating Filter Components

### Pattern for Filter Components

1. Create a dedicated component file
2. Define explicit prop interface
3. Use controlled component pattern
4. Extract content to content.ts

Example:

```typescript
// app/(protected)/your-page/_components/your-filter.tsx
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface YourFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  options: {
    [key: string]: string;
  };
}

export function YourFilter({ value, onValueChange, label, options }: YourFilterProps) {
  return (
    <div className="w-full flex flex-col gap-2">
      <label className="text-sm font-medium text-primary-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(options).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

---

## Using CommonSectionWithChildren

### When to Use

Use `CommonSectionWithChildren` to wrap main content sections that need:
- Consistent header styling
- Consistent spacing
- Consistent border/shadow styling
- Title + description pattern

### How to Use

```typescript
import CommonSectionWithChildren from "@/components/shared/section-common";

export function YourPage() {
  return (
    <CommonSectionWithChildren
      title="Section Title"
      description="Section description that explains what this section contains."
    >
      {/* Your content here */}
      <div className="p-6">
        <YourContent />
      </div>
    </CommonSectionWithChildren>
  );
}
```

### When NOT to Use

Don't use `CommonSectionWithChildren` when:
- Page already has its own wrapper structure
- You need custom header styling
- Content doesn't fit the title + description pattern
- You need multiple sections with different styles

---

## Best Practices

### Component Organization

```
app/(protected)/your-page/
├── page.tsx                    # Thin wrapper, minimal logic
├── content.ts                  # Static copy
├── loading.tsx                 # Loading state (optional)
├── error.tsx                   # Error boundary (optional)
└── _components/
    ├── your-page-client.tsx    # Client logic & state
    ├── your-filter.tsx         # Filter components
    └── your-card.tsx           # Card components
```

### Type Safety

Always define explicit prop interfaces:

```typescript
// ✅ Good
interface CardProps {
  title: string;
  description: string;
  onClick: () => void;
}

export function Card({ title, description, onClick }: CardProps) {
  // ...
}

// ❌ Bad
export function Card(props: any) {
  // ...
}
```

### Content vs. Props

**Use content.ts for:**
- Static text that rarely changes
- Error messages
- Button labels
- Help text

**Use props for:**
- Dynamic data from API
- User-specific content
- Conditional content based on state

### Client vs. Server Components

**Client Components** ("use client"):
- Need useState, useEffect, or other hooks
- Need event handlers
- Need browser APIs

**Server Components** (default):
- Fetch data from database
- No interactivity needed
- Better performance (smaller JS bundle)

```typescript
// page.tsx - Server Component (no "use client")
export default async function Page() {
  const data = await fetchData(); // Server-side fetch
  
  return (
    <div>
      <PageHeader {...pageContent.header} />
      <ClientComponent data={data} /> {/* Pass data to client */}
    </div>
  );
}

// _components/client-component.tsx - Client Component
"use client";

export function ClientComponent({ data }) {
  const [state, setState] = useState();
  // Interactive logic here
}
```

---

## Examples

### Example 1: Simple Page Refactor

Before:
```typescript
export default function Page() {
  return (
    <div>
      <h1>My Page Title</h1>
      <p>This is a description of what this page does...</p>
      {/* ... more content */}
    </div>
  );
}
```

After:
```typescript
// content.ts
export const pageContent = {
  header: {
    title: "My Page Title",
    description: "This is a description of what this page does...",
  },
} as const;

// page.tsx
import { PageHeader } from "@/components/ui/page-header";
import { pageContent } from "./content";

export default function Page() {
  return (
    <div>
      <PageHeader {...pageContent.header} />
      {/* ... more content */}
    </div>
  );
}
```

### Example 2: Filter Component Refactor

Before:
```typescript
<Select value={filter} onValueChange={setFilter}>
  <SelectTrigger>
    <SelectValue placeholder="Select filter" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Items</SelectItem>
    <SelectItem value="active">Active</SelectItem>
    <SelectItem value="inactive">Inactive</SelectItem>
  </SelectContent>
</Select>
```

After:
```typescript
// content.ts
export const pageContent = {
  filters: {
    label: "Filter by status:",
    options: {
      all: "All Items",
      active: "Active",
      inactive: "Inactive",
    },
  },
};

// _components/status-filter.tsx
interface StatusFilterProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function StatusFilter({ value, onValueChange }: StatusFilterProps) {
  return (
    <YourFilter
      value={value}
      onValueChange={onValueChange}
      label={pageContent.filters.label}
      options={pageContent.filters.options}
    />
  );
}

// Usage
<StatusFilter value={filter} onValueChange={setFilter} />
```

### Example 3: Loading State

Before:
```typescript
{isLoading ? (
  <div>
    <div className="bg-[#2f4383]/30 h-20 animate-pulse" />
    <div className="bg-[#2f4383]/30 h-20 animate-pulse" />
    <div className="bg-[#2f4383]/30 h-20 animate-pulse" />
  </div>
) : (
  <YourContent />
)}
```

After:
```typescript
import { YourListSkeleton } from "@/components/shared/skeletons/your-skeleton";

{isLoading ? <YourListSkeleton count={3} /> : <YourContent />}
```

---

## Checklist for Refactoring a Page

- [ ] Create `content.ts` with all static copy
- [ ] Create `_components/` directory for page-specific components
- [ ] Extract filter logic into dedicated component
- [ ] Create loading skeleton components
- [ ] Update page.tsx to use extracted components
- [ ] Add explicit TypeScript interfaces for all props
- [ ] Test loading, error, and empty states
- [ ] Run `pnpm build` to verify no errors
- [ ] Run `pnpm lint` to verify code quality
- [ ] Test in browser for hydration errors

---

## Getting Help

If you need help applying these patterns:

1. Review the Episodes page refactor: `app/(protected)/episodes/`
2. Review the Curated Bundles page refactor: `app/(protected)/curated-bundles/`
3. Check existing shared components: `components/shared/`
4. Read the REFACTORING_SUMMARY.md for detailed explanation

---

## Future Patterns

As the codebase evolves, consider adding:

1. **Form components**: Reusable form fields with validation
2. **Modal patterns**: Standardized modal/dialog components
3. **Table components**: Reusable data table components
4. **Card variants**: Different card styles for different contexts
5. **Animation patterns**: Consistent transitions and animations

These patterns should follow the same principles:
- Extract static content
- Create reusable components
- Maintain type safety
- Keep components focused and small