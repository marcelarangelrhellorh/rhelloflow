/**
 * React Query DevTools
 * 
 * Descomente o código abaixo para habilitar as DevTools durante desenvolvimento.
 * As DevTools permitem visualizar:
 * - Todas as queries ativas
 * - Estado do cache
 * - Tempo de fetch/refetch
 * - Invalidações e mutations
 * 
 * Para habilitar:
 * 1. Descomente o código
 * 2. Instale: bun add @tanstack/react-query-devtools
 * 3. Importe em App.tsx: import { ReactQueryDevtools } from '@/components/ReactQueryDevtools'
 * 4. Adicione no render: <ReactQueryDevtools />
 */

/*
import { ReactQueryDevtools as RQDevtools } from '@tanstack/react-query-devtools';

export function ReactQueryDevtools() {
  return (
    <RQDevtools
      initialIsOpen={false}
      position="bottom-right"
      buttonPosition="bottom-right"
    />
  );
}
*/

export function ReactQueryDevtools() {
  return null; // Desabilitado por padrão
}
