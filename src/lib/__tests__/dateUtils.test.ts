import { describe, it, expect } from 'vitest';
import { getBusinessDays, getBusinessDaysFromNow, isWithinDeadline, businessDaysBetween } from '../dateUtils';

describe('dateUtils', () => {
  describe('getBusinessDays', () => {
    it('should calculate business days between dates', () => {
      const start = new Date('2024-01-01'); // Monday
      const end = new Date('2024-01-05'); // Friday
      const result = getBusinessDays(start, end);
      expect(result).toBe(5);
    });

    it('should exclude weekends', () => {
      const start = new Date('2024-01-01'); // Monday
      const end = new Date('2024-01-08'); // Monday next week
      const result = getBusinessDays(start, end);
      expect(result).toBe(6); // 5 days first week + 1 day second week
    });

    it('should handle same date', () => {
      const date = new Date('2024-01-01');
      const result = getBusinessDays(date, date);
      expect(result).toBe(1);
    });
  });

  describe('getBusinessDaysFromNow', () => {
    it('should return 0 for null input', () => {
      const result = getBusinessDaysFromNow(null);
      expect(result).toBe(0);
    });

    it('should calculate business days from given date to now', () => {
      const pastDate = '2024-01-01';
      const result = getBusinessDaysFromNow(pastDate);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('isWithinDeadline', () => {
    it('should return true for null input', () => {
      const result = isWithinDeadline(null);
      expect(result).toBe(true);
    });

    it('should check if date is within deadline', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);
      const result = isWithinDeadline(recentDate.toISOString(), 30);
      expect(result).toBe(true);
    });
  });

  describe('businessDaysBetween', () => {
    it('should handle string dates', () => {
      const result = businessDaysBetween('2024-01-01', '2024-01-05');
      expect(result).toBe(5);
    });

    it('should handle Date objects', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-05');
      const result = businessDaysBetween(start, end);
      expect(result).toBe(5);
    });
  });
});
