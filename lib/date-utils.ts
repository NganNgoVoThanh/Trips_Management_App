// lib/date-utils.ts
import { format, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

// Vietnam timezone
export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Format date to Vietnam timezone with custom format
 * @param date - ISO string, Date object, or MySQL datetime string
 * @param formatString - Format pattern (default: 'dd/MM/yyyy HH:mm')
 * @returns Formatted date string in Vietnam timezone
 */
export function formatDateVN(
  date: string | Date,
  formatString: string = 'dd/MM/yyyy HH:mm'
): string {
  try {
    // Parse the date if it's a string
    const dateObj = typeof date === 'string' ? parseISO(date) : date;

    // Convert UTC to Vietnam timezone
    const vnDate = toZonedTime(dateObj, VIETNAM_TIMEZONE);

    // Format the date
    return format(vnDate, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format date to Vietnam timezone for display (long format)
 * Example: "Mon, 21 Oct, 2025"
 */
export function formatDateLongVN(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const vnDate = toZonedTime(dateObj, VIETNAM_TIMEZONE);
    return format(vnDate, 'EEE, dd MMM, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Convert local Vietnam time to UTC for database storage
 * @param date - Date in Vietnam timezone
 * @returns ISO string in UTC
 */
export function vnToUTC(date: Date): string {
  const utcDate = fromZonedTime(date, VIETNAM_TIMEZONE);
  return utcDate.toISOString();
}

/**
 * Get current time in Vietnam timezone as ISO string
 */
export function nowInVN(): string {
  const now = new Date();
  return vnToUTC(now);
}

/**
 * Convert UTC date to Vietnam timezone Date object
 */
export function utcToVN(date: string | Date): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(dateObj, VIETNAM_TIMEZONE);
}

/**
 * Format date and time separately for display
 * Returns: { date: "20/10/2025", time: "08:02" }
 */
export function formatDateTimeSeparate(date: string | Date): {
  date: string;
  time: string;
} {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const vnDate = toZonedTime(dateObj, VIETNAM_TIMEZONE);

    return {
      date: format(vnDate, 'dd/MM/yyyy'),
      time: format(vnDate, 'HH:mm')
    };
  } catch (error) {
    console.error('Error formatting date/time:', error);
    return { date: 'Invalid', time: 'date' };
  }
}

/**
 * Convert MySQL datetime string to Vietnam timezone
 * MySQL stores in UTC, we need to display in VN time
 */
export function mysqlToVN(mysqlDatetime: string): Date {
  // MySQL datetime format: "YYYY-MM-DD HH:MM:SS"
  // We treat it as UTC and convert to VN
  const isoString = mysqlDatetime.replace(' ', 'T') + 'Z';
  return toZonedTime(parseISO(isoString), VIETNAM_TIMEZONE);
}

/**
 * Convert Date to MySQL datetime string in UTC
 */
export function toMySQLDateTimeUTC(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    // MySQL format: YYYY-MM-DD HH:MM:SS in UTC
    return format(dateObj, 'yyyy-MM-dd HH:mm:ss');
  } catch (error) {
    console.error('Error converting to MySQL datetime:', error);
    return format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  }
}

/**
 * Get current time in MySQL format (UTC)
 */
export function nowInMySQL(): string {
  return format(new Date(), 'yyyy-MM-dd HH:mm:ss');
}
