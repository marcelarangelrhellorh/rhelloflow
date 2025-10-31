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
