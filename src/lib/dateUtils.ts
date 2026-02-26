import { format as dateFnsFormat, formatDistanceToNow as dateFnsFormatDistanceToNow } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const NY_TIMEZONE = "America/New_York";

/**
 * Convert a date string or Date to NY timezone Date object
 */
export function toNY(date: string | Date): Date {
  return toZonedTime(new Date(date), NY_TIMEZONE);
}

/**
 * Format a date in NY timezone using date-fns format strings
 */
export function formatNY(date: string | Date, formatStr: string): string {
  return dateFnsFormat(toNY(date), formatStr);
}

/**
 * formatDistanceToNow but in NY timezone
 */
export function formatDistanceToNowNY(
  date: string | Date,
  options?: { addSuffix?: boolean }
): string {
  return dateFnsFormatDistanceToNow(toNY(date), options);
}

/**
 * toLocaleDateString equivalent in NY timezone
 */
export function toLocaleDateStringNY(date: string | Date): string {
  return new Date(date).toLocaleString("en-US", {
    timeZone: NY_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a plain date string (YYYY-MM-DD) without timezone conversion.
 * Use this for date-only fields (no time component) to avoid UTC shift issues.
 */
export function formatPlainDate(dateStr: string, formatStr: string): string {
  // Parse as local date to avoid UTC midnight shift
  const [year, month, day] = dateStr.split("-").map(Number);
  const localDate = new Date(year, month - 1, day);
  return dateFnsFormat(localDate, formatStr);
}
