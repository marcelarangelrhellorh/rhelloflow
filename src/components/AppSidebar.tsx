import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Briefcase, Users, Building2, CheckSquare, BarChart3, ClipboardList, Wrench, FileText, MessageSquare, ChevronLeft, ChevronRight, GitCompare, FolderHeart } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserRole } from "@/hooks/useUserRole";
import { useSidebarPrefetch } from "@/hooks/useSidebarPrefetch";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";
import { ConnectionIndicator } from "./ConnectionIndicator";
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
const candidatosItems = [{
  title: "Em processo",
  url: "/candidatos",
  icon: Users
}, {
  title: "Banco de Talentos",
  url: "/banco-talentos",
  icon: FolderHeart
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
  title: "Comparador de Cargos",
  url: "/comparador-cargos",
  icon: GitCompare
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
  const { prefetchRoute } = useSidebarPrefetch();
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };
  const filteredMenuItems = menuItems.filter(item => item.roles.some(role => roles.includes(role as typeof roles[number])));
  const isInternalUser = roles.some(r => ["admin", "recrutador", "cs"].includes(r));
  if (rolesLoading) return null;
  return <Sidebar collapsible="icon" className="border-r border-border bg-sidebar" aria-label="Menu de navegação principal">
      <SidebarHeader className={`${collapsed ? 'p-2' : 'p-4'} space-y-4`}>
        <div className="flex items-center justify-between">
          {collapsed ? (
            <img 
              src={symbolLight} 
              alt="rhello flow - Sistema de Recrutamento" 
              className="h-8 w-8" 
              width={32} 
              height={32}
              loading="lazy"
            />
          ) : (
          <img 
            alt="rhello flow - Sistema de Recrutamento" 
            className="h-8 w-auto object-contain flex-shrink-0" 
            src="/lovable-uploads/6bff9b8e-8a55-40d2-a107-0543e7b70ad7.png" 
            loading="lazy"
          />
          )}
        </div>
        
        <div className={`flex ${collapsed ? "flex-col items-center gap-2" : "items-center justify-between"}`}>
          <div className={`flex ${collapsed ? "flex-col" : "flex-row"} items-center gap-2`}>
            <ConnectionIndicator />
            <NotificationBell />
            <UserMenu />
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar} 
            className="h-8 w-8"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {filteredMenuItems.slice(0, 2).map(item => <SidebarMenuItem key={item.title}>
                  {collapsed ? <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton 
                          onClick={() => navigate(item.url)} 
                          onMouseEnter={() => prefetchRoute(item.url)}
                          isActive={isActive(item.url)} 
                          className="justify-center"
                        >
                          <item.icon className="h-7 w-7" />
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.title}
                      </TooltipContent>
                    </Tooltip> : <SidebarMenuButton 
                      onClick={() => navigate(item.url)} 
                      onMouseEnter={() => prefetchRoute(item.url)}
                      isActive={isActive(item.url)}
                    >
                      <item.icon className="h-7 w-7" />
                      <span className="text-base">{item.title}</span>
                    </SidebarMenuButton>}
                </SidebarMenuItem>)}

              {/* Candidatos dropdown for internal users */}
              {isInternalUser && <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton 
                        className={collapsed ? "justify-center" : ""}
                        isActive={location.pathname.startsWith('/candidatos') || location.pathname.startsWith('/banco-talentos')}
                        aria-label="Candidatos"
                        aria-haspopup="menu"
                      >
                        <Users className="h-7 w-7" aria-hidden="true" />
                        {!collapsed && <span className="text-base">Candidatos</span>}
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      side="right" 
                      align="start" 
                      className="w-48 bg-white dark:bg-gray-800 z-[100] shadow-lg border border-gray-200 dark:border-gray-700" 
                      role="menu"
                    >
                      {candidatosItems.map(item => <DropdownMenuItem key={item.title} onClick={() => navigate(item.url)} className="cursor-pointer" role="menuitem">
                          <item.icon className="mr-2 h-4 w-4" aria-hidden="true" />
                          {item.title}
                        </DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>}

              {filteredMenuItems.slice(2).map(item => <SidebarMenuItem key={item.title}>
                  {collapsed ? <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton 
                          onClick={() => navigate(item.url)} 
                          onMouseEnter={() => prefetchRoute(item.url)}
                          isActive={isActive(item.url)} 
                          className="justify-center"
                        >
                          <item.icon className="h-7 w-7" />
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.title}
                      </TooltipContent>
                    </Tooltip> : <SidebarMenuButton 
                      onClick={() => navigate(item.url)} 
                      onMouseEnter={() => prefetchRoute(item.url)}
                      isActive={isActive(item.url)}
                    >
                      <item.icon className="h-7 w-7" />
                      <span className="text-base">{item.title}</span>
                    </SidebarMenuButton>}
                </SidebarMenuItem>)}

              {/* Tools dropdown for internal users */}
              {isInternalUser && <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton 
                        className={collapsed ? "justify-center" : ""}
                        aria-label="Ferramentas"
                        aria-haspopup="menu"
                      >
                        <Wrench className="h-7 w-7" aria-hidden="true" />
                        {!collapsed && <span className="text-base">Ferramentas</span>}
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-48" role="menu">
                      {toolsItems.map(tool => <DropdownMenuItem key={tool.title} onClick={() => navigate(tool.url)} className="cursor-pointer" role="menuitem">
                          <tool.icon className="mr-2 h-4 w-4" aria-hidden="true" />
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