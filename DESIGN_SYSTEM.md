# Design system — Imam Zain Alabideen CMS

> نظام إدارة محتوى مؤسسة الإمام زين العابدين للبحوث والدراسات

Two-word identity: **scholarly density + spiritual warmth**.

The CMS must read as a tool that **belongs to a religious-research institution** —
not a generic SaaS dashboard tinted green. It must also feel **made for a power
user**: information-dense, fast to scan, keyboard-friendly.

This document is the contract for future work. When you add a screen or component,
hold it against the rules here before you ship.

---

## 1. Foundations

### 1.1 Color tokens — `src/app/globals.css`

All colors are stored as HSL channel-only values so they compose with alpha via
`hsl(var(--token) / 0.x)`.

| Token                  | Value                | Role                                    |
|------------------------|----------------------|-----------------------------------------|
| `--primary`            | `169 100% 20%` `#006654` | Deep emerald — brand, primary CTA, links, active nav |
| `--primary-soft`       | `169 35% 94%`         | Soft emerald wash for chips, hover bg   |
| `--primary-strong`     | `169 100% 14%`        | Pressed / darker hover                  |
| `--secondary`          | `35 40% 56%` `#bb9661` | Warm gold — featured/starred items, premium chips. **Used sparingly.** |
| `--secondary-soft`     | `35 50% 94%`          | Gold chip background                    |
| `--background`         | `210 25% 98%`         | App shell                                |
| `--surface`            | `0 0% 100%`           | Cards, panels                            |
| `--surface-muted`      | `210 30% 96%`         | Zebra rows, recessed inputs             |
| `--surface-elevated`   | `0 0% 100%`           | Modals, popovers                         |
| `--foreground`         | `210 24% 12%`         | Body text                                |
| `--foreground-muted`   | `215 16% 47%`         | Secondary text, table meta              |
| `--foreground-subtle`  | `215 14% 60%`         | Placeholders, icons-at-rest             |
| `--accent`             | `169 35% 94%`         | Soft emerald wash for active nav, focus tints |
| `--border` / `--border-strong` | `214 25% 90%` / `214 22% 82%` | Hairlines; never thicker than 1px |
| `--ring`               | `169 100% 20%`        | Focus ring base                          |
| `--ring-strong`        | `35 40% 56%`          | Gold ring for premium actions           |

**Semantic — tonal variants, not raw Tailwind hues:**

| Token        | Use                                |
|--------------|------------------------------------|
| `--success`  | `158 64% 32%` — published, completed, active |
| `--warning`  | `35 82% 46%` — pending, attention needed (brand-adjacent gold) |
| `--info`     | `205 70% 42%` — new, informational  |
| `--danger`   | `0 72% 46%` — destructive, errors, spam |

Each ships with a `*-soft` (chip bg) and `*-foreground` (text on chip) sibling.

**Ornament:** `--ornament` and `--ornament-gold` drive the geometric pattern fills.

### 1.2 Type

| Role          | Family                | Weight        | Notes                              |
|---------------|-----------------------|---------------|------------------------------------|
| Body (Arabic) | **Noto Naskh Arabic** | 400           | Long-form text, table cells, labels |
| Headings      | **Noto Naskh Arabic** | 600 / 700     | Hierarchy via weight + size on ONE family — Reem Kufi was tried and dropped for readability |
| Latin fallback| **Inter**             | 400 / 500 / 600 | Latin runs inside Arabic body    |
| Mono          | **JetBrains Mono / ui-monospace** | 400 / 500 | Code, IDs, `kbd`, audit-log action tokens |

Fonts are loaded via `next/font/google` in `src/app/layout.tsx` and exposed as
`--font-arabic` / `--font-latin`. `--font-display` aliases to the same Naskh face.

**Scale (px):** 11 → 12 → 14 → 16 → 18 → 20 → 24 → 30 → 36 → 48.
Line-heights: `1.2` for display, `1.55–1.65` for body.

### 1.3 Numerals — the rules that bit us

- **Human-facing counts** use Arabic-Indic digits (`٠١٢٣٤٥٦٧٨٩`).
- **Thousands separator** is the LATIN comma (e.g. `١,٢٨٤`), not the Arabic
  `٬` — `٬` reads as a stray letter in Naskh. This is the most important
  numerals rule and it took a few rounds to land on.
- **Width-aligned stats** (table sort, column totals) get `tabular-nums` plus
  the `.arabic-nums` utility for slight letter-spacing tightening.

Use the helpers in `src/lib/dates.ts`:

```ts
import { formatArNumber, toArabicDigits, safeFormat } from "@/lib/dates"

formatArNumber(1284)                                  // "١,٢٨٤"
toArabicDigits(safeFormat(p.created_at, "dd/MM/yyyy")) // "٠٢/٠٩/٢٠٢٥"
```

### 1.4 Spacing & geometry

- 4-pt rhythm: `4 8 12 16 20 24 32 40 48 64`.
- **Forms use tighter vertical rhythm**: fields `py-1.5` (not `py-2`),
  label-to-input gap `space-y-1`, `space-y-6` between field *groups*.
- **Radii**: base `--radius` `0.625rem` (10px). Inputs 8px. Chips/pills 6px.
  Modals/hero panels 12–16px.
- **Borders**: 1px hairlines at `--border`. Tables use `divide-y`, not full grids.

### 1.5 Shadows & motion

Shadows are brand-tinted (emerald cast), never OS gray:

- `--shadow-soft` — cards at rest
- `--shadow-raise` — hover/lifted, modal headers
- `--shadow-pop` — modals, dropdowns, popovers
- Focus ring via `:focus-visible` is 2px emerald, 2px offset.

Motion is utility-driven, never bouncy:

- `.animate-fade-in` (220ms)
- `.animate-scale-in` (220ms)
- `.animate-slide-up` (260ms)
- `.shimmer` replaces `animate-pulse` for skeletons (1.6s left-to-right sweep)

No spring physics, no Lottie, no page transitions.

---

## 2. Ornament

Geometric Islamic ornament is **chrome texture**, never decoration on top of
content. The asset set lives in `public/brand/ornaments/`:

- `eight-star-tile.svg` / `-gold.svg` — eight-pointed star tessellation (the
  default; what `.ornament-tile` resolves to).
- `arabesque-tile.svg` — interlace pattern (longer rhythm); use via
  `.ornament-tile--arabesque`.
- `medallion.svg` — single-glyph centerpiece (rarely needed; the institution
  logo serves this role on dividers).

**Where to use ornament**

- ✅ Hero panels (~6–8%, filter inverted for white-on-emerald)
- ✅ Login splash (10% on the emerald half)
- ✅ Empty states (3–5%, behind the icon disc)
- ✅ Sidebar wordmark area (low-alpha wash)

**Where NOT to use ornament**

- ❌ Tables, dense list pages, forms — these stay quiet so the data leads.
- ❌ On top of body content — never as a decorative overlay.
- ❌ Photos/imagery — images are shown as-is.

**Tile size matters** — always set `background-size` to the SVG's intrinsic
viewBox (96px for the star tile, 160px for arabesque). Compress them and stars
overlap at tile boundaries; this is a hard-won lesson.

### Dividers

- `.divider-brand` — emerald → gold gradient hairline. Section separators.
- `.ornament-divider` — centered logo medallion between hairlines. Reserved
  for major section breaks on Dashboard/Login. **The logo serves as the
  ornament here**, not the abstract medallion.

---

## 3. Components — rules

Primitives live in `src/components/ui/`. Improve them in place — never wrap
them in another abstraction.

### Button (`Button.tsx`)

| Variant         | Use                                              |
|-----------------|--------------------------------------------------|
| `primary`       | Default. Emerald fill, white text.               |
| `secondary`     | Neutral white-on-border. Cancel-row.             |
| `secondaryBrand`| **Gold fill**. Reserved for premium/featured CTAs ONLY. |
| `outline`       | Emerald outline, transparent. Soft alternatives. |
| `soft`          | Emerald wash, low affordance.                    |
| `danger`        | Destructive — uses `--danger` token.             |
| `ghost`         | Inline, no background until hover.               |

Icons inside buttons use `strokeWidth={1.6}`. Loading spinner replaces both icons.

### Input (`Input.tsx`)

- `py-1.5` for tighter form rhythm. Left-icon (`leftIcon` prop) sits in the
  start gutter at `text-foreground-subtle` until focus → emerald.
- Required marker is a `--danger` asterisk.
- Help text and error use `--foreground-muted` and `--danger`.

### Badge (`Badge.tsx`)

Tonal pills driven by semantic tokens:

| Variant   | Background           | Text                        |
|-----------|----------------------|-----------------------------|
| `success` | `--success-soft`     | `--success-foreground`      |
| `warning` | `--warning-soft`     | `--warning-foreground`      |
| `info`    | `--info-soft`        | `--info-foreground`         |
| `error`   | `--danger-soft`      | `--danger-foreground`       |
| `secondary` | `--secondary-soft` | `--secondary-strong`        |
| `primary` | `--primary-soft`     | `--accent-foreground`       |
| `default` | `--surface-muted`    | `--foreground-muted`        |
| `outline` | transparent          | `--foreground-muted`        |

`size="md"` for prominent labels (13px text, 13px icon, 6px gap so they read
distinctly). `size="sm"` for inline-in-row pills.

### Card (`Card.tsx`)

Default: white surface, `--shadow-soft`, 10px radius, hairline border. Header
slot uses a small emerald accent rule next to the title — that's the brand
voice on every card header.

### Modal (`Modal.tsx`)

Centered, `max-w-lg` for forms, `max-w-md` for confirms. Scrim is
`hsl(var(--foreground) / 0.5)` with **no blur** — keeps focus on the modal
and preserves perf on long forms.

### EmptyState (`EmptyState.tsx`)

Quiet by default. Icon sits in a soft emerald disc over a faint ornament
tile (~4% opacity). `variant="card"` wraps in a white panel.

---

## 4. Layout chrome

- **Sidebar**: fixed on the RIGHT at `w-64` (RTL), white surface, border-l.
  Header wordmark is the logo + "مركز إدارة المحتوى" with the foundation
  tagline below. Section titles are Arabic Naskh at 11.5px / 600 / full-foreground
  (NOT uppercase Latin-mono — that was barely visible). Nav labels weight 500;
  active state weight 600; icon stroke 1.6.
- **Header**: sticky top, 64px, hairline border-b. Page title sits left of
  the user menu.
- **Filter bars** on list pages: `.surface-soft`, sticky below the header at
  `top: 4rem` (64px).
- **Bulk-action bar**: sticky at the top of the viewport when rows are
  selected, with `--shadow-raise`.

---

## 5. List pages — density rules

Operator-facing lists (Posts, Books, Papers, Gallery, all inboxes) **default
to a dense table** with a card-grid toggle in the toolbar. The persistence
key is `localStorage["posts:view"]` (and parallel for other resources).

Table rules:

- Sticky `<thead>` at the top of the table (under the sticky filter bar).
- Zebra rows in `--surface-muted` at 40% alpha.
- Selected rows in `--accent`.
- Row hover: `--surface-muted`.
- Status pill: `Badge` semantic variant + `dot`.
- Action icons: 13–14px at stroke 1.6, 75% opacity, full on hover.
- Dates: `dd / MM / yyyy` (spaced) via `safeFormat` → `toArabicDigits`.

Empty states use the shared `EmptyState` with a contextual icon — never a
custom one-off layout.

---

## 6. Voice & copy

| Pattern              | Example                       | Rule                              |
|----------------------|-------------------------------|-----------------------------------|
| Page title           | `المقالات`                    | Plain noun. No "Posts page".      |
| Primary action       | `مقالة جديدة` · `كتاب جديد`   | `<noun> + <new/upload>`.          |
| Empty state          | `لا توجد مقالات بعد`          | Negation + noun + state adverb.   |
| Confirm dialog       | `هل تريد حذف هذه المقالة؟`    | Question form, definite article.  |
| Success toast        | `تم إنشاء المستخدم`           | `تم + <verb past>`. Never "حسناً!". |
| Error toast          | `فشل تحميل المقالات`          | `فشل + <verb>`. Generic.          |
| Status labels        | `منشور` / `مسودة`            | One or two words, no punctuation. |
| Footer attribution   | `{year} مؤسسة الإمام زين العابدين. جميع الحقوق محفوظة.` | Year via `new Date().getFullYear()`. |

**Never**: emoji, apologies in errors, Latin labels next to Arabic ones in
the same surface, "Welcome back, {firstName}! 👋" patterns.

---

## 7. Iconography

The codebase uses **Lucide React** (`lucide-react@^0.563`). Rules:

- Always Lucide. Do not mix icon sets.
- Pass `strokeWidth={1.6}` everywhere (form-input glyphs use `1.25` — slightly
  softer because the labels carry the affordance).
- Inline with text: `w-4 h-4` (16px). Nav/header: `w-5 h-5`. Stat-card icon
  wells: `w-6 h-6`. Empty-state hero: `w-7 h-7` inside a 64px disc.
- Color follows role: `text-primary` for active/branded, `--foreground-muted`
  for inert, `--danger` for destructive.

**Brand mark**: the logo lives at `/brand/logo/`:

- `logo-icon.png` — primary green raster (sidebar, header, divider ornaments)
- `logo-icon-white.png` — white variant (hero, emerald grounds)
- `logo-shape.svg` / `-white.svg` / `-gold.svg` — SVG variants

The wordmark is **"مركز إدارة المحتوى"** with the foundation tagline
**"مؤسسة الإمام زين العابدين للبحوث والدراسات"** directly below.

---

## 8. The "done" bar

A first-time visitor should sense within 5 seconds:

1. This is an **Arabic-first religious-scholarly** tool — not a generic SaaS.
2. It's **for daily operators** — dense, fast, keyboard-friendly.
3. It's **made with care** — type, spacing, ornament, motion all feel intentional.

If two of those three aren't true on the surface you're working on, iterate
on it before reviewing.
