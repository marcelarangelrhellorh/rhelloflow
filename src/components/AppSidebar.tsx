import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Briefcase, Users, Building2, CheckSquare, BarChart3, ClipboardList, Wrench, FileText, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserRole } from "@/hooks/useUserRole";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";
import { ConnectionIndicator } from "./ConnectionIndicator";
import logoLight from "@/assets/logo-rhello-light.png";
import symbolLight from "@/assets/symbol-rhello-light.png";
const menuItems = [{
  title: "Dashboard",
  url: "/",
  icon: LayoutDashboard,
  roles: ["admin", "recrutador", "cs"]
}, {
  title: "Vagas",
  url: "/vagas",
  icon: Briefcase,
  roles: ["admin", "recrutador", "cs"]
}, {
  title: "Candidatos",
  url: "/candidatos",
  icon: Users,
  roles: ["admin", "recrutador", "cs"]
}, {
  title: "Clientes",
  url: "/gerenciar-empresas",
  icon: Building2,
  roles: ["admin", "recrutador", "cs"]
}, {
  title: "Tarefas",
  url: "/tarefas",
  icon: CheckSquare,
  roles: ["admin", "recrutador", "cs"]
}, {
  title: "Relatórios",
  url: "/relatorios",
  icon: BarChart3,
  roles: ["admin", "recrutador", "cs"]
}, {
  title: "Processos",
  url: "/acompanhamento",
  icon: ClipboardList,
  roles: ["client"]
}];
const toolsItems = [{
  title: "Scorecards",
  url: "/scorecards",
  icon: FileText
}, {
  title: "Estudo de Mercado",
  url: "/estudo-mercado",
  icon: BarChart3
}, {
  title: "Templates WhatsApp",
  url: "/whatsapp-templates",
  icon: MessageSquare
}];
export function AppSidebar() {
  const {
    state,
    toggleSidebar
  } = useSidebar();
  const collapsed = state === "collapsed";
  const {
    roles,
    loading: rolesLoading
  } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };
  const filteredMenuItems = menuItems.filter(item => item.roles.some(role => roles.includes(role as typeof roles[number])));
  const isInternalUser = roles.some(r => ["admin", "recrutador", "cs"].includes(r));
  if (rolesLoading) return null;
  return <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      <SidebarHeader className={`${collapsed ? 'p-2' : 'p-4'} space-y-4`}>
        <div className="flex items-center justify-between">
          {collapsed ? <img src={symbolLight} alt="rhello" className="h-8 w-8" /> : <img alt="rhello" className="h-8" src="/lovable-uploads/6bff9b8e-8a55-40d2-a107-0543e7b70ad7.png" />}
        </div>
        
        <div className={`flex ${collapsed ? "flex-col items-center gap-2" : "items-center justify-between"}`}>
          <div className={`flex ${collapsed ? "flex-col" : "flex-row"} items-center gap-2`}>
            <ConnectionIndicator />
            <NotificationBell />
            <UserMenu />
          </div>
          
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {filteredMenuItems.map(item => <SidebarMenuItem key={item.title}>
                  {collapsed ? <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton onClick={() => navigate(item.url)} isActive={isActive(item.url)} className="justify-center">
                          <item.icon className="h-5 w-5" />
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.title}
                      </TooltipContent>
                    </Tooltip> : <SidebarMenuButton onClick={() => navigate(item.url)} isActive={isActive(item.url)}>
                      <item.icon className="h-5 w-5" />
                      <span className="font-semibold">{item.title}</span>
                    </SidebarMenuButton>}
                </SidebarMenuItem>)}

              {/* Tools dropdown for internal users */}
              {isInternalUser && <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      {collapsed ? <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton className="justify-center">
                              <Wrench className="h-5 w-5" />
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            Ferramentas
                          </TooltipContent>
                        </Tooltip> : <SidebarMenuButton>
                          <Wrench className="h-5 w-5" />
                          <span className="font-semibold">Ferramentas</span>
                        </SidebarMenuButton>}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-48">
                      {toolsItems.map(tool => <DropdownMenuItem key={tool.title} onClick={() => navigate(tool.url)} className="cursor-pointer">
                          <tool.icon className="mr-2 h-4 w-4" />
                          {tool.title}
                        </DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

    </Sidebar>;
}