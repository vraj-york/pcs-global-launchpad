# DevCity — Design Contract

**Positioning:** The skyline where open-source reputation becomes architecture — explore, compare, and claim your place among developers worldwide.

**Personality:** modern / playful-expert / dense-at-a-glance / precise-with-warmth

**Persona:** A mid-career developer who wants to see their GitHub activity as something tangible and shareable — success is finding their building in the city and feeling proud of its height.

**Type:** Silkscreen (display/pixel branding, HUD, logo) + Inter (UI panels, stats, forms); scale: hero 48px / page 28px / section 20px / body 14px / caption 12px; rules: tracking-tight on display, tabular-nums on stats, sentence case UI labels

**Color:** brand `#22d3ee` (electric cyan — neon window glow, primary actions); neutrals cool-tinted navy scale anchored at `#0a0e1a`; tokens in index.css; dark mode is the default designed experience

**Layout:** spacing rhythm 4/8px (gap-2/4/6, p-4/6); overlay UI efficient (glass panels, compact nav); 3D canvas full-viewport; attention budget: the skyline is the focal point, UI chrome stays peripheral

**Voice:** confident, playful, developer-native; e.g. "Your commits built this skyline" / "No building yet — claim yours and watch it rise."

**Signature moment:** The interactive 3D pixel-art skyline where building height = contributions, width = repos, and lit windows = stars — fly between buildings and click to open a production-quality profile panel.

---

## Reference products (Step 1)

| Product | Adopt | Avoid |
|---------|-------|-------|
| Git City | InstancedMesh skyline, fly mode, profile-on-click, shop customization | Over-cluttered social feed on main view |
| GitHub Skyline | Contribution heatmap as visual identity | Static-only experience |
| GitHub profile | Stat cards, repo list, achievement badges | Flat 2D-only presentation |

---

## Motif library (vector-creation)

**Domain:** developer city — code blocks, pixel windows, skyline silhouettes, commit nodes, neon grid lines.

**Motifs:**
1. **Pixel window** — small square with glow, used in logo mark and favicon
2. **Skyline block** — stepped building silhouette for brand mark
3. **Grid tile** — isometric ground cell for decorative patterns
4. **Commit node** — small circle on a branch line for achievement icons
5. **Neon beam** — vertical light streak for accent dividers

**Visual register:** monoline geometric, cyberpunk-neon accents on dark surfaces, 1.75px stroke, expert/precise with playful pixel energy.

---

## Asset table

| Page | Surface | Class | Asset file | Justification | Motif(s) | Archetype | Size cap |
|------|---------|-------|------------|---------------|----------|-----------|----------|
| City view | Header logo | Chrome | `logos/logo-mark.svg` | Brand wayfinding in nav | Pixel window + skyline | Logo | 32px height |
| City view | Discord button | Chrome | `icons/discord.svg` | Community link affordance | Universal | Icon | 20px |
| City view | Fly mode icon | Chrome | `icons/fly-mode.svg` | Camera mode label | Neon beam | Icon | 20px |
| City view | Orbit mode icon | Chrome | `icons/orbit-mode.svg` | Camera mode label | Grid tile | Icon | 20px |
| Shop modal | Empty preview | Emotional | — | 3D live preview replaces illustration | — | — | — |

**Task-dense surfaces (profile panel, search, stats): icon layer only — no scene illustrations beside live data.**

---

## Geometry

- Icon grid: 24×24 viewBox, 1.5px padding, 1.75px stroke
- Corner radius on UI cards: 8px (--radius)
- Logo mark works at 16px and 1600px

## Layout tokens

- Navbar: max-w-7xl, glass overlay, 56px height
- Profile sheet: 420px width desktop, full-width mobile
- HUD legend: max 280px, bottom-left, dismissible
- Illustration size caps: N/A (3D scene carries visual identity)

## Dark mode for assets

Icons use `currentColor`; logo mark uses explicit cyan `#22d3ee` + white fills.
