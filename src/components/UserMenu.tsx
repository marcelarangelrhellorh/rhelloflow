import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Settings, LogOut, Users, FileText, Trash2, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logLogout } from "@/lib/auditLog";
import { useUserRole } from "@/hooks/useUserRole";
import { usePendingApprovals } from "@/hooks/usePendingApprovals";
import { Badge } from "@/components/ui/badge";

export function UserMenu() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { pendingCount } = usePendingApprovals();

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          setUserName(profile.full_name);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Erro ao sair");
      } else {
        // Log logout event
        if (user) {
          await logLogout(user.id);
        }
        toast.success("Logout realizado com sucesso");
        navigate("/login");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Erro ao sair");
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
        aria-label={`Menu do usuário ${userName || 'Usuário'}`}
        aria-haspopup="menu"
      >
        <Avatar 
          className="h-9 w-9 cursor-pointer ring-2 ring-border hover:ring-foreground transition-all"
          role="img"
          aria-label={`Avatar de ${userName || 'Usuário'}`}
        >
          <AvatarFallback className="bg-foreground text-background font-semibold" aria-hidden="true">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64 bg-background">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-base font-semibold leading-none">{userName || "Usuário"}</p>
            <p className="text-sm leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => navigate("/configuracoes")}>
          <User className="mr-2 h-5 w-5" />
          <span className="text-base">Meu perfil</span>
        </DropdownMenuItem>
        
        {isAdmin && (
          <>
            <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => navigate("/gerenciar-usuarios")}>
              <Users className="mr-2 h-5 w-5" />
              <span className="text-base">Gerenciar Usuários</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => navigate("/gerenciar-empresas")}>
              <Building2 className="mr-2 h-5 w-5" />
              <span className="text-base">Gerenciar Clientes</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => navigate("/gerenciar-exclusoes")}>
              <Trash2 className="mr-2 h-5 w-5" />
              <span className="text-base">Gerenciar Exclusões</span>
              {pendingCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{pendingCount}</Badge>
              )}
            </DropdownMenuItem>
            
            <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => navigate("/audit-log")}>
              <FileText className="mr-2 h-5 w-5" />
              <span className="text-base">Auditoria</span>
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => navigate("/configuracoes")}>
          <Settings className="mr-2 h-5 w-5" />
          <span className="text-base">Configurações</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="cursor-pointer py-2.5 text-destructive focus:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-5 w-5" />
          <span className="text-base">Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
