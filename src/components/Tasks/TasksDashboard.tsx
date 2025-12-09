import { useState } from "react";
import { AlertCircle, AlertTriangle, Flame, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useOverdueTasks, usePriorityTasks, Task } from "@/hooks/useTasks";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";
import TaskListDrawer from "./TaskListDrawer";

type DrawerType = "overdue" | "high" | "urgent" | null;

interface TasksDashboardProps {
  onTaskClick?: (task: Task) => void;
}

export default function TasksDashboard({ onTaskClick }: TasksDashboardProps) {
  const { isAdmin } = useUserRole();
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);

  const { data: overdueTasks, isLoading: loadingOverdue } = useOverdueTasks(isAdmin);
  const { data: highTasks, isLoading: loadingHigh } = usePriorityTasks("high", isAdmin);
  const { data: urgentTasks, isLoading: loadingUrgent } = usePriorityTasks("urgent", isAdmin);

  const overdueCount = overdueTasks?.length || 0;
  const highCount = highTasks?.length || 0;
  const urgentCount = urgentTasks?.length || 0;

  const handleTaskClick = (task: Task) => {
    setActiveDrawer(null);
    onTaskClick?.(task);
  };

  const getDrawerData = () => {
    switch (activeDrawer) {
      case "overdue":
        return { title: `Tarefas Atrasadas${isAdmin ? " (Geral)" : ""}`, tasks: overdueTasks || [] };
      case "high":
        return { title: `Prioridade Alta${isAdmin ? " (Geral)" : ""}`, tasks: highTasks || [] };
      case "urgent":
        return { title: `Prioridade Urgente${isAdmin ? " (Geral)" : ""}`, tasks: urgentTasks || [] };
      default:
        return { title: "", tasks: [] };
    }
  };

  const drawerData = getDrawerData();

  if (loadingOverdue || loadingHigh || loadingUrgent) {
    return (
      <Card className="w-full shadow-sm">
        <CardHeader className="p-3 pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const alertItems = [
    {
      key: "overdue" as DrawerType,
      label: "Atrasadas",
      count: overdueCount,
      icon: AlertCircle,
      bgColor: "bg-red-50",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      textColor: "text-red-600",
      borderColor: "border-red-200"
    },
    {
      key: "high" as DrawerType,
      label: "Alta Prioridade",
      count: highCount,
      icon: AlertTriangle,
      bgColor: "bg-orange-50",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      textColor: "text-orange-600",
      borderColor: "border-orange-200"
    },
    {
      key: "urgent" as DrawerType,
      label: "Urgente",
      count: urgentCount,
      icon: Flame,
      bgColor: "bg-red-100/60",
      iconBg: "bg-red-200",
      iconColor: "text-red-700",
      textColor: "text-red-700",
      borderColor: "border-red-300"
    }
  ];

  return (
    <>
      <Card className="w-full shadow-sm">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#00141d]">
            <Bell className="h-4 w-4 text-[#ffcd00]" />
            Painel de Alertas
            {isAdmin && <span className="text-xs font-normal text-muted-foreground">(Geral)</span>}
          </CardTitle>
        </CardHeader>
        
        <Separator />
        
        <CardContent className="p-2 space-y-2">
          {alertItems.map(item => (
            <div
              key={item.key}
              onClick={() => setActiveDrawer(item.key)}
              className={`flex items-center justify-between p-2.5 rounded-md border cursor-pointer 
                hover:shadow-sm transition-all ${item.bgColor} ${item.borderColor}`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`h-8 w-8 rounded-full ${item.iconBg} flex items-center justify-center`}>
                  <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                </div>
                <span className="text-sm font-medium text-[#00141d]">{item.label}</span>
              </div>
              <span className={`text-xl font-bold ${item.textColor}`}>
                {item.count}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <TaskListDrawer 
        open={activeDrawer !== null} 
        onClose={() => setActiveDrawer(null)} 
        title={drawerData.title} 
        tasks={drawerData.tasks} 
        onTaskClick={handleTaskClick} 
      />
    </>
  );
}
