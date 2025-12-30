export function getBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

export function getBusinessDaysFromNow(dateString: string | null): number {
  if (!dateString) return 0;
  const startDate = new Date(dateString);
  const today = new Date();
  return getBusinessDays(startDate, today);
}

export function isWithinDeadline(dateString: string | null, deadlineDays: number = 30): boolean {
  if (!dateString) return true;
  const businessDays = getBusinessDaysFromNow(dateString);
  return businessDays <= deadlineDays;
}

export function businessDaysBetween(start: Date | string, end: Date | string): number {
  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;
  return getBusinessDays(startDate, endDate);
}

/**
 * Get the start and end of the current week (Monday to Sunday)
 */
export function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Get the start and end of last week (Monday to Sunday)
 */
export function getLastWeekRange(): { start: Date; end: Date } {
  const currentWeek = getCurrentWeekRange();
  
  const start = new Date(currentWeek.start);
  start.setDate(start.getDate() - 7);
  
  const end = new Date(currentWeek.start);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Get the start and end of the current month
 */
export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Get elapsed business days from start date until today (or end date if before today)
 */
export function getElapsedBusinessDays(start: Date, end: Date): number {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  const effectiveEnd = end < today ? end : today;
  
  if (effectiveEnd < start) return 0;
  
  return getBusinessDays(start, effectiveEnd);
}
