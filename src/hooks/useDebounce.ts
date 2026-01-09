import { useState, useEffect } from "react";

/**
 * Hook para debounce de valores
 * Útil para campos de busca, filtros e outros inputs que disparam operações custosas
 * 
 * @param value - Valor a ser debounced
 * @param delay - Delay em milissegundos (padrão: 300ms)
 * @returns Valor debounced
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState("");
 * const debouncedSearch = useDebounce(searchTerm, 300);
 * 
 * // debouncedSearch só atualiza após 300ms sem digitação
 * const filteredItems = items.filter(item => 
 *   item.name.includes(debouncedSearch)
 * );
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
