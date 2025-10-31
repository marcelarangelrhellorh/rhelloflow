import { useState } from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Database, 
  BarChart3,
  Menu,
  X,
  GitBranch,
  UserCircle
} from "lucide-react";
import { Button } from "./ui/button";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

const menuItems = [
  { title: "Painel", url: "/", icon: LayoutDashboard },
  { title: "Vagas", url: "/vagas", icon: Briefcase },
  { title: "Funil de Vagas", url: "/funil-vagas", icon: GitBranch },
  { title: "Candidatos", url: "/candidatos", icon: Users },
  { title: "Funil de Candidatos", url: "/funil-candidatos", icon: UserCircle },
  { title: "Banco de Talentos", url: "/banco-talentos", icon: Database },
  { title: "Análises", url: "/analises", icon: BarChart3 },
];

export function AppNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background shadow-md">
      <div className="flex h-16 items-center px-4 sm:px-6 gap-4">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 shrink-0 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F9EC3F] transition-transform group-hover:scale-110">
            <span className="text-xl font-bold text-[#00141D]">R</span>
          </div>
          <span className="text-lg font-bold text-[#00141D] hidden sm:inline">
            Rhello RH
          </span>
        </NavLink>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex flex-1 items-center gap-1 overflow-x-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap relative group ${
                  isActive
                    ? "text-[#00141D] font-semibold"
                    : "text-[#36404A] hover:bg-[#FFF59D]/30"
                } ${isActive ? "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-[#F9EC3F] after:rounded-t-md" : ""}`
              }
            >
              <item.icon className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span>{item.title}</span>
            </NavLink>
          ))}
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F9EC3F]">
                    <span className="text-base font-bold text-[#00141D]">R</span>
                  </div>
                  <span className="text-base font-bold text-[#00141D]">
                    Rhello RH
                  </span>
                </SheetTitle>
              </SheetHeader>

              <nav className="mt-8 flex flex-col gap-2">
                {menuItems.map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    end={item.url === "/"}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-[#F9EC3F]/20 text-[#00141D] font-semibold"
                          : "text-[#36404A] hover:bg-muted"
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5" />
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
