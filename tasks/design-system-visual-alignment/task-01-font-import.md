# TASK-01: Add Google Fonts @import to index.css

**Feature:** design-system-visual-alignment  
**File:** `client/src/index.css`  
**Depends on:** none  
**Blocks:** TASK-03 (heading/body font-family rules depend on fonts being loaded)

---

## Description

Add the Google Fonts `@import` declaration as the first line of `client/src/index.css`.  
This loads Fira Code (headings) and Fira Sans (body) from the Google Fonts CDN with `display=swap` to avoid invisible text on cold load.

---

## Implementation

Insert at the very top of `client/src/index.css` (before any Tailwind directives):

```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```

No other files are touched.

---

## Acceptance Criteria

- [ ] `@import` is the first statement in `index.css` (before `@tailwind` directives).
- [ ] The URL includes both `Fira+Code` and `Fira+Sans` families with the specified weights.
- [ ] `display=swap` is present in the URL.
- [ ] Browser DevTools Network tab shows a request to `fonts.googleapis.com` on page load.
- [ ] With network throttled/offline, the app renders with `sans-serif` / `monospace` fallbacks — no JS error, no layout break.
- [ ] Existing Tailwind `@tailwind base/components/utilities` directives remain intact and in order.

---

## Failure modes

| Scenario | Expected outcome |
|----------|-----------------|
| CDN unreachable | System font fallbacks apply; layout intact |
| CSP blocks `fonts.googleapis.com` | Same fallback; console warning only |
