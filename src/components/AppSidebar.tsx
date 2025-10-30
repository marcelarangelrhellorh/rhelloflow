import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Briefcase, Users, Database, BarChart3, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Vagas", url: "/vagas", icon: Briefcase },
  { title: "Funil de Vagas", url: "/funil-vagas", icon: Briefcase },
  { title: "Candidatos", url: "/candidatos", icon: Users },
  { title: "Funil de Candidatos", url: "/funil-candidatos", icon: Users },
  { title: "Banco de Talentos", url: "/banco-talentos", icon: Database },
  { title: "Análises", url: "/analises", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";

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
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">R</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-sidebar-foreground">Rhello RH</h2>
              <p className="text-xs text-sidebar-foreground/60">Gestão de Recrutamento</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary mx-auto">
            <span className="text-lg font-bold text-primary-foreground">R</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
      
      <div className="absolute top-4 -right-3">
        <SidebarTrigger />
      </div>
    </Sidebar>
  );
}
