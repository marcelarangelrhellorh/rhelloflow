import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface User {
  id: string;
  name: string;
  email: string;
  active: boolean;
  roles?: string[]; // Optional roles array
}

export function useUsers(roleFilter?: 'recrutador' | 'cs' | 'admin' | 'viewer') {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const loadUsers = async () => {
    try {
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
        const filteredUsers = usersData.filter(user => userIdsWithRole.has(user.id));
        setUsers(filteredUsers as User[]);
      } else {
        setUsers((usersData || []) as User[]);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  return { users, loading, reload: loadUsers };
}
