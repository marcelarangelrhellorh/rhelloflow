import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X, FileText, TrendingUp, MessageSquare, GitCompare } from "lucide-react";
import { Button } from "./ui/button";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useUserRole } from "@/hooks/useUserRole";
import logoRhelloDark from "@/assets/logo-rhello-dark.png";
import symbolRhelloNew from "@/assets/symbol-rhello-new.png";
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
  title: "Clientes",
  url: "/gerenciar-empresas",
  roles: ["admin"]
}, {
  title: "Tarefas",
  url: "/tarefas",
  roles: ["admin", "recrutador", "cs"]
}, {
  title: "Análises",
  url: "/relatorios",
  roles: ["admin", "recrutador", "cs"]
}, {
  title: "Processos",
  url: "/acompanhamento",
  roles: ["client"]
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
  return <header className="sticky top-0 z-50 w-full border-b border-[#d4cec6]/40 bg-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex h-14 sm:h-16 items-center px-3 sm:px-6 lg:px-8 gap-2 sm:gap-4 lg:gap-6 w-full">
        {/* Logo - Com Dropdown para usuários internos, sem dropdown para clientes */}
        {roles.includes('client') ? <div className="flex items-center shrink-0">
            <img alt="rhello" className="h-8 w-8 sm:h-10 sm:w-10" loading="lazy" src={symbolRhelloNew} />
          </div> : <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                <img alt="rhello" className="h-8 w-8 sm:h-10 sm:w-10" loading="lazy" src={symbolRhelloNew} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-background z-[100]">
              <DropdownMenuItem onClick={() => navigate("/avaliacoes")} className="cursor-pointer">
                <FileText className="mr-2 h-5 w-5 text-[#ffcd00]" />
                <span className="font-bold text-sm sm:text-base">Avaliações</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/estudo-mercado")} className="cursor-pointer">
                <TrendingUp className="mr-2 h-5 w-5 text-[#ffcd00]" />
                <span className="font-bold text-sm sm:text-base">Estudo de Mercado</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/comparador-cargos")} className="cursor-pointer">
                <GitCompare className="mr-2 h-5 w-5 text-[#ffcd00]" />
                <span className="font-bold text-sm sm:text-base">Comparador de Cargos</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/whatsapp-templates")} className="cursor-pointer">
                <MessageSquare className="mr-2 h-5 w-5 text-[#ffcd00]" />
                <span className="font-bold text-sm sm:text-base">Templates de WhatsApp</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>}

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-2 xl:gap-6 overflow-x-auto scrollbar-hide">
          {visibleMenuItems.map(item => <NavLink key={item.title} to={item.url} end={item.url === "/"} className={({
          isActive
        }) => `px-2 xl:px-3 py-2 text-sm xl:text-base font-bold transition-all duration-200 ease-in-out whitespace-nowrap relative ${isActive ? "text-[#00141d] font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#00141d] after:rounded-t-md" : "text-[#00141d] hover:bg-[#00141d]/10 rounded-lg"}`} style={{
          fontFamily: 'Manrope, sans-serif',
          fontWeight: 700
        }}>
              {item.title}
            </NavLink>)}
        </nav>

        {/* Right Side - Desktop */}
        <div className="hidden lg:flex items-center gap-2 xl:gap-3">
          <ConnectionIndicator />
          <NotificationBell />
          <UserMenu />
        </div>

        {/* Mobile Menu Button */}
        <div className="flex lg:hidden flex-1 items-center justify-end gap-2">
          <NotificationBell />
          
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-[85vw] max-w-sm sm:w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <img src={symbolRhelloNew} alt="rhello" className="h-8 w-8" />
                  <span className="text-base font-bold text-foreground">
                    rhello
                  </span>
                </SheetTitle>
              </SheetHeader>

              <nav className="mt-8 flex flex-col gap-2">
                {visibleMenuItems.map(item => <NavLink key={item.title} to={item.url} end={item.url === "/"} onClick={() => setMobileMenuOpen(false)} className={({
                isActive
              }) => `flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${isActive ? "bg-primary/20 text-primary font-bold" : "text-[#00141d] hover:bg-muted"}`}>
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