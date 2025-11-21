import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useUserRole } from "@/hooks/useUserRole";
import logoRhelloDark from "@/assets/logo-rhello-dark.png";
import symbolRhelloDark from "@/assets/symbol-rhello-dark.png";
const menuItems = [{
  title: "Dashboard",
  url: "/",
  roles: ["admin", "recrutador", "cs"]
}, {
  title: "Vagas",
  url: "/vagas",
  roles: ["admin", "recrutador", "cs"]
}, {
  title: "Candidatos",
  url: "/candidatos",
  roles: ["admin", "recrutador", "cs"]
}, {
  title: "Banco de Talentos",
  url: "/banco-talentos",
  roles: ["admin", "recrutador", "cs"]
}, {
  title: "Scorecards",
  url: "/scorecards",
  roles: ["admin", "recrutador", "cs"]
}, {
  title: "Estudo de Mercado",
  url: "/estudo-mercado",
  roles: ["admin", "recrutador", "cs"]
}, {
  title: "Relatórios",
  url: "/relatorios",
  roles: ["admin", "recrutador", "cs"]
}, {
  title: "Processos",
  url: "/acompanhamento",
  roles: ["admin", "client"]
}];
export function AppNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const {
    roles,
    loading
  } = useUserRole();

  // Se o usuário tem role "client", mostrar APENAS a aba Acompanhamento
  const visibleMenuItems = roles.includes('client') ? menuItems.filter(item => item.url === '/acompanhamento') : menuItems.filter(item => roles.some(role => item.roles.includes(role)));
  if (loading) {
    return null;
  }
  return <header className="sticky top-0 z-50 w-full border-b border-[#d4cec6]/40 bg-background shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex h-16 items-center px-4 sm:px-6 gap-6 max-w-[1600px] mx-auto">
        {/* Logo */}
        <NavLink to="/" className="flex items-center shrink-0">
          <img alt="rhello" className="h-8 hidden sm:block" loading="lazy" src="/lovable-uploads/730861b1-e6da-47c3-991c-dadbca0b7fa1.png" />
          <img src={symbolRhelloDark} alt="rhello" className="h-10 w-10 sm:hidden" loading="lazy" />
        </NavLink>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-6">
          {visibleMenuItems.map(item => <NavLink key={item.title} to={item.url} end={item.url === "/"} className={({
          isActive
        }) => `px-3 py-2 text-base font-medium transition-all duration-200 ease-in-out whitespace-nowrap relative ${isActive ? "text-primary font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-t-md" : "text-foreground hover:bg-primary/10 hover:text-primary rounded-lg"}`} style={{
          fontFamily: 'Manrope, sans-serif',
          fontWeight: 500,
          fontSize: '16px'
        }}>
              {item.title}
            </NavLink>)}
        </nav>

        {/* Right Side - Desktop */}
        <div className="hidden lg:flex items-center gap-3">
          <ConnectionIndicator />
          <NotificationBell />
          <UserMenu />
        </div>

        {/* Mobile Menu Button */}
        <div className="flex lg:hidden flex-1 items-center justify-end gap-2">
          <NotificationBell />
          
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <img src={symbolRhelloDark} alt="rhello" className="h-8 w-8" />
                  <span className="text-base font-bold text-foreground">
                    rhello
                  </span>
                </SheetTitle>
              </SheetHeader>

              <nav className="mt-8 flex flex-col gap-2">
                {visibleMenuItems.map(item => <NavLink key={item.title} to={item.url} end={item.url === "/"} onClick={() => setMobileMenuOpen(false)} className={({
                isActive
              }) => `flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive ? "bg-primary/20 text-primary font-semibold" : "text-foreground hover:bg-muted"}`}>
                    <span>{item.title}</span>
                  </NavLink>)}
              </nav>

              <div className="mt-8 pt-6 border-t flex flex-col gap-3">
                <div className="flex items-center justify-between px-4">
                  <span className="text-sm text-muted-foreground">Conexão</span>
                  <ConnectionIndicator />
                </div>
                <div className="px-4">
                  <UserMenu />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>;
}