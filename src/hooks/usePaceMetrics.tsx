import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getCurrentWeekRange,
  getLastWeekRange,
  getCurrentMonthRange,
  getElapsedBusinessDays,
  getBusinessDays,
} from "@/lib/dateUtils";

export interface PaceMetrics {
  currentWeekCompleted: number;
  currentWeekBusinessDays: number;
  currentWeekPace: number;

  lastWeekCompleted: number;
  lastWeekBusinessDays: number;
  lastWeekPace: number;

  monthCompleted: number;
  monthBusinessDays: number;
  monthPace: number;

  weekOverWeekChange: number | null;
  isLoading: boolean;
}

interface JobStageHistoryRow {
  job_id: string;
  changed_at: string;
}

export function usePaceMetrics(): PaceMetrics {
  const currentWeek = getCurrentWeekRange();
  const lastWeek = getLastWeekRange();
  const currentMonth = getCurrentMonthRange();

  const { data, isLoading } = useQuery({
    queryKey: ["pace-metrics", currentWeek.start.toISOString(), currentMonth.start.toISOString()],
    queryFn: async () => {
      // Fetch all completions from the start of last week to now
      const startDate = lastWeek.start.toISOString();
      
      const { data: completions, error } = await supabase
        .from("job_stage_history")
        .select("job_id, changed_at")
        .eq("to_status", "Concluída")
        .gte("changed_at", startDate)
        .order("changed_at", { ascending: false });

      if (error) throw error;

      return (completions || []) as JobStageHistoryRow[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const completions = data || [];

  // Filter by period
  const currentWeekCompletions = completions.filter(c => {
    const date = new Date(c.changed_at);
    return date >= currentWeek.start && date <= currentWeek.end;
  });

  const lastWeekCompletions = completions.filter(c => {
    const date = new Date(c.changed_at);
    return date >= lastWeek.start && date <= lastWeek.end;
  });

  const monthCompletions = completions.filter(c => {
    const date = new Date(c.changed_at);
    return date >= currentMonth.start && date <= currentMonth.end;
  });

  // Calculate business days
  const currentWeekBusinessDays = getElapsedBusinessDays(currentWeek.start, currentWeek.end);
  const lastWeekBusinessDays = getBusinessDays(lastWeek.start, lastWeek.end);
  const monthBusinessDays = getElapsedBusinessDays(currentMonth.start, currentMonth.end);

  // Calculate pace (vagas per week = vagas / days * 5)
  const currentWeekPace = currentWeekBusinessDays > 0 
    ? (currentWeekCompletions.length / currentWeekBusinessDays) * 5 
    : 0;
  
  const lastWeekPace = lastWeekBusinessDays > 0 
    ? (lastWeekCompletions.length / lastWeekBusinessDays) * 5 
    : 0;
  
  const monthPace = monthBusinessDays > 0 
    ? (monthCompletions.length / monthBusinessDays) * 5 
    : 0;

  // Calculate week-over-week change
  const weekOverWeekChange = lastWeekPace > 0 
    ? ((currentWeekPace - lastWeekPace) / lastWeekPace) * 100 
    : null;

  return {
    currentWeekCompleted: currentWeekCompletions.length,
    currentWeekBusinessDays,
    currentWeekPace,

    lastWeekCompleted: lastWeekCompletions.length,
    lastWeekBusinessDays,
    lastWeekPace,

    monthCompleted: monthCompletions.length,
    monthBusinessDays,
    monthPace,

    weekOverWeekChange,
    isLoading,
  };
}
