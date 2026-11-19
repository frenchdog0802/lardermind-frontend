# TASK-12: Anti-pattern Lint Check (No Emoji as Icons)

**Feature:** design-system-visual-alignment  
**Scope:** `client/src/components/*.tsx` (all component files)  
**Depends on:** TASK-09 (emoji removal must be complete before lint passes)  
**Blocks:** none

---

## Description

Add a CI script or ESLint rule that fails if any JSX text node in `client/src/components/` contains an emoji character used as a substitute for an icon.

This enforces the MASTER.md anti-pattern rule going forward so no future component introduces emoji icons.

---

## Implementation (CI script option — simplest)

Add `scripts/lint-no-emoji-icons.mjs` in the project root:

```javascript
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = 'client/src/components';
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

let failed = false;

for (const file of readdirSync(dir)) {
  if (!file.endsWith('.tsx') && !file.endsWith('.jsx')) continue;
  const src = readFileSync(join(dir, file), 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (emojiRegex.test(lines[i])) {
      console.error(`EMOJI ICON: ${file}:${i + 1}: ${lines[i].trim()}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('No emoji icon anti-patterns found.');
```

Add to `package.json` scripts:

```json
"lint:no-emoji": "node scripts/lint-no-emoji-icons.mjs"
```

Add to CI workflow (after build, before deploy):

```yaml
- name: Emoji anti-pattern check
  run: npm run lint:no-emoji
```

---

## Acceptance Criteria

- [ ] `npm run lint:no-emoji` exits with code 0 after TASK-09 is complete.
- [ ] `npm run lint:no-emoji` exits with code 1 when a test emoji is manually inserted into any `.tsx` file (verify the check catches it).
- [ ] The script scans all `.tsx` and `.jsx` files under `client/src/components/`.
- [ ] CI fails the build if any emoji is found.
- [ ] The script does not flag emoji in code comments or string literals that are not JSX text nodes (nice-to-have; acceptable if false positives only in comments).
