# LarderMind Design System — Warm Kitchen

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** LarderMind  
**Mood:** Warm kitchen — cozy, calm, food-at-home (not terracotta cliché, not dark dashboard)  
**Surfaces aligned:** Web app + landing page + Mobile app (`mobile`)  
**Not yet aligned:** _(none)_

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable | Tailwind |
|------|-----|--------------|----------|
| Ink (text) | `#1F2420` | `--ink` | `text-ink` |
| Muted | `#5E675F` | `--muted` | `text-muted` |
| Linen (page bg) | `#F3F0E8` | `--linen` | `bg-linen` |
| Surface (panels) | `#FAF8F3` | `--surface` | `bg-surface` |
| Herb (accent / CTA) | `#4F6B4A` | `--herb` | `bg-herb`, `text-herb` |
| Herb deep (hover) | `#3A5238` | `--herb-deep` | `bg-herb-deep` |
| Sage (tint / selected) | `#D8E0D0` | `--sage` | `bg-sage` |
| Line (borders) | `#DDD8CC` | `--line` | `border-line` |

**Rules:**
- One accent only: **herb**. No rainbow stat tiles (pink/blue/amber).
- Default layout: spacing + hairline dividers — not nested cards.
- Cards only for modals, form panels, or interactive list rows when necessary.

### Typography

| Role | Font | Tailwind |
|------|------|----------|
| Display / brand / page titles | **Fraunces** | `font-display` |
| Body / UI / nav | **Source Sans 3** | `font-sans` (default) |

**Google Fonts import** (in `src/index.css` and `landing/style.css`):
```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');
```

### Spacing & Shadows

Defined in `:root` in `src/index.css` — `--space-xs` through `--space-3xl`, `--shadow-sm` through `--shadow-lg`.

### Motion

- Intentional only: hero fade-up, CTA hover lift, page title fade-in.
- Default transition: `200ms ease` on interactive controls.
- Respect `prefers-reduced-motion`.

---

## Component Specs (Tailwind `@layer components`)

Defined in `src/index.css`:

| Class | Purpose |
|-------|---------|
| `.btn-primary` | Herb CTA with hover lift |
| `.btn-secondary` | Outlined secondary action |
| `.input-field` | Standard text input |
| `.page-title` | Fraunces page heading |
| `.page-subtitle` | Muted helper under title |
| `.divider` | Hairline horizontal rule |
| `.list-row` | List item with bottom border |

---

## Layout Patterns

### App chrome
- **Authenticated:** Left **overlay drawer** (`AppDrawer.tsx`) — LarderMind wordmark, primary destinations, Recents, footer (New chat / Settings / Subscription). Hamburger in `AppHeader` opens it.
- **Default home:** Chat (`AICookingAssistant`) — full-height agent transcript + sticky composer.
- **Do not** use desktop Sidebar + mobile BottomNav split (removed).
- **No** full-width orange/red gradient headers on authenticated screens. Quiet `AppHeader` / `.page-title` in content.

### Home (first viewport)
1. LarderMind brand (Fraunces)
2. One line: "Plan dinner from what's already in your kitchen"
3. Primary CTA: **Cook with what I have**
4. Dominant kitchen/food image (edge-to-edge, not inset card)
5. Secondary actions below the fold as simple list links

### Auth (Login / SignUp)
- Brand-first on linen background
- Herb CTA, no white card-in-card template
- Use `.input-field` and `.btn-primary`

### Landing page
- Same tokens as web app (`landing/style.css`)
- Hero: brand + headline + one sentence + CTA + full-bleed photo
- Below fold: pain list → how it works → email CTA

---

## Anti-patterns (do not use)

- Orange→red gradients (`from-orange-500 to-red-600`)
- Legacy orange branding / orange→red headers (brand name is **LarderMind**)
- Dark slate dashboard palette with green CTA overrides
- Card grids for every section (stats tiles, action tiles, nested cards)
- Emoji as icons (use Lucide)
- Multiple competing accent colors on one screen

---

## File References

| File | Role |
|------|------|
| `client/tailwind.config.js` | Tailwind color/font extensions |
| `client/src/index.css` | CSS variables, base styles, component utilities |
| `landing/style.css` | Same CSS variables for marketing |
| `client/src/components/Sidebar.tsx` | Desktop nav chrome |
| `client/src/components/BottomNav.tsx` | Mobile nav chrome |
| `client/src/components/Home.tsx` | Reference for hero composition |
