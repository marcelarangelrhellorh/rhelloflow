import { Link, LinkProps } from "react-router-dom";
import { useVagaPrefetch } from "@/hooks/data/useVagaPrefetch";

interface PrefetchLinkProps extends LinkProps {
  /** ID da vaga para prefetch */
  vagaId?: string;
  /** Se deve fazer prefetch completo (vaga + dados relacionados) */
  prefetchFull?: boolean;
  /** IDs de todas as vagas na lista (para prefetch adjacente) */
  allVagaIds?: string[];
}

/**
 * Link que faz prefetch de dados ao hover
 * 
 * Uso:
 * ```tsx
 * // Prefetch básico
 * <PrefetchLink to="/vagas/123" vagaId="123">
 *   Ver Vaga
 * </PrefetchLink>
 * 
 * // Prefetch completo
 * <PrefetchLink to="/vagas/123" vagaId="123" prefetchFull>
 *   Ver Detalhes
 * </PrefetchLink>
 * 
 * // Com prefetch de adjacentes
 * <PrefetchLink
 *   to="/vagas/123"
 *   vagaId="123"
 *   allVagaIds={["122", "123", "124"]}
 * >
 *   Ver Vaga
 * </PrefetchLink>
 * ```
 */
export function PrefetchLink({
  vagaId,
  prefetchFull = false,
  allVagaIds,
  onMouseEnter,
  ...linkProps
}: PrefetchLinkProps) {
  const { prefetchVaga, prefetchVagaDetails, prefetchAdjacentVagas } = useVagaPrefetch();

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Executar callback original se existir
    onMouseEnter?.(e);

    // Fazer prefetch se tiver vagaId
    if (vagaId) {
      if (prefetchFull) {
        prefetchVagaDetails(vagaId);
      } else {
        prefetchVaga(vagaId);
      }

      // Prefetch adjacentes se fornecido
      if (allVagaIds) {
        prefetchAdjacentVagas(vagaId, allVagaIds);
      }
    }
  };

  return <Link {...linkProps} onMouseEnter={handleMouseEnter} />;
}
