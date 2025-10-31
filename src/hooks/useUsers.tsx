import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'recrutador' | 'cs' | 'viewer';
  active: boolean;
}

export function useUsers(role?: 'recrutador' | 'cs') {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, [role]);

  const loadUsers = async () => {
    try {
      let query = supabase
        .from('users')
        .select('*')
        .eq('active', true)
        .order('name');

      if (role) {
        query = query.eq('role', role);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers((data || []) as User[]);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  return { users, loading, reload: loadUsers };
}
