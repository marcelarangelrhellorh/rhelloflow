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

export function getBusinessDaysFromNow(dateString: string): number {
  const startDate = new Date(dateString);
  const today = new Date();
  return getBusinessDays(startDate, today);
}

export function isWithinDeadline(dateString: string, deadlineDays: number = 30): boolean {
  const businessDays = getBusinessDaysFromNow(dateString);
  return businessDays <= deadlineDays;
}
