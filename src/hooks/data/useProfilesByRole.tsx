import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type RoleFilter = 'recrutador' | 'cs' | 'admin' | 'viewer' | 'client';

interface Profile {
  id: string;
  full_name: string;
}

async function fetchProfilesByRoles(roles: RoleFilter[]): Promise<Profile[]> {
  // Buscar IDs de usuários com os roles especificados
  const { data: rolesData, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', roles);

  if (rolesError) throw rolesError;

  const userIds = rolesData?.map(r => r.user_id) || [];
  if (userIds.length === 0) return [];

  // Buscar profiles desses usuários
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)
    .order('full_name');

  if (profilesError) throw profilesError;
  return profiles || [];
}

export function useProfilesByRole(roles: RoleFilter[]) {
  return useQuery({
    queryKey: ['profiles-by-role', roles],
    queryFn: () => fetchProfilesByRoles(roles),
    staleTime: 5 * 60 * 1000,
  });
}
