/**
 * Turn raw recipe instructions (array entries and/or newline-separated text) into
 * one clean step per entry, so each line renders as its own numbered step.
 */
export function splitInstructionSteps(raw: unknown): string[] {
  const entries = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  const steps: string[] = [];
  for (const entry of entries) {
    for (const line of String(entry ?? '').split(/\r?\n/)) {
      const step = line.trim().replace(/^(?:step\s*)?\d+\s*[.):]\s+/i, '').trim();
      if (step) steps.push(step);
    }
  }
  return steps;
}
