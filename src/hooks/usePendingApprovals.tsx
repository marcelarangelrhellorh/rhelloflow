import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";

export function usePendingApprovals() {
  const [pendingCount, setPendingCount] = useState(0);
  const { isAdmin } = useUserRole();

  useEffect(() => {
    if (!isAdmin) return;

    const loadPendingCount = async () => {
      const { count, error } = await supabase
        .from("deletion_approvals")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (!error && count !== null) {
        setPendingCount(count);
      }
    };

    loadPendingCount();

    // Set up realtime subscription
    const channel = supabase
      .channel("deletion_approvals_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deletion_approvals",
          filter: "status=eq.pending",
        },
        () => {
          loadPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  return { pendingCount };
}
