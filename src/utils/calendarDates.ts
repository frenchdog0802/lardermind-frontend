/** Local-date helpers for the Calendar. Never parse YYYY-MM-DD via new Date(string) (that is UTC). */

export function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** 'today' | 'yesterday' | 'tomorrow' only when that exact local date is so; else null. */
export function relativeDayKey(dateString: string, now: Date = new Date()): 'today' | 'yesterday' | 'tomorrow' | null {
  const d = formatLocalDate(parseLocalDate(dateString));
  const offset = (n: number) => {
    const x = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
    return formatLocalDate(x);
  };
  if (d === offset(0)) return 'today';
  if (d === offset(-1)) return 'yesterday';
  if (d === offset(1)) return 'tomorrow';
  return null;
}

/** Sunday-start week containing `now`, at local midnight. */
export function startOfWeekLocal(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
}

/** Default expanded day for a visible week: today if in the week, else the first day. */
export function defaultExpandedDay(weekStart: Date, now: Date = new Date()): string {
  const today = formatLocalDate(now);
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
    if (formatLocalDate(d) === today) return today;
  }
  return formatLocalDate(weekStart);
}

/**
 * Banner range label. A single day may use Today/Tomorrow; a multi-day range is always
 * explicit ("Nov 19 - Nov 22") so no endpoint is mislabelled.
 */
export function shortageRangeLabel(
  from: string,
  to: string,
  fmt: {
    relative: (key: 'today' | 'yesterday' | 'tomorrow') => string;
    short: (date: Date, withWeekday: boolean) => string;
    range: (from: string, to: string) => string;
  },
  now: Date = new Date(),
): string {
  if (from === to) {
    const rel = relativeDayKey(from, now);
    return rel ? fmt.relative(rel) : fmt.short(parseLocalDate(from), true);
  }
  return fmt.range(fmt.short(parseLocalDate(from), false), fmt.short(parseLocalDate(to), false));
}
