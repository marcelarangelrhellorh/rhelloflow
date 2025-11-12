import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "recrutador" | "cs" | "admin";
type UserType = "rhello" | "external";

export function useUserRole() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [userType, setUserType] = useState<UserType | null>(null);
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
        setUserType(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Carregar roles
      const { data: userRoles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;

      const rolesList = (userRoles || []).map(ur => ur.role as AppRole);
      setRoles(rolesList);
      setIsAdmin(rolesList.includes("admin"));

      // Carregar user_type
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user.id)
        .single();

      setUserType(profile?.user_type || null);
    } catch (error) {
      console.error("Erro ao carregar roles do usuário:", error);
      setRoles([]);
      setUserType(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return { roles, userType, isAdmin, loading, hasRole, reload: loadUserRoles };
}
