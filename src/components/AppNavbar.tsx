import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import logoRhelloDark from "@/assets/logo-rhello-dark.png";
import symbolRhelloLight from "@/assets/symbol-rhello-light.png";

const menuItems = [
  { title: "Dashboard", url: "/" },
  { title: "Vagas", url: "/vagas" },
  { title: "Funil de Vagas", url: "/funil-vagas" },
  { title: "Candidatos", url: "/candidatos" },
  { title: "Funil de Candidatos", url: "/funil-candidatos" },
  { title: "Relatórios", url: "/relatorios" },
];

export function AppNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
      <div className="flex h-16 items-center px-4 sm:px-6 gap-6 max-w-[1600px] mx-auto">
        {/* Logo */}
        <NavLink to="/" className="flex items-center shrink-0">
          <img 
            src={logoRhelloDark} 
            alt="rhello" 
            className="h-8 hidden sm:block"
          />
          <img 
            src={symbolRhelloLight} 
            alt="rhello" 
            className="h-10 w-10 sm:hidden"
          />
        </NavLink>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-6">
          {menuItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/"}
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out whitespace-nowrap relative ${
                  isActive
                    ? "text-[#00141D] font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#F9EC3F] after:rounded-t-md"
                    : "text-[#00141D] hover:bg-[rgba(249,236,63,0.08)] hover:text-[#F9EC3F] rounded-lg"
                }`
              }
              style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 500, fontSize: '14px' }}
            >
              {item.title}
            </NavLink>
          ))}
        </nav>

        {/* Right Side - Desktop */}
        <div className="hidden lg:flex items-center gap-3">
          <Button 
            onClick={() => navigate('/vagas/novo')}
            className="bg-[#F9EC3F] text-[#00141D] font-semibold hover:bg-[#E5DA37] rounded-lg px-4 py-2 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Nova Vaga
          </Button>
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
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <img 
                    src={symbolRhelloLight} 
                    alt="rhello" 
                    className="h-8 w-8"
                  />
                  <span className="text-base font-bold text-[#00141D]">
                    rhello
                  </span>
                </SheetTitle>
              </SheetHeader>

              <nav className="mt-8 flex flex-col gap-2">
                <Button 
                  onClick={() => {
                    navigate('/vagas/novo');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-[#F9EC3F] text-[#00141D] font-semibold hover:bg-[#E5DA37] mb-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Nova Vaga
                </Button>

                {menuItems.map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    end={item.url === "/"}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-[#F9EC3F]/20 text-[#00141D] font-semibold"
                          : "text-[#36404A] hover:bg-muted"
                      }`
                    }
                  >
                    <span>{item.title}</span>
                  </NavLink>
                ))}
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
    </header>
  );
}
