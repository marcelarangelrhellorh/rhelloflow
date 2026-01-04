import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Briefcase, Users, Building2, CheckSquare, BarChart3, ClipboardList, Wrench, FileText, MessageSquare, ChevronLeft, ChevronRight, ChevronDown, GitCompare, FolderHeart } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  title: "Avaliações",
  url: "/avaliacoes",
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
function SidebarSkeleton() {
  return <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      <SidebarHeader className="p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2 px-2">
              {[1, 2, 3, 4, 5].map(i => <SidebarMenuItem key={i}>
                  <Skeleton className="h-10 w-full rounded-md" />
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>;
}
export function AppSidebar() {
  const [candidatosOpen, setCandidatosOpen] = useState(false);
  const [ferramentasOpen, setFerramentasOpen] = useState(false);
  const {
    state,
    toggleSidebar
  } = useSidebar();
  const collapsed = state === "collapsed";
  const {
    roles,
    loading: rolesLoading
  } = useUserRole();
  const {
    prefetchRoute
  } = useSidebarPrefetch();
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };
  const filteredMenuItems = menuItems.filter(item => item.roles.some(role => roles.includes(role as typeof roles[number])));
  const isInternalUser = roles.some(r => ["admin", "recrutador", "cs"].includes(r));

  // Mostrar skeleton durante loading em vez de null
  if (rolesLoading) return <SidebarSkeleton />;
  return <Sidebar collapsible="icon" className="border-r border-border bg-sidebar" aria-label="Menu de navegação principal">
      <SidebarHeader className={`${collapsed ? 'p-2' : 'p-4'} space-y-4`}>
        <div className="flex items-center justify-between">
          {collapsed ? <img src={symbolLight} alt="rhello flow - Sistema de Recrutamento" className="h-8 w-8" width={32} height={32} loading="lazy" /> : <img alt="rhello flow - Sistema de Recrutamento" className="h-8 w-auto object-contain flex-shrink-0" src="/lovable-uploads/6bff9b8e-8a55-40d2-a107-0543e7b70ad7.png" loading="lazy" />}
        </div>
        
        <div className={`flex ${collapsed ? "flex-col items-center gap-2" : "items-center justify-between"}`}>
          <div className={`flex ${collapsed ? "flex-col" : "flex-row"} items-center gap-2`}>
            <ConnectionIndicator />
            <NotificationBell />
            <UserMenu />
          </div>
          
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8" aria-label={collapsed ? "Expandir menu" : "Recolher menu"} aria-expanded={!collapsed}>
            {collapsed ? <ChevronRight aria-hidden="true" className="w-[24px] h-[24px]" /> : <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
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
                        <SidebarMenuButton onClick={() => navigate(item.url)} onMouseEnter={() => prefetchRoute(item.url)} isActive={isActive(item.url)} className="justify-center">
                          <item.icon className="h-7 w-7" />
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.title}
                      </TooltipContent>
                    </Tooltip> : <SidebarMenuButton onClick={() => navigate(item.url)} onMouseEnter={() => prefetchRoute(item.url)} isActive={isActive(item.url)}>
                      <item.icon className="h-7 w-7" />
                      <span className="text-base">{item.title}</span>
                    </SidebarMenuButton>}
                </SidebarMenuItem>)}

              {/* Candidatos collapsible for internal users */}
              {isInternalUser && <Collapsible open={candidatosOpen} onOpenChange={setCandidatosOpen}>
                  <SidebarMenuItem>
                    {collapsed ? <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton className="justify-center" isActive={location.pathname.startsWith('/candidatos') || location.pathname.startsWith('/banco-talentos')}>
                            <Users className="h-7 w-7" aria-hidden="true" />
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          Candidatos
                        </TooltipContent>
                      </Tooltip> : <CollapsibleTrigger asChild>
                        <SidebarMenuButton isActive={location.pathname.startsWith('/candidatos') || location.pathname.startsWith('/banco-talentos')} aria-label="Candidatos" aria-expanded={candidatosOpen}>
                          <Users className="h-7 w-7" aria-hidden="true" />
                          <span className="text-base flex-1">Candidatos</span>
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${candidatosOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>}
                  </SidebarMenuItem>
                  
                  {!collapsed && <CollapsibleContent className="pl-4 space-y-1">
                      {candidatosItems.map(item => <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton onClick={() => navigate(item.url)} onMouseEnter={() => prefetchRoute(item.url)} isActive={location.pathname === item.url} className="pl-4">
                            <item.icon className="h-5 w-5" aria-hidden="true" />
                            <span className="text-sm">{item.title}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>)}
                    </CollapsibleContent>}
                </Collapsible>}

              {filteredMenuItems.slice(2).map(item => <SidebarMenuItem key={item.title}>
                  {collapsed ? <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton onClick={() => navigate(item.url)} onMouseEnter={() => prefetchRoute(item.url)} isActive={isActive(item.url)} className="justify-center">
                          <item.icon className="h-7 w-7" />
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.title}
                      </TooltipContent>
                    </Tooltip> : <SidebarMenuButton onClick={() => navigate(item.url)} onMouseEnter={() => prefetchRoute(item.url)} isActive={isActive(item.url)}>
                      <item.icon className="h-7 w-7" />
                      <span className="text-base">{item.title}</span>
                    </SidebarMenuButton>}
                </SidebarMenuItem>)}

              {/* Tools collapsible for internal users */}
              {isInternalUser && <Collapsible open={ferramentasOpen} onOpenChange={setFerramentasOpen}>
                  <SidebarMenuItem>
                    {collapsed ? <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton className="justify-center" isActive={toolsItems.some(t => location.pathname.startsWith(t.url))}>
                            <Wrench className="h-7 w-7" aria-hidden="true" />
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          Ferramentas
                        </TooltipContent>
                      </Tooltip> : <CollapsibleTrigger asChild>
                        <SidebarMenuButton isActive={toolsItems.some(t => location.pathname.startsWith(t.url))} aria-label="Ferramentas" aria-expanded={ferramentasOpen}>
                          <Wrench className="h-7 w-7" aria-hidden="true" />
                          <span className="text-base flex-1">Ferramentas</span>
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${ferramentasOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>}
                  </SidebarMenuItem>
                  
                  {!collapsed && <CollapsibleContent className="pl-4 space-y-1">
                      {toolsItems.map(item => <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton onClick={() => navigate(item.url)} onMouseEnter={() => prefetchRoute(item.url)} isActive={location.pathname === item.url} className="pl-4">
                            <item.icon className="h-5 w-5" aria-hidden="true" />
                            <span className="text-sm">{item.title}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>)}
                    </CollapsibleContent>}
                </Collapsible>}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

    </Sidebar>;
}