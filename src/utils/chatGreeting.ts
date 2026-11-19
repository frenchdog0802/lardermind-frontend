/**
 * Time-of-day greeting key for Chat empty state.
 */
export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

export function greetingPeriodForHour(hour: number): GreetingPeriod {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

export function greetingPeriodNow(now: Date = new Date()): GreetingPeriod {
  return greetingPeriodForHour(now.getHours());
}
