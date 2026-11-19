# Landing Hero — Page Override

> Overrides [`MASTER.md`](../lardermind/MASTER.md) for the guest marketing landing.

**Surface:** Guest-only (`MarketingLanding.tsx`) — shown when user is not authenticated.  
**Not shown:** Authenticated app shell (sidebar, bottom nav).

---

## First viewport inventory

Exactly these elements in the hero — nothing else above the fold:

| Element | Spec |
|---------|------|
| Brand | **LarderMind** — Fraunces, hero-level (`clamp(2.5rem, 8vw, 4rem)`) |
| Headline | **An AI assistant that plans your meals from what's in your pantry.** — secondary to brand |
| CTA group | Primary **Get started** (signup) + secondary **Log in** |
| Visual | Full-bleed Remotion loop OR static still (reduced motion) |

No stats, schedules, feature cards, badges, or promo chips in the first viewport.

---

## Demo chat section (below hero)

**Placement:** Dedicated `#demo-chat` section immediately after hero — **not** overlaid on hero media.

**Layout:** Two columns on `lg+` (copy left, animated chat right). Stacked on mobile.

**Component:** `DemoChatBox.tsx` — mirrors real assistant UI for guests.

**Behavior:**
- Section scroll-reveal animation on copy + chat panel
- Soft sage glow behind chat panel
- Auto-plays first demo exchange when section enters view (unless reduced motion)
- Each message bubble fades up on appear; typing dots while assistant "thinks"
- Clickable prompt chips + input for scripted replies
- Labeled **Live demo** — no backend calls, no auth required

---

## Remotion hero

**Composition:** `HeroScene` — 150 frames @ 30fps (5s loop), 1920×1080.

**Motion intent:**
- Slow ken-burns on warm kitchen photo (scale 1.05 → 1.15, slight upward drift)
- Soft linen gradient wash over image (Warm Kitchen tokens)
- Silent — no audio track

**Player settings:** `autoPlay`, `loop`, no controls, `acknowledgeRemotionLicense`, fills hero via absolute positioning.

**Reduced motion:** When `prefers-reduced-motion: reduce`, show static Unsplash still + CSS gradient overlay instead of `<Player>`.

---

## Page motion (outside Remotion)

1. Hero text — `animate-fade-up` on load
2. CTA — `.btn-primary` hover lift (existing component class)
3. Below-fold sections — fade-up on scroll via `IntersectionObserver`

Respect global `prefers-reduced-motion` in `index.css`.

---

## Below the fold

Same content order as static landing:
1. **Demo chat section** (`#demo-chat`)
2. Pain list (hairline dividers, no cards)
3. How it works (3 feature rows with edge images)
4. Waitlist email CTA
5. Footer

---

## Anti-patterns

- Cards or boxed promos in the hero
- Floating badges / stickers on hero media
- Multiple accent colors
- Inset or rounded hero image cards
- Orange legacy branding / orange→red headers
- Sidebar or bottom nav on guest views

---

## File references

| File | Role |
|------|------|
| `src/components/MarketingLanding.tsx` | Guest landing page |
| `src/components/DemoChatBox.tsx` | Interactive demo chat section |
| `src/remotion/HeroScene.tsx` | Remotion composition |
| `src/App.tsx` | Guest routing (`landing` default) |
| `landing/index.html` | Static mirror (CTA → Vite app) |
