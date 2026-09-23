export const SETUP_GUIDE_DISMISSED_KEY = 'lardermind.setupGuide.dismissed';
export const SETUP_GUIDE_CHAT_KEY = 'lardermind.setupGuide.chatStarted';

export type SetupGuideStepId =
  | 'pantry'
  | 'recipes'
  | 'chat'
  | 'meals'
  | 'shopping';

export const SETUP_GUIDE_STEP_ORDER: SetupGuideStepId[] = [
  'pantry',
  'recipes',
  'chat',
  'meals',
  'shopping',
];

export function readSetupGuideDismissed(): boolean {
  try {
    return localStorage.getItem(SETUP_GUIDE_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeSetupGuideDismissed(): void {
  try {
    localStorage.setItem(SETUP_GUIDE_DISMISSED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function readSetupGuideChatStarted(): boolean {
  try {
    return localStorage.getItem(SETUP_GUIDE_CHAT_KEY) === '1';
  } catch {
    return false;
  }
}

export function markSetupGuideChatStarted(): void {
  try {
    localStorage.setItem(SETUP_GUIDE_CHAT_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function isSetupGuideStepComplete(
  id: SetupGuideStepId,
  counts: {
    pantry: number;
    recipes: number;
    chatStarted: boolean;
    meals: number;
    shopping: number;
  },
): boolean {
  switch (id) {
    case 'pantry':
      return counts.pantry > 0;
    case 'recipes':
      return counts.recipes > 0;
    case 'chat':
      return counts.chatStarted;
    case 'meals':
      return counts.meals > 0;
    case 'shopping':
      return counts.shopping > 0;
    default:
      return false;
  }
}

/** Section N is locked until all previous sections are complete. */
export function isSetupGuideStepLocked(
  id: SetupGuideStepId,
  completed: Record<SetupGuideStepId, boolean>,
): boolean {
  const index = SETUP_GUIDE_STEP_ORDER.indexOf(id);
  if (index <= 0) return false;
  for (let i = 0; i < index; i += 1) {
    if (!completed[SETUP_GUIDE_STEP_ORDER[i]]) return true;
  }
  return false;
}
