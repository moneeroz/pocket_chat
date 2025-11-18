import {
  format,
  isToday,
  isYesterday,
  isThisWeek,
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
} from 'date-fns';

/**
 * Format a date for chat message timestamps (WhatsApp-style)
 * - Just now: "now"
 * - < 1 minute: "X seconds ago"
 * - < 30 minutes: "X minutes ago"
 * - < 24 hours (today): Shows time (e.g., "3:45 PM")
 * - Yesterday: Shows "Yesterday"
 * - This week: Shows day name (e.g., "Monday")
 * - Older: Shows date (e.g., "Jan 15")
 */
export function formatMessageTime(date: string | Date): string {
  if (!date) return '';

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return 'Invalid date';

  const now = new Date();
  const secondsAgo = differenceInSeconds(now, parsedDate);
  const minutesAgo = differenceInMinutes(now, parsedDate);

  // Just sent (< 5 seconds)
  if (secondsAgo < 5) return 'now';

  // Less than 1 minute
  if (secondsAgo < 60) return `${secondsAgo} seconds ago`;

  // Less than 30 minutes
  if (minutesAgo < 30) return `${minutesAgo} ${minutesAgo === 1 ? 'minute' : 'minutes'} ago`;

  // Today (30+ minutes): show time
  if (isToday(parsedDate)) return format(parsedDate, 'h:mm a');

  // Yesterday
  if (isYesterday(parsedDate)) return 'Yesterday';

  // This week: show day name
  if (isThisWeek(parsedDate)) return format(parsedDate, 'EEEE');

  // Older: show date
  return format(parsedDate, 'MMM, do');
}

/**
 * Format a date for conversation list preview (WhatsApp-style)
 * - Just now: "now"
 * - < 1 minute: "X seconds ago"
 * - < 30 minutes: "X min ago"
 * - < 24 hours (today): Shows time (e.g., "3:45 PM")
 * - Yesterday: Shows "Yesterday"
 * - This week: Shows day name (e.g., "Mon")
 * - Older: Shows date (e.g., "1/15/25")
 */
export function formatConversationTime(date: string | Date): string {
  if (!date) return '';

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return '';

  const now = new Date();
  const secondsAgo = differenceInSeconds(now, parsedDate);
  const minutesAgo = differenceInMinutes(now, parsedDate);

  // Just sent (< 5 seconds)
  if (secondsAgo < 5) return 'now';

  // Less than 1 minute
  if (secondsAgo < 60) return `${secondsAgo}s ago`;

  // Less than 30 minutes (shortened for list view)
  if (minutesAgo < 30) return `${minutesAgo} ${minutesAgo === 1 ? 'minute' : 'minutes'} ago`;

  // Today (30+ minutes): show time
  if (isToday(parsedDate)) return format(parsedDate, 'h:mm a');

  // Yesterday
  if (isYesterday(parsedDate)) return `Yesterday ${format(parsedDate, 'h:mm a')}`;

  // This week: show day
  if (isThisWeek(parsedDate)) return format(parsedDate, 'EEEE');

  // Older: show date and time
  return format(parsedDate, 'M/d/yy h:mm a ');
}

// Backwards compatibility alias
export const formatChatTime = formatMessageTime;
