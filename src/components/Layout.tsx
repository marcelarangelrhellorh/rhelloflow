import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { SkipLink } from "@/components/ui/skip-link";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { LayoutSkeleton } from "@/components/skeletons/LayoutSkeleton";

export function Layout() {
  const { user, roles, loading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Redirecionar clientes para /acompanhamento
  useEffect(() => {
    if (!loading && user && roles.includes('client')) {
      if (location.pathname !== '/acompanhamento') {
        navigate('/acompanhamento', { replace: true });
      }
    }
  }, [loading, user, roles, location.pathname, navigate]);

  if (loading) {
    return <LayoutSkeleton />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <SkipLink />
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Mobile header with hamburger menu */}
          {isMobile && (
            <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 pt-safe">
              <SidebarTrigger className="touch-target" aria-label="Abrir menu de navegação" />
              <span className="font-semibold text-foreground">rhello flow</span>
            </header>
          )}
          <main id="main-content" className="min-h-screen bg-background" tabIndex={-1}>
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
