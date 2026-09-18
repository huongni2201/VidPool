# Frontend Architecture (Feature-Sliced Design)

## 1. Overview

VidPool frontend is structured according to Feature-Sliced Design (FSD) v2 principles tailored for a desktop-first, local-first Tauri application.

```text
src/
├── app/          # Application initialization, routing, top-level providers
├── pages/        # Route page views (canonical composition root for views)
├── widgets/      # Self-contained composite UI sections reused across pages
├── features/     # User interactions and discrete business use cases
├── entities/     # Domain business entities, schemas, types, and model stores
├── shared/       # Reusable primitives, API client, design system UI, config, demo data
└── test/         # Architectural boundary tests and shared test fixtures
```

---

## 2. Layer Responsibilities & Dependency Direction

Dependencies must point strictly downward:

```text
app
 ↓
pages
 ↓
widgets
 ↓
features
 ↓
entities
 ↓
shared
```

### Strictly Forbidden Dependencies

1. `shared` must never import from `entities`, `features`, `widgets`, `pages`, or `app`.
2. `entities` must never import from `features`, `widgets`, `pages`, or `app`.
3. `features` must never import from sibling `features` or higher layers (`widgets`, `pages`, `app`).
4. `widgets` must never import from `pages` or `app`.
5. `pages` must never import from `app`.
6. Legacy non-FSD paths (`src/components/`, `src/lib/`, `src/runtime/`, `src/app/api-client-context*`) are strictly forbidden.

If two features need common logic, move that logic into an entity capability or a shared primitive.

---

## 3. Slice Definitions

### `app/`
- Contains entry configuration, router definition (`router.tsx`), top-level providers (`QueryProvider`, `ThemeProvider`), and application shell bootstrap.
- Does not contain business logic or feature implementations.

### `pages/`
- Every route corresponds to a page directory: `src/pages/<name>/ui/<name>-page.tsx`.
- Pages compose widgets, features, and entities for a specific URL route.
- Pages do not implement raw reusable UI primitives or business algorithms.

### `widgets/`
- Standalone, multi-component UI blocks composed of entities and features.
- Examples: `Sidebar`, `AccountTable`, `AccountPoolSummary`.
- Widgets can be placed on multiple pages or act as major sub-sections of a page.

### `features/`
- Encapsulates a discrete user action or interactive use-case.
- Answers the question: *"What action is the user performing?"*
- Valid examples: `account-login` (adding/relogging account), `account-pool` (actions on accounts: enable/disable/delete/validate), `project-create`, `project-delete`.
- Invalid: Page-shaped folders (e.g., `features/dashboard`, `features/editor`) are forbidden.

### `entities/`
- Models core domain concepts.
- Contains:
  - Zod schemas and TypeScript types (`model/types.ts`, `model/schemas.ts`)
  - Domain stores when client-managed (`model/project-store.ts`)
  - Pure visual representation of domain entities (`ui/account-badge.tsx`, `ui/project-card.tsx`)
- Examples: `account`, `project`, `generation`, `job`.

### `shared/`
- Domain-agnostic reusable code:
  - `shared/ui/`: Base design system primitives (`button`, `card`, `input`, `stat-card`, `status-badge`, `waveform-visualizer`).
  - `shared/api/`: Canonical HTTP client (`createApiClient`, `ApiError`), provider context (`useApiClient`).
  - `shared/config/`: Runtime configuration loading (`runtime-config.ts`).
  - `shared/constants/`: Application route constants (`ROUTES`).
  - `shared/lib/`: Low-level utilities (`cn`).
  - `shared/demo/`: Strictly isolated mock/prototype data for unintegrated screens.

---

## 4. State Management & Data Fetching

### TanStack Query (Server State)
- Used for all backend-persisted state (accounts, providers, background jobs, system health).
- Queries and mutations live in `features/<feature-name>/hooks/` or `entities/<entity-name>/api/`.
- Queries are keyed systematically (e.g. `["accounts"]`, `["providers"]`).

### Zustand (Client Interactive State)
- Used solely for client-side editing session state, such as active open project metadata (`entities/project/model/project-store.ts`).
- Truthful initialization: stores start in a truthful empty/null state; they must never inject hardcoded mock objects as active runtime data.

---

## 5. API Client & Runtime Error Handling

- Centralized in `shared/api/api-client.ts`.
- All requests flow through a single private `request<T>` method with unified URL formatting, Authorization headers, and error parsing.
- Server errors are normalized into `ApiError`:
  ```ts
  export class ApiError extends Error {
    constructor(
      public readonly status: number,
      public readonly detail: string,
      public readonly path: string,
    ) { ... }
  }
  ```
- Secrets (Bearer tokens, passwords) are strictly excluded from error messages, URLs, and logs.
- Response payloads must be validated against explicit Zod schemas.

---

## 6. Demo Data Isolation Policy

1. Screens that do not yet have production backend endpoints (e.g. character generation, visual beat planner, timeline editor) use isolated demo fixtures.
2. All mock datasets reside exclusively in `src/shared/demo/`.
3. Demo data must never be imported into operational production logic or entities.
4. UI components must never display fake live badges (e.g. fake pending job count "3" or fake account count "8" in navigation) or fake authenticated user identities.

---

## 7. Component Reuse & Barrel Export Policy

1. Single canonical implementation: each primitive exists in exactly one place (e.g. `StatCard` in `shared/ui/stat-card.tsx`).
2. Public API boundaries: barrel `index.ts` files are allowed only at slice entry points to export the slice's public API.
3. Internal references: code inside a slice must import internal files via relative paths, not via its own slice barrel.
4. No dummy wrappers: do not create single-file re-export wrappers in `pages/` or `features/`.

---

## 8. Testing Strategy

1. **Unit & Component Tests**: Collocated with the source file (e.g., `account-pool-summary.test.tsx` next to `account-pool-summary.tsx`).
2. **Architecture Boundary Tests**: `src/test/architecture/import-boundaries.test.ts` scans all source files using regex to strictly prevent:
   - Sibling feature imports
   - Upward entity/shared dependencies
   - Legacy directories (`src/components/`, `src/lib/`, page-shaped `src/features/`)
3. **Dead Code Gate**: Enforced via `pnpm knip` with zero tolerance for unused files, exports, or dependencies.
4. **Version Sync Gate**: Enforced via `node scripts/check-version-sync.mjs`.
