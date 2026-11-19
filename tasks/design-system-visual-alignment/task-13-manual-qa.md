# TASK-13: Manual QA — All Views and Viewports

**Feature:** design-system-visual-alignment  
**Depends on:** TASK-01 through TASK-09 (all implementation tasks complete)  
**Blocks:** none (final gate before merge)

---

## Description

Perform a structured manual QA pass across all 9 views and 4 viewport widths to verify:

- Visual alignment matches MASTER dark palette.
- All existing functional behaviors are unchanged.
- Accessibility defaults are working.
- No regressions introduced.

---

## Viewport matrix

| Label | Width | Height |
|-------|-------|--------|
| Mobile | 375 | 812 |
| Tablet | 768 | 1024 |
| Desktop | 1024 | 768 |
| Wide desktop | 1440 | 900 |

---

## Per-view checklist

### Auth screens (Login, SignUp)

- [ ] Background is dark (`#020617` / `#0F172A`) — not white or light gray
- [ ] Form inputs have dark background with visible border
- [ ] Input text (`#F8FAFC`) is readable
- [ ] Submit buttons are visible and clickable
- [ ] Google sign-in SVG icon retains original brand colors (not overridden)
- [ ] Login submits successfully and navigates to Home
- [ ] SignUp flow completes successfully

### Home

- [ ] KPI tiles / cards render with dark secondary background (`#1E293B`)
- [ ] Accent badges display CTA green (`#22C55E`)
- [ ] All text is readable (primary: `#F8FAFC`, muted: `#94A3B8`)
- [ ] No horizontal overflow at 375 px

### AI Cooking Assistant

- [ ] Chat cards render with dark background
- [ ] Recipe card title has **no** emoji character
- [ ] Saved recipes section renders correctly
- [ ] Sub-view navigation (chat / saved recipes) works as before
- [ ] localStorage round-trip: save a recipe → reload → recipe appears without emoji

### Calendar

- [ ] Calendar grid cells have dark background
- [ ] Event badges use correct semantic colors
- [ ] Navigation between months works

### Pantry Inventory

- [ ] List rows have dark background
- [ ] Action buttons (edit, delete) are visible and functional
- [ ] Add item form submits correctly

### Shopping List

- [ ] Checklist items render with dark background
- [ ] Checked items show correct visual state
- [ ] Category badges show CTA green
- [ ] Add item works

### Recipe Manager

- [ ] Recipe cards render with dark secondary background and green accents
- [ ] Recipe detail panel opens correctly
- [ ] RecipeCard and RecipeDetail components display correctly

### Settings

- [ ] Form controls have dark background
- [ ] Settings save successfully

### Navigation chrome (Sidebar + BottomNav)

- [ ] Sidebar renders with dark secondary background at desktop/tablet
- [ ] BottomNav renders with dark background at mobile
- [ ] Active state indicators are visible
- [ ] All nav links navigate to correct views

---

## Cross-cutting checks

- [ ] Tab key navigates all interactive elements with visible green focus ring
- [ ] Mouse click does **not** show focus ring (focus-visible only)
- [ ] All buttons and links show `cursor: pointer` on hover
- [ ] Hover states show 200ms ease transition (not instant)
- [ ] With OS "Reduce Motion" enabled: no visible transitions
- [ ] Throttle network to Slow 3G: app loads with system font fallbacks; no layout break
- [ ] DevTools → no JS errors in console on any view

---

## Acceptance Criteria

- [ ] All per-view checkboxes above are checked.
- [ ] All cross-cutting checks above are checked.
- [ ] No P0/P1 visual or functional regression found.
- [ ] QA results documented (screenshots or notes) for any edge case.
