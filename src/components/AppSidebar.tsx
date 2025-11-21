import { Target, MessageSquare, TrendingUp } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { 
    title: "Scorecards", 
    url: "/scorecards", 
    icon: Target 
  },
  { 
    title: "Templates WhatsApp", 
    url: "/whatsapp-templates", 
    icon: MessageSquare 
  },
  { 
    title: "Estudo de Mercado", 
    url: "/estudo-mercado", 
    icon: TrendingUp 
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar
      collapsible="icon"
      side="left"
    >
      <SidebarContent className="bg-[#fffdf6] pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => 
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isActive 
                            ? "bg-[#ffcd00] text-[#00141d] font-bold" 
                            : "text-[#00141d] hover:bg-[#ffcd00]/20"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="font-semibold">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
