import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('utils', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      const result = cn('px-4', 'py-2');
      expect(result).toBe('px-4 py-2');
    });

    it('should handle conditional classes', () => {
      const result = cn('base-class', false && 'hidden', 'visible-class');
      expect(result).toBe('base-class visible-class');
    });

    it('should override conflicting tailwind classes', () => {
      const result = cn('px-4', 'px-6');
      expect(result).toContain('px-6');
      expect(result).not.toContain('px-4');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });
  });
});
