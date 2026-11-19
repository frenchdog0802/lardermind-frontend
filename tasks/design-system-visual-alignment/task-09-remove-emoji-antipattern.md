# TASK-09: Remove Emoji Anti-pattern from AICookingAssistant

**Feature:** design-system-visual-alignment  
**File:** `client/src/components/AICookingAssistant.tsx`  
**Depends on:** none (standalone component change)  
**Blocks:** none

---

## Description

`AICookingAssistant.tsx` renders a recipe card title with an emoji character used as a visual icon (e.g. `🍽️ {recipe.title}`). Per MASTER.md anti-pattern rules, emojis must not be used as icons — Lucide icons are the icon set for this project.

Remove the emoji from the recipe card title JSX text node. Do not add a Lucide icon as a replacement in this task (out of scope unless the design explicitly calls for one).

---

## Implementation

Locate the JSX text node in `AICookingAssistant.tsx` that prepends an emoji to the recipe card title.

Before:
```tsx
<h3 className="...">🍽️ {recipe.title}</h3>
```

After:
```tsx
<h3 className="...">{recipe.title}</h3>
```

Identify the exact line by searching for emoji characters in the file. Touch only that single text node — no logic, no state, no other JSX is changed.

---

## Acceptance Criteria

- [ ] No emoji character appears in the recipe card title in the AI Assistant view.
- [ ] The recipe title text is otherwise unchanged (same content, same class names).
- [ ] Saved recipes still display correctly after the change.
- [ ] `localStorage` saved-recipe round-trip is unaffected (save a recipe, reload — title renders correctly without emoji).
- [ ] The rest of `AICookingAssistant.tsx` is identical to the pre-task state (diff shows exactly one line changed).
- [ ] An ESLint scan of `client/src/components/*.tsx` finds no remaining emoji characters used as icon-replacements.
- [ ] Existing tests pass without modification.
