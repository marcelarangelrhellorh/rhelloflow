import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Briefcase, Users, Database, BarChart3, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationBell } from "./NotificationBell";

const menuItems = [
  { title: "Painel", url: "/", icon: LayoutDashboard },
  { title: "Vagas", url: "/vagas", icon: Briefcase },
  { title: "Funil de Vagas", url: "/funil-vagas", icon: Briefcase },
  { title: "Candidatos", url: "/candidatos", icon: Users },
  { title: "Funil de Candidatos", url: "/funil-candidatos", icon: Users },
  { title: "Banco de Talentos", url: "/banco-talentos", icon: Database },
  { title: "Análises", url: "/analises", icon: BarChart3 },
];

export function AppNavbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair");
    } else {
      toast.success("Logout realizado com sucesso");
      navigate("/login");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6 gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2 min-w-fit">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-base font-bold text-primary-foreground">R</span>
          </div>
          <span className="text-lg font-bold hidden sm:inline">Rhello RH</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden md:inline">{item.title}</span>
            </NavLink>
          ))}
        </nav>

        {/* Notificações e Logout */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="shrink-0"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
