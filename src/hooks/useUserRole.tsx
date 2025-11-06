import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "recrutador" | "cs" | "viewer" | "admin";

export function useUserRole() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRoles();
  }, []);

  const loadUserRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRoles([]);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data: userRoles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;

      const rolesList = (userRoles || []).map(ur => ur.role as AppRole);
      setRoles(rolesList);
      setIsAdmin(rolesList.includes("admin"));
    } catch (error) {
      console.error("Erro ao carregar roles do usuário:", error);
      setRoles([]);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return { roles, isAdmin, loading, hasRole, reload: loadUserRoles };
}
