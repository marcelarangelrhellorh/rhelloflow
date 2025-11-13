import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../usePagination';

describe('usePagination', () => {
  it('should initialize with correct values', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const { result } = renderHook(() => usePagination(items, 10));
    
    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.totalPages).toBe(3);
  });

  it('should paginate items correctly', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const { result } = renderHook(() => usePagination(items, 10));
    
    const firstPage = result.current.paginatedData;
    expect(firstPage).toHaveLength(10);
    expect(firstPage[0]).toBe(0);
    expect(firstPage[9]).toBe(9);
  });

  it('should change pages correctly', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const { result } = renderHook(() => usePagination(items, 10));
    
    act(() => {
      result.current.goToPage(2);
    });
    
    expect(result.current.currentPage).toBe(2);
    const secondPage = result.current.paginatedData;
    expect(secondPage[0]).toBe(10);
    expect(secondPage[9]).toBe(19);
  });

  it('should calculate total pages correctly', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const { result } = renderHook(() => usePagination(items, 10));
    
    expect(result.current.totalPages).toBe(3);
  });

  it('should handle next and previous page navigation', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const { result } = renderHook(() => usePagination(items, 10));
    
    expect(result.current.canGoPrevious).toBe(false);
    expect(result.current.canGoNext).toBe(true);
    
    act(() => {
      result.current.nextPage();
    });
    expect(result.current.currentPage).toBe(2);
    expect(result.current.canGoPrevious).toBe(true);
    
    act(() => {
      result.current.previousPage();
    });
    expect(result.current.currentPage).toBe(1);
  });

  it('should provide correct start and end indices', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const { result } = renderHook(() => usePagination(items, 10));
    
    expect(result.current.startIndex).toBe(1);
    expect(result.current.endIndex).toBe(10);
    
    act(() => {
      result.current.goToPage(3);
    });
    
    expect(result.current.startIndex).toBe(21);
    expect(result.current.endIndex).toBe(25);
  });
});
