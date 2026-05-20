# Stitch prompt — Social Downloader redesign

Paste the block below into Stitch alongside the attached `DESIGN.md`. The
prompt is calibrated to the file's tokens and tone, and tells Stitch which
constraints to honour, which screens to design, and what NOT to invent.

---

You are redesigning **Social Downloader** (repo: koniz-dev/social-downloader),
a single-purpose web app that lets visitors paste a public Instagram /
Facebook / TikTok URL and download the underlying media. Treat the attached
`DESIGN.md` as the single source of truth for the visual system — every
color, font size, radius, shadow, and motion preset must come from a token
named in that file. Do not introduce new hues, new shadow tiers, new radius
values, or web fonts. If a need arises that isn't covered by an existing
token, write a note in the design's spec sheet — do not invent.

**Product context (read once, internalise):**

- Anonymous, free, no signup, no ads, no tracking. The footer chips and
  header value chips telegraph this; do not redesign them away.
- Mobile-first (≥60% of traffic). Single-column up to `max-w-3xl` (768px).
  Do not propose a 2-column desktop layout.
- 5 languages (en / vi / ja / ko / zh). Every string in a mockup must
  accommodate Korean (longest), Vietnamese (diacritics), and CJK (wider
  glyphs). Avoid fixed-width buttons or one-line truncations on labels.
- Light, dark, and "system" theme. Every screen must be shown in BOTH light
  and dark mode using the paired tokens in `DESIGN.md`. They are not
  interchangeable — dark uses raised contrast for accents (indigo-400 vs
  indigo-600) and tones down warning colours differently.
- WCAG AA contrast is a hard requirement. The warning colour is amber-800
  for a reason — see Do's & Don'ts in `DESIGN.md`. If a colour
  combination feels close to the floor, raise the foreground; don't lower
  the background's alpha.
- Installable PWA with a share-target. Mobile share sheets hand URLs to the
  app; the URL field must look pre-fill-friendly (focus state, paste
  affordance, clear button).
- Motion: every animation has a `prefers-reduced-motion` variant. Design
  the reduced variant explicitly — a still version that still reads as
  finished, not a stripped placeholder.

**Golden path (in this exact order, on every viewport):**

1. **Header** — gradient wordmark "Social Downloader", subtitle, three
   value chips (Free · No signup · Private). Sticky; collapses to compact
   on scroll (≥80px). Right side: language selector + theme toggle.
2. **Step 1 — Pick a platform.** Three glass cards (Instagram / Facebook /
   TikTok), 1-col mobile, 3-col desktop. Logo in platform brand colour,
   name, one-line hint, selected state with accent check badge.
3. **Step 2 — Paste a URL.** Mode toggle (Single / Bulk), then either:
   - Single: large input with paste button + green Download button.
   - Bulk: textarea (newline-separated URLs) + green Process button.
4. **Step 3 — Results.** Either:
   - Single mode: 1–N MediaCards in a `repeat(auto-fit, minmax(220px,
     1fr))` grid. Each card: 9:16 media preview (`object-contain`),
     VIDEO/IMAGE badge top-left, source URL caption, big green Download
     button per card, "Download all" button above the grid when ≥2 items.
   - Bulk mode: stacked result rows (URL, status icon, error or
     download), "Download all" button above the list when ≥2 succeed.
5. **Step 3 (fallback) — Guide.** When no result + no error + not loading,
   show a CollapsibleGuide with platform-specific example URLs.
6. **Footer** — Private badge + "View source" GitHub link + copyright.

**Screens to design (mock both light + dark for each):**

- 📱 **Mobile** (390×844 baseline, iPhone 14 Pro safe-area):
  - Idle / no platform picked
  - Platform picked, empty URL field, guide visible
  - Loading state (single result skeleton, 2 cards)
  - Single-mode success (1 video MediaCard with play overlay)
  - Single-mode success (3-item carousel MediaCards)
  - Error alert (red, with code + requestId)
  - Bulk mode, 4 URLs, mixed success/failure rows
  - Sticky-header compact state mid-scroll
  - Toast: download started (success variant)
- 💻 **Desktop** (1280×800):
  - Idle / no platform picked
  - Single-mode success (3-card grid)
  - Bulk mode mid-process (progress indicator)
  - Theme switcher dropdown (system / light / dark options)
  - Language selector dropdown (5 locales)

**Affordances to preserve verbatim — do not redesign them away:**

- The animated neon mesh background (4 radials, 60s drift). It signals
  "modern but calm" and is core to the brand.
- The glassmorphism on cards and the sticky header. Drop-shadows replacing
  glass would flatten the depth hierarchy.
- The single-pass Download button in solid `success` green — this is the
  literal moment the product delivers value. It must be the visual climax
  of every results screen.
- 44px minimum touch targets. The desktop mockups should still respect
  this even though the cursor is precise.
- The `aspect-[9/16]` media frame with `object-contain`. Cropping user
  content is forbidden (see Don'ts).
- Step indicators (1, 2, 3) — they give the user a mental model of how
  short the flow is. Don't replace with a progress bar or breadcrumb.

**Anti-goals — flag any redesign suggestion that asks for these:**

- Account / signup / login of any kind.
- Subscription, upgrade, or "Pro" tier badges.
- Ads, sponsored placements, "Try our other product" cards.
- Toast notifications that demand action (cookie consent, etc.).
- Modal interrupts before reaching results.
- A homepage hero / marketing section above the platform picker.
- Carousels of "popular content" or "trending downloads".
- Any UI that requires JS-disabled fallback beyond the existing
  `<noscript>` block.

**Deliverable:**

For each screen above, output:

1. The Stitch design with all colour, type, spacing, and radius values
   bound to `DESIGN.md` tokens by name.
2. A short rationale (≤3 sentences) explaining any non-obvious choice or
   any place the spec was extended.
3. The exported HTML + Tailwind class strings, with tokens referenced as
   `bg-bg-base`, `text-fg-primary`, `bg-accent`, `bg-success`, etc., not
   raw hex.

When in doubt, choose the option that gets the user from "paste link" to
"file in Downloads/" in the fewest possible clicks, and matches what is
already in `DESIGN.md` over what looks novel. Calm utility over warm glass
— never the other way around.
