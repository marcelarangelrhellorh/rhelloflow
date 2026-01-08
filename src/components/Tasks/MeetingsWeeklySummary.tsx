import { Calendar, CheckCircle, XCircle, UserX, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format } from "date-fns";

export default function MeetingsWeeklySummary() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['meetings-weekly-summary'],
    queryFn: async () => {
      const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('tasks')
        .select('id, status, meeting_outcome')
        .eq('task_type', 'meeting')
        .gte('due_date', `${sevenDaysAgo}T00:00:00`);

      if (error) throw error;

      const counts = {
        scheduled: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0
      };

      data?.forEach(meeting => {
        if (meeting.status !== 'done') {
          counts.scheduled++;
        } else {
          const outcome = meeting.meeting_outcome || 'completed';
          if (outcome === 'completed') counts.completed++;
          else if (outcome === 'cancelled') counts.cancelled++;
          else if (outcome === 'no_show') counts.no_show++;
        }
      });

      return counts;
    },
    refetchInterval: 60 * 1000
  });

  if (isLoading) {
    return (
      <Card className="w-full shadow-sm">
        <CardHeader className="p-3 pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const summaryItems = [
    {
      label: "Agendadas",
      count: summary?.scheduled || 0,
      icon: Calendar,
      bgColor: "bg-blue-50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      textColor: "text-blue-600",
      borderColor: "border-blue-200"
    },
    {
      label: "Concluídas",
      count: summary?.completed || 0,
      icon: CheckCircle,
      bgColor: "bg-green-50",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      textColor: "text-green-600",
      borderColor: "border-green-200"
    },
    {
      label: "Canceladas",
      count: summary?.cancelled || 0,
      icon: XCircle,
      bgColor: "bg-slate-50",
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
      textColor: "text-slate-600",
      borderColor: "border-slate-200"
    },
    {
      label: "No Show",
      count: summary?.no_show || 0,
      icon: UserX,
      bgColor: "bg-red-50",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      textColor: "text-red-600",
      borderColor: "border-red-200"
    }
  ];

  const total = (summary?.scheduled || 0) + (summary?.completed || 0) + 
                (summary?.cancelled || 0) + (summary?.no_show || 0);

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#00141d]">
          <BarChart3 className="h-4 w-4 text-[#ffcd00]" />
          Resumo Semanal
          <span className="text-xs font-normal text-muted-foreground ml-auto">
            Últimos 7 dias
          </span>
        </CardTitle>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="p-2 space-y-1.5">
        {summaryItems.map(item => (
          <div 
            key={item.label} 
            className={`flex items-center justify-between p-2 rounded-md border ${item.bgColor} ${item.borderColor}`}
          >
            <div className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full ${item.iconBg} flex items-center justify-center`}>
                <item.icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
              </div>
              <span className="text-sm font-medium text-[#00141d]">{item.label}</span>
            </div>
            <span className={`text-lg font-bold ${item.textColor}`}>
              {item.count}
            </span>
          </div>
        ))}
        
        <div className="flex items-center justify-between pt-2 border-t mt-2">
          <span className="text-xs text-muted-foreground">Total de reuniões</span>
          <span className="text-sm font-bold text-[#00141d]">{total}</span>
        </div>
      </CardContent>
    </Card>
  );
}
