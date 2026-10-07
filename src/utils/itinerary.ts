import { Destination } from '@app-types/index';

export interface ItineraryDay {
  day: number;
  items: Destination[];
}

/**
 * Groups destinations into Day 1, Day 2, … buckets.
 *
 * Day numbers are derived from each destination's `date` field relative to the
 * earliest date found in the list.  Destinations with no date land in Day 1.
 */
export function groupDestinationsByDay(destinations: Destination[]): ItineraryDay[] {
  if (destinations.length === 0) return [];

  // Sort by date ascending, then by order for same-day ties
  const sorted = [...destinations].sort((a, b) => {
    const da = a.date?.seconds ?? 0;
    const db = b.date?.seconds ?? 0;
    if (da !== db) return da - db;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  // Find the earliest valid date as the Day 1 baseline
  const baseSeconds = sorted.find((d) => (d.date?.seconds ?? 0) > 0)?.date?.seconds ?? 0;

  const dayMap = new Map<number, Destination[]>();

  for (const dest of sorted) {
    const destSeconds = dest.date?.seconds ?? 0;
    const dayNum =
      baseSeconds > 0 && destSeconds > 0
        ? Math.max(1, Math.floor((destSeconds - baseSeconds) / 86400) + 1)
        : 1;

    const bucket = dayMap.get(dayNum) ?? [];
    bucket.push(dest);
    dayMap.set(dayNum, bucket);
  }

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, items]) => ({ day, items }));
}
