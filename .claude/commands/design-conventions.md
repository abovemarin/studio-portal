# Design Conventions — Studio Portal

Reference for applying the design system consistently. Read this before touching any UI.

---

## Theming

- **Light/dark toggle** via `next-themes`. `ThemeProvider` lives in `components/providers.tsx`.
- CSS custom properties swap on `<html class="dark">`. No `dark:` Tailwind prefixes needed for colors — the variables do the work automatically.
- **Critical pattern**: color tokens live in `@theme {}` (NO `inline`). Without `inline`, Tailwind generates utilities that reference the CSS variable — e.g. `.bg-accent { background-color: var(--color-accent) }` — so `.dark {}` overrides take effect. With `@theme inline`, Tailwind bakes the literal hex into the utility and dark mode overrides are silently ignored.
- Font tokens use `@theme inline {}` because their values already contain `var()` references to next/font variables. Inlining them is fine; they resolve at runtime.
- Theme persists in `localStorage`. `suppressHydrationWarning` is on `<html>` to prevent SSR mismatch.

---

## Tokens

All tokens are CSS custom properties. Use the Tailwind utility classes — never hardcode hex values.

### Surfaces (backgrounds)
| Token / class | Light | Dark | Use for |
|---|---|---|---|
| `bg-surface-bg` | `#f8f5f0` | `#1c1917` | Page background |
| `bg-surface-card` | `#f2ede6` | `#252220` | Cards, panels, header |
| `bg-surface-raised` | `#ebe4d8` | `#312e2b` | Hover states, dropdowns |

### Borders
| Token / class | Use for |
|---|---|
| `border-border` | Default borders, cards, inputs |
| `border-border-subtle` | Dividers, very light separations |

### Text
| Token / class | Use for |
|---|---|
| `text-text` | Primary body copy, headings |
| `text-text-secondary` | Supporting copy, descriptions |
| `text-text-muted` | Labels, captions, placeholders |

### Accent (amber)
| Token / class | Use for |
|---|---|
| `bg-accent` / `text-accent` | Primary CTA background / accent text |
| `hover:bg-accent-hover` | Hover state on accent elements |
| `text-accent-fg` | Text on amber backgrounds |
| `bg-accent-subtle` | Tinted icon containers, highlight rows |
| `text-accent-subtle-fg` | Text inside accent-subtle backgrounds |

### Status (milestone only)
Used only in `StatusPill`. Apply via the component, not raw classes.
```
pending     → warm gray   (bg-status-pending-bg / text-status-pending-fg)
in_progress → blue        (bg-status-in-progress-bg / text-status-in-progress-fg)
in_review   → amber       (bg-status-in-review-bg / text-status-in-review-fg)
approved    → green       (bg-status-approved-bg / text-status-approved-fg)
```
Each status also has a `--color-status-{status}-dot` token for the indicator dot.

### Shadows
| Class | Use for |
|---|---|
| `shadow-card` | Card resting state — warm, subtle |
| `shadow-card-raised` | Card hover state — more elevated |

---

## Typography

| Class | Font | Use for |
|---|---|---|
| `font-display` | Barlow Condensed 700 | Display headings only — always pair with `uppercase tracking-tight leading-none font-bold` |
| `font-sans` | Barlow | Everything else: body, UI labels, buttons, captions |

**Page hero pattern** — reserved for content that earns the scale. Use at the top of pages where the primary subject is a real noun: a project name, a client name, a section title, a login welcome. Never use it for the app name as a decorative splash.

```tsx
<p className="font-sans text-xs uppercase tracking-widest text-text-muted mb-4">
  The Scaler Studio          {/* quiet eyebrow — context, not headline */}
</p>
<h1 className="font-display text-7xl font-bold uppercase leading-none tracking-tight text-text sm:text-8xl">
  Acme Corp                  {/* the real subject — client or project name */}
</h1>
```

Good uses: client name on the project dashboard, project title on the detail page, section name on a deep settings screen, "Welcome back" on login.  
Bad use: repeating "Studio Portal" (the app name) on every page — that's a logo, not a heading.

**Body / UI pattern:**
```tsx
<p className="font-sans text-base text-text">Body copy</p>
<p className="font-sans text-sm text-text-secondary">Supporting copy</p>
<p className="font-sans text-xs font-semibold uppercase tracking-widest text-text-muted">Label</p>
```

**Rule:** `font-sans` is the default (set on `body`). `font-display` is opt-in for hero/display headings. Never use system fonts or raw weight values.

---

## Motion & Transitions

All transitions use a premium exit ease `cubic-bezier(0.22, 1, 0.36, 1)` set globally via `--default-transition-timing-function` in `globals.css`. Smooth, not bouncy. No snappy quick-ease.

| Element | Classes | Effect |
|---|---|---|
| Button (primary/secondary) | `transition-all duration-300` | Hover: `-translate-y-px shadow-sm`. Press: `translate-y-0 shadow-none` |
| Button (ghost) | `transition-all duration-300` | Color/bg only, no lift |
| Card | `transition-all duration-300` | Hover: `-translate-y-1 shadow-card-raised` |
| StatusPill | `transition-colors duration-200` | Color swap only |
| Input | `transition-colors duration-200` | Focus ring transitions |

**Reduced motion:** The global `@media (prefers-reduced-motion: reduce)` block in `globals.css` sets all transition durations to `0.01ms`. Never force animation on reduced-motion users.

---

## Icons

Use `lucide-react` throughout. Consistent settings across all icons:

```tsx
import { FolderOpen, Sun, Moon } from "lucide-react"

// Inline UI icons (buttons, toggles)
<Moon size={16} strokeWidth={1.5} aria-hidden="true" />

// Display icons (empty states, feature illustrations)
<FolderOpen size={20} strokeWidth={1.5} />
```

- `strokeWidth={1.5}` always — refined and airy (Lucide default 2 is heavier)
- `size={16}` for inline UI, `size={20}` for display contexts
- `aria-hidden="true"` on decorative icons; add `aria-label` when the icon conveys meaning without adjacent text

---

## Focus styles

Consistent pattern across all interactive elements:
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
```
Never remove focus styles. Never substitute with `outline-none` alone.

---

## Components

All in `/components`. Import by path — there is no barrel export.

### Button
```tsx
import { Button } from "@/components/button"

<Button variant="primary">Save</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost">Dismiss</Button>
<Button variant="primary" size="sm">Small</Button>
<Button variant="primary" disabled>Disabled</Button>
```
- `variant`: `"primary"` | `"secondary"` | `"ghost"` (default: `"primary"`)
- `size`: `"sm"` | `"md"` | `"lg"` (default: `"md"`)
- Accepts all `<button>` HTML attributes
- Primary and secondary variants lift on hover; ghost does not

### Card
```tsx
import { Card, CardHeader, CardContent } from "@/components/card"

<Card>
  <CardHeader>
    <div className="flex items-start justify-between gap-2">
      <h3 className="font-sans text-sm font-semibold text-text">Title</h3>
      <StatusPill status="in_progress" />
    </div>
  </CardHeader>
  <CardContent>
    <p className="font-sans text-sm text-text-secondary">Description</p>
  </CardContent>
</Card>
```
Cards elevate on hover by default (`-translate-y-1 shadow-card-raised`).

### StatusPill
```tsx
import { StatusPill } from "@/components/status-pill"
import type { MilestoneStatus } from "@/components/status-pill"

<StatusPill status="pending" />
<StatusPill status="in_progress" />
<StatusPill status="in_review" />
<StatusPill status="approved" />
```
- `status`: `"pending"` | `"in_progress"` | `"in_review"` | `"approved"`
- Colors are fully theme-aware — no extra work needed

### Input
```tsx
import { Input } from "@/components/input"

<Input label="Email" type="email" placeholder="you@example.com" />
<Input label="Name" error="This field is required" />
```
- `label` is required (for accessibility — generates `htmlFor` via `useId`)
- `error` triggers red border + ring + `role="alert"` message
- Accepts all `<input>` HTML attributes

### EmptyState
```tsx
import { EmptyState } from "@/components/empty-state"
import { FolderOpen } from "lucide-react"

<EmptyState
  icon={<FolderOpen size={20} strokeWidth={1.5} />}
  title="No projects yet"
  description="Supporting copy goes here."
  action={<Button variant="primary" size="sm">CTA</Button>}
/>
```
- `icon` — Lucide icon at `size={20} strokeWidth={1.5}`, rendered in an amber-tinted circle
- `action` — optional CTA, usually a Button

### ThemeToggle
```tsx
import { ThemeToggle } from "@/components/theme-toggle"

<ThemeToggle />
```
- Client component. No props needed.
- Uses CSS visibility swap (`dark:hidden` / `hidden dark:inline-flex`) — no mount guard or state, no hydration mismatch.

---

## Hard rules

1. **Never hardcode colors.** Use Tailwind token classes (`bg-surface-card`, `text-text-secondary`, etc.).
2. **Never use Tailwind's default palette** (blue-500, gray-300, etc.) for semantic colors.
3. **`font-sans` everywhere; `font-display` for display headings only.** Display headings always get `uppercase tracking-tight leading-none font-bold`.
4. **Every interactive element needs visible focus styles.** Use the standard ring pattern above.
5. **Every screen needs loading, empty, and error states.** `EmptyState` is for the empty state.
6. **Semantic HTML always.** `<button>` not `<div onClick>`. `<label>` paired with `<input>`. Heading hierarchy matters.
7. **Icons from lucide-react only.** No hand-rolled SVGs. Consistent `strokeWidth={1.5}`.
