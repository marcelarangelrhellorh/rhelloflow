import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_TIMES, queryKeys } from "@/lib/queryConfig";

export interface User {
  id: string;
  name: string;
  email: string;
  active: boolean;
  roles?: string[];
}

type RoleFilter = 'recrutador' | 'cs' | 'admin' | 'viewer' | 'client';

async function fetchUsers(roleFilter?: RoleFilter): Promise<User[]> {
  // Fetch all active users
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('*')
    .eq('active', true)
    .order('name');

  if (usersError) throw usersError;

  // If a role filter is provided, fetch user roles and filter
  if (roleFilter && usersData) {
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('role', roleFilter);

    if (rolesError) throw rolesError;

    const userIdsWithRole = new Set(rolesData?.map(r => r.user_id) || []);
    return usersData.filter(user => userIdsWithRole.has(user.id)) as User[];
  }

  return (usersData || []) as User[];
}

export function useUsersQuery(roleFilter?: RoleFilter) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.users(roleFilter),
    queryFn: () => fetchUsers(roleFilter),
    staleTime: CACHE_TIMES.DEFAULT.staleTime,
    gcTime: CACHE_TIMES.DEFAULT.gcTime,
  });

  return {
    users: data ?? [],
    loading: isLoading,
    reload: refetch,
  };
}
