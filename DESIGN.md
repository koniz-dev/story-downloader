---
name: Social Downloader
version: 1.0.0
description: >-
  Design system for koniz-dev/social-downloader — a free, no-signup web app
  that downloads public Instagram / Facebook / TikTok media (Reels, Posts,
  IGTV, fb.watch, photo slideshows). The aesthetic is "trustworthy utility":
  glass surfaces over an animated neon mesh, fluid typography, light/dark
  parity, 5-language i18n, WCAG AA contrast, and motion-reduce respect on
  every animation.

colors:
  # All values are RGB triplets (space-separated) because the runtime is
  # `rgb(var(--token) / <alpha>)` in Tailwind. Hex equivalents are in the
  # prose section below for design-tool consumption.
  light:
    bg:
      base: "250 250 252"          # #FAFAFC — page canvas
      raised: "255 255 255"        # #FFFFFF — cards, modals, inputs
      sunken: "244 244 248"        # #F4F4F8 — skeleton fill, inset surfaces
      overlay: "255 255 255"       # #FFFFFF — popovers, dropdowns
    border:
      subtle: "226 228 235"        # #E2E4EB — default 1px borders
      strong: "203 207 218"        # #CBCFDA — emphasised borders
    fg:
      primary: "17 24 39"          # #111827 — body + headings
      secondary: "71 85 105"       # #475569 — supporting copy
      muted: "100 116 139"         # #64748B — captions, placeholders
      inverse: "255 255 255"       # #FFFFFF — text on dark fills
    accent:
      default: "79 70 229"         # #4F46E5 — indigo-600
      hover: "67 56 202"           # #4338CA — indigo-700
      soft: "224 231 255"          # #E0E7FF — indigo-100 (tint backgrounds)
      ring: "99 102 241"           # #6366F1 — focus ring
      fg: "255 255 255"            # #FFFFFF — text on accent fills
      secondary: "147 51 234"      # #9333EA — purple-600, complement to accent
    status:
      danger: "220 38 38"          # #DC2626 — red-600
      danger-soft: "254 226 226"   # #FEE2E2 — red-100
      warning: "146 64 14"         # #92400E — amber-800 (NOT 700 — see Do's & Don'ts)
      warning-soft: "254 243 199"  # #FEF3C7 — amber-100
      success: "5 150 105"         # #059669 — emerald-600
      success-soft: "209 250 229"  # #D1FAE5 — emerald-100
    neon:
      stop-1: "99 102 241"         # #6366F1 — indigo
      stop-2: "168 85 247"         # #A855F7 — purple
      stop-3: "236 72 153"         # #EC4899 — pink
      stop-4: "56 189 248"         # #38BDF8 — sky
    glass:
      bg: "255 255 255"            # surface tint
      border: "15 23 42"           # slate-900 — applied with low alpha
      bg-alpha: 0.7
      border-alpha: 0.12
    shadow-color: "15 23 42"       # slate-900 — applied with low alpha for soft shadows

  dark:
    bg:
      base: "2 6 23"               # #020617 — slate-950, page canvas
      raised: "15 23 42"           # #0F172A — slate-900
      sunken: "30 41 59"           # #1E293B — slate-800
      overlay: "30 41 59"          # #1E293B
    border:
      subtle: "51 65 85"           # #334155 — slate-700
      strong: "71 85 105"          # #475569
    fg:
      primary: "241 245 249"       # #F1F5F9 — slate-100
      secondary: "203 213 225"     # #CBD5E1 — slate-300
      muted: "148 163 184"         # #94A3B8 — slate-400
      inverse: "15 23 42"          # #0F172A — text on light fills
    accent:
      default: "129 140 248"       # #818CF8 — indigo-400 (raised for dark contrast)
      hover: "165 180 252"         # #A5B4FC — indigo-300
      soft: "49 46 129"            # #312E81 — indigo-900
      ring: "129 140 248"          # #818CF8
      fg: "15 23 42"               # #0F172A — text on accent fills (inverted)
      secondary: "192 132 252"     # #C084FC — purple-400
    status:
      danger: "248 113 113"        # #F87171 — red-400
      danger-soft: "127 29 29"     # #7F1D1D — red-900
      warning: "252 211 77"        # #FCD34D — amber-300 (dark mode contrast)
      warning-soft: "120 53 15"    # #78350F — amber-900
      success: "52 211 153"        # #34D399 — emerald-400
      success-soft: "6 78 59"      # #064E3B — emerald-900
    neon:
      stop-1: "129 140 248"        # indigo-400
      stop-2: "192 132 252"        # purple-400
      stop-3: "244 114 182"        # pink-400
      stop-4: "103 232 249"        # cyan-300
    glass:
      bg: "15 23 42"
      border: "148 163 184"
      bg-alpha: 0.45
      border-alpha: 0.18
    shadow-color: "0 0 0"

  brand:
    # Platform brand marks — used only on PlatformSelector logos / chips and
    # never as UI accent. Keep verbatim; these are external trademarks.
    instagram: "#E1306C"
    facebook: "#1877F2"
    tiktok-cyan: "#25F4EE"
    tiktok-red: "#FE2C55"

typography:
  # All sizes are FLUID via CSS clamp(min, preferred, max). The min anchors
  # mobile readability; the max prevents over-scaling on 4K displays. Line
  # heights tighten as size grows to keep block rhythm.
  fontFamily:
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace"
  fontFeatureSettings: "'cv11', 'ss01'"   # Inter alternate-glyph features (graceful no-op on fallback fonts)
  scale:
    xs:   { size: "clamp(0.75rem,  0.72rem + 0.15vw, 0.8125rem)",  lineHeight: 1.4  }   # captions, chips
    sm:   { size: "clamp(0.875rem, 0.84rem + 0.18vw, 0.9375rem)",  lineHeight: 1.5  }   # secondary
    base: { size: "clamp(1rem,     0.96rem + 0.22vw, 1.0625rem)",  lineHeight: 1.55 }   # body
    lg:   { size: "clamp(1.125rem, 1.05rem + 0.4vw,  1.25rem)",    lineHeight: 1.5  }   # lead
    xl:   { size: "clamp(1.25rem,  1.1rem  + 0.7vw,  1.5rem)",     lineHeight: 1.4  }
    2xl:  { size: "clamp(1.5rem,   1.25rem + 1.2vw,  1.875rem)",   lineHeight: 1.3  }   # h2
    3xl:  { size: "clamp(1.875rem, 1.5rem  + 1.7vw,  2.25rem)",    lineHeight: 1.2  }   # h1
  fontWeights:
    regular: 400
    medium: 500
    semibold: 600
    bold: 700

spacing:
  # Tailwind default rem scale. Anything called out here is project-specific.
  page-x: "max(1rem, env(safe-area-inset-left)) | max(1rem, env(safe-area-inset-right))"
  safe:
    top: "env(safe-area-inset-top)"
    bottom: "env(safe-area-inset-bottom)"
    left: "env(safe-area-inset-left)"
    right: "env(safe-area-inset-right)"
  touch-target-min: "44px"          # WCAG 2.5.5 — never go below on tap surfaces

rounded:
  sm: "0.375rem"     # tailwind md — chips, tags
  md: "0.5rem"       # tailwind lg — small buttons, inputs
  lg: "0.75rem"      # tailwind xl-base
  xl: "0.875rem"     # custom — alert blocks
  "2xl": "1.125rem"  # custom — cards, glass panels
  "3xl": "1.5rem"    # custom — hero containers (rare)
  full: "9999px"     # pills, chips, language selector

elevation:
  # Two shadow tokens only. Anything outside this scale is a mistake; use
  # `card` for resting state and `pop` for hover/active emphasis.
  card: "0 1px 2px rgb(var(--shadow-color) / 0.06), 0 4px 12px rgb(var(--shadow-color) / 0.04)"
  pop:  "0 4px 16px rgb(var(--shadow-color) / 0.10), 0 12px 32px rgb(var(--shadow-color) / 0.08)"
  glow-accent: "0 0 0 1px rgb(var(--glow) / 0.25), 0 8px 32px rgb(var(--glow) / 0.35)"

motion:
  # Every animation MUST have a `prefers-reduced-motion` variant that disables
  # or neutralises it. No exceptions — see Do's & Don'ts.
  duration:
    instant: "0ms"
    fast: "200ms"     # color/transform on buttons + cards
    base: "320ms"     # toast entrance
    slow: "500ms"     # fadeUp entrance
    ambient: "60s"    # background mesh drift
  easing:
    standard: "ease-out"
    overshoot: "cubic-bezier(0.2, 0.8, 0.2, 1)"   # toast lift
  presets:
    fadeUp:         "translateY(8px) → 0, opacity 0 → 1, 500ms ease-out"
    toastUp:        "translateY(16px) scale(0.96) → 0, 320ms overshoot"
    shimmer:        "primary button highlight, 2600ms loop"
    skeletonShimmer: "loading state, 1400ms loop"
    meshDrift:      "ambient bg, 60s loop, ±2% translate + 1.05 scale"

components:
  # High-level component recipes — values bind to other tokens above.
  glassPanel:
    background: "rgb(colors.{mode}.glass.bg / colors.{mode}.glass.bg-alpha)"
    backdropFilter: "blur(16px) saturate(140%)"
    border: "1px solid rgb(colors.{mode}.glass.border / colors.{mode}.glass.border-alpha)"
    rounded: "2xl"
    elevation: "card → pop on hover"
  glassPanelStrong:
    background: "rgb(colors.{mode}.glass.bg / 0.85)"
    backdropFilter: "blur(24px) saturate(180%)"
    usage: "sticky header only — opaque enough to read scrolling content through"
  primaryButton:
    background: "colors.{mode}.accent.default"
    foreground: "colors.{mode}.accent.fg"
    rounded: "md"
    minHeight: "44px"
    decoration: "btn-shimmer (diagonal highlight loop while idle, disabled on `:disabled`)"
    focusRing: "ring-2 ring-accent-ring offset-2"
  downloadButton:
    background: "colors.{mode}.status.success"
    foreground: "#FFFFFF (verbatim — green-on-white is the affordance everywhere)"
    rounded: "lg"
    minHeight: "44px"
  card:
    base: "glassPanel + animate-fadeUp on mount"
    media:
      aspectRatio: "9/16"
      maxHeight: "70vh"
      fit: "object-contain (NEVER cover — would crop user content)"
      backdrop: "bg-bg-sunken (placeholder before media loads)"
    badge:
      position: "absolute top-2 left-2"
      style: "px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 backdrop-blur text-white uppercase"
  chip:
    rounded: "full"
    paddingX: "0.625rem"
    paddingY: "0.25rem"
    text: "text-[11px] font-medium"
    variants:
      success: "border-success/30 bg-success/10 text-emerald-800 dark:text-emerald-300"
      accent: "border-accent/30 bg-accent/10 text-accent"
      neutral: "border-border-subtle bg-bg-raised/40 text-fg-secondary"
  input:
    background: "colors.{mode}.bg.raised"
    border: "border-subtle, focus border-accent-ring"
    rounded: "md"
    minHeight: "44px"
    paddingX: "0.875rem"
  toast:
    position: "fixed bottom + safe-bottom"
    animation: "toastUp"
    elevation: "pop"
  background-mesh:
    type: "fixed full-viewport pseudo-element behind content"
    composition: "4 radial gradients using neon.stop-1..4 at ~15-18% alpha"
    motion: "60s drift loop, disabled under prefers-reduced-motion"
    pointerEvents: "none"
---

## Overview

Social Downloader is a small utility web app: paste a public link from
Instagram, Facebook, or TikTok, get a downloaded file. The UI exists to do
exactly four things in order:

1. **Tell the user it's free, private, no-signup.** (footer chips + value
   chips in the header)
2. **Pick a platform.** (3-card chooser)
3. **Paste a URL.** (single field or bulk textarea)
4. **Show the resulting media + a single big Download button.**

Everything else (theme toggle, language switcher, guides, error alerts,
bulk-mode toggle) is secondary chrome around this golden path. **Visual
priority must always reflect that hierarchy** — a redesign that buries the
URL input or makes the Download button less prominent is wrong even if it
looks nice.

Audience: anonymous, mobile-first, multilingual (en/vi/ja/ko/zh). Average
session is under 30 seconds. Users will not learn the UI; the UI must work
on first sight.

Aesthetic shorthand: **"calm utility over warm glass"**. Glass panels on a
slow-drifting neon mesh; neutral text; one bright accent for primary
actions; one bright green for downloads (the affordance the user is here
for).

## Colors

### Mode parity is mandatory

Every token has a `light` and `dark` pair. Never hard-code a hex in a
component — always resolve through the semantic name. Light is the default;
dark is opt-in via `html.dark`, set by the theme toggle (system / light /
dark, persisted in `localStorage` under `sd.theme`).

### Roles, not hues

- **Backgrounds** are a 4-tier scale: `bg.base` (canvas) ⟶ `bg.raised`
  (panels) ⟶ `bg.sunken` (insets, skeleton fills) ⟶ `bg.overlay`
  (dropdowns). Never re-purpose between tiers.
- **Foregrounds** are 4 tokens: `fg.primary` (≥7:1 on `bg.base`),
  `fg.secondary` (≥4.5:1), `fg.muted` (≥4.5:1, smaller text only),
  `fg.inverse` (text on dark/accent fills).
- **Accent** is the indigo/purple family. **Use accent for chrome and
  affordances that are NOT the download** (focus rings, selected
  platform card, primary button shimmer). Reserve **success** green for
  the actual download button — it's the one moment in the flow where the
  user is about to get value.

### Status colors

- **danger** for fatal errors only (resolve failed, network down). Inline
  alerts use `danger-soft` background with `danger` text + border.
- **warning** for degraded results (e.g. only thumbnail available, no
  video). Light-mode warning is **amber-800 (#92400E)**, not amber-700 —
  amber-700 on `warning-soft` background hits 4.26:1, which fails WCAG AA
  (target 4.5:1). The audit is in `frontend/src/index.css` line 28.
- **success** is the download CTA. Don't use it for general "ok" states.

### Neon mesh background

Four radial gradients in `--neon-1..4` are layered on a `position:fixed`
pseudo-element behind everything, with a 60s drift animation. Total alpha
across all four is kept ≤0.18 so it never competes with foreground content.
In dark mode the same hue families shift cyan-ward for contrast.

### Platform brand colors

`#E1306C` (Instagram), `#1877F2` (Facebook), `#25F4EE` + `#FE2C55` (TikTok
duotone). Only ever applied to the PlatformSelector card logos / hover
glows. Never use them as UI accents — they're external trademarks.

## Typography

System fonts only — no web font, no FOIT, no extra request. Every size is
**fluid** via `clamp(min, preferred, max)`:

```
xs   12px → 13px
sm   14px → 15px
base 16px → 17px
lg   18px → 20px
xl   20px → 24px
2xl  24px → 30px
3xl  30px → 36px
```

The 16-base anchor is non-negotiable on mobile — anything smaller for body
copy fails legibility audits.

**Hierarchy:** the gradient hero h1 uses `3xl` collapsing to `base` when
the header is scrolled (see `scrolled` state in `App.tsx`). Step headers
use `sm` semibold; helper / caption text is `xs` muted; chips are `xs` /
11px medium.

**Weight ladder:** 400 body → 500 chips/labels → 600 buttons/step headers
→ 700 hero. Don't use 800/900 — feels heavy against the airy glass.

## Layout

- **Container max-width: `max-w-3xl` (48rem / 768px).** The app is single-
  column at all viewports; this is intentional, not a missed opportunity for
  a 2-column desktop layout. Pasting a URL doesn't benefit from horizontal
  real estate.
- **Page padding:** `.px-page` = `max(1rem, env(safe-area-inset-{left,right}))`.
  Always at least 16px, respects landscape-notched iPhones. **Do not** pair
  `px-4` with `pl-safe-l pr-safe-r` on the same element — Tailwind
  specificity makes the safe-area utilities collapse to 0 on non-notched
  phones.
- **Vertical rhythm:** sections use `space-y-5 sm:space-y-6`. Stack header
  inside sections uses `space-y-3`. Cards inside results grid use `gap-4`.
- **Sticky header** uses `glass-strong` (opaque-ish blur) and switches to a
  compact mode (`data-compact="true"`) once the page scrolls 80px. Compact
  mode hides the subtitle + chips on mobile to reclaim ~80px of viewport.

## Elevation & Depth

Two shadow tokens, in order of use:

- **`shadow-card`** — resting elevation on glass cards, chips, result cards.
- **`shadow-pop`** — hover/active emphasis, toasts, modals.
- **`glow-accent`** — focus glow on primary CTAs only. Never on text inputs
  (use the ring instead — glow on input edges looks like an error state).

The mesh background fakes a third "ambient" depth layer behind everything.
Don't add a fourth — `glass` + `shadow-card` + mesh already creates enough
visual layering.

## Shapes

- Pills (`rounded-full`) for tags, chips, theme toggle, language selector.
  They imply "compact, optional, dismissible".
- `rounded-2xl` (18px) is the project's house round — cards, glass panels,
  hero containers.
- `rounded-lg` (12px) for inputs and the Download button — slightly squarer
  to feel "actionable", not "decorative".
- Never use `rounded-3xl` outside the hero-level container of a marketing
  page. Anything that big on a card reads as juvenile.

## Components

### PlatformSelector (Step 1)

Three glass cards in a 1-column-mobile / 3-column-desktop grid. Selected
state shows an accent check badge top-right + accent-ring focus. Hover lifts
the card 2px (skipped under `motion-reduce`). Pressed state scales to 0.99.
Each card carries the platform's logo (brand color) + name + one-line hint
("Reel, Post, IGTV", etc.).

### UrlForm (Step 2)

One large input with a Paste button on the right. Validates platform live
on every keystroke once the user has touched the field; switching to a
mismatched platform suggests `onPlatformSwitch` rather than rejecting. The
**Download** button is `bg-success`, full-width on mobile, auto-width on
desktop, min-height 44px. Bulk mode swaps the input for a `<textarea>` that
accepts newline-separated URLs.

### MediaCard (Step 3 results)

Glass card, `aspect-9/16` media area with `object-contain` (never `cover` —
cropping user content is unacceptable for a download tool), `max-h-70vh`
ceiling so portrait videos don't overflow the fold. Type badge ("VIDEO" /
"IMAGE") top-left in a black/70-alpha pill. Caption row beneath: source URL
ellipsised on the left, big green Download button on the right (full-width
under sm:).

### Feedback

- **ErrorAlert** — `danger-soft` background + `danger` border + close
  button. Shows the localised message, the error code (small, muted), and
  the requestId (selectable, for bug reports).
- **Toast** — bottom-fixed, glass + `shadow-pop`, `animate-toastUp`. Three
  variants: default, success (green left border), error (red left border).
- **Skeleton** — `skeleton-shimmer` on a `bg-sunken` rectangle. Matches
  the aspect ratio of the real MediaCard so layout doesn't jump on swap-in.

### Step indicators

Numbered circles in a horizontal row at the top of each section: `pending`
(muted), `active` (accent ring + filled), `completed` (success check). Step
header text is `sm semibold` tracking-tight.

## Do's and Don'ts

### Do

- **Resolve every color through a semantic token** — `bg-bg-base`,
  `text-fg-primary`, `bg-accent`. Hex literals in components are a
  code-review block.
- **Pair every animation with a `motion-reduce:` variant** that disables or
  neutralises it. Users with vestibular sensitivities deserve a working app,
  not a stripped-down one — design the motion so the reduced version is
  still complete.
- **Keep tap targets ≥44px** on mobile (WCAG 2.5.5). The min-height utility
  is the easy answer; resist the temptation to "make it smaller, looks
  cleaner" on a button row.
- **Lead with the verb the user came for** — every primary CTA reads
  "Download", "Tải về", "ダウンロード", etc. Never "Submit", "Go", "Continue".
- **Pin contrast at WCAG AA (4.5:1 body, 3:1 large)** — and verify, not
  guess. Warning amber is the canonical example: amber-700 looks fine, fails
  the audit at 4.26:1; amber-800 passes.
- **Use `glass` on top of mesh, never `bg-raised` on top of mesh** — the
  flat fill breaks the depth illusion. `bg-raised` is for panels OUTSIDE
  the mesh container (modals over an opaque scrim, etc.).

### Don't

- **Don't introduce a new accent color.** One indigo accent + one secondary
  purple = the entire palette outside status colors. A "softer accent" is
  almost always solved by reducing alpha on the existing accent, not adding
  a new hue.
- **Don't crop user content.** `object-contain`, always, in media surfaces.
  Even if the result looks "less full". Users pasted that URL because they
  want THAT image, not a recomposed one.
- **Don't gate the Download button behind a tooltip or confirmation
  modal.** One click from "I see my media" to "file is in Downloads/".
  Anything else loses the user.
- **Don't render shadows over the mesh.** Heavy shadows fight the radial
  gradients. Glass panels carry their own border + blur; that's enough
  separation.
- **Don't use platform brand colors as UI accents.** `#E1306C` on a button
  is a bug, not a design choice. Brand colors only live on the platform
  logos themselves.
- **Don't autoplay media.** Posters with a center play button are the only
  acceptable affordance — autoplay burns mobile data and surprises users.
- **Don't put error text in red text on a danger-soft background without
  also showing an icon.** Red-green colorblind users see a beige rectangle.
