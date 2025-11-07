import { lazy } from "react";

/**
 * Lazy loading de componentes pesados
 * 
 * Benefícios:
 * - Reduz bundle inicial
 * - Carrega componentes sob demanda
 * - Melhora First Contentful Paint
 * - Code splitting automático
 */

// Componentes pesados que não são críticos para primeira renderização
export const VagaDetailsDrawer = lazy(
  () => import("./VagaDetailsDrawer").then((m) => ({ default: m.VagaDetailsDrawer }))
);

export const ShareJobModal = lazy(
  () => import("../ShareJobModal").then((m) => ({ default: m.ShareJobModal }))
);

export const ClientViewLinkManager = lazy(
  () => import("../ClientViewLinkManager").then((m) => ({ default: m.ClientViewLinkManager }))
);

export const AnalyzeScorecards = lazy(
  () => import("../FunilVagas/AnalyzeScorecards").then((m) => ({ default: m.AnalyzeScorecards }))
);

// Export loading fallbacks
export const DrawerSkeleton = () => (
  <div className="w-full h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Carregando detalhes...</p>
    </div>
  </div>
);

export const ModalSkeleton = () => (
  <div className="flex items-center justify-center p-8">
    <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
  </div>
);
