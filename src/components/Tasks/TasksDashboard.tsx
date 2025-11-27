import { useState } from "react";
import { AlertCircle, AlertTriangle, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

  if (loadingOverdue || loadingHigh || loadingUrgent) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

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
        return { title: `Tarefas Atrasadas${isAdmin ? " (Sistema)" : ""}`, tasks: overdueTasks || [] };
      case "high":
        return { title: `Prioridade Alta${isAdmin ? " (Sistema)" : ""}`, tasks: highTasks || [] };
      case "urgent":
        return { title: `Prioridade Urgente${isAdmin ? " (Sistema)" : ""}`, tasks: urgentTasks || [] };
      default:
        return { title: "", tasks: [] };
    }
  };

  const drawerData = getDrawerData();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card 
          className="border-red-200 bg-red-50/50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveDrawer("overdue")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Tarefas Atrasadas {isAdmin && "(Sistema)"}
                </p>
                <h3 className="text-3xl font-bold text-red-600 mt-2">
                  {overdueCount}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-orange-200 bg-orange-50/50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveDrawer("high")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Prioridade Alta {isAdmin && "(Sistema)"}
                </p>
                <h3 className="text-3xl font-bold text-orange-600 mt-2">
                  {highCount}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-red-300 bg-red-100/50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveDrawer("urgent")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Prioridade Urgente {isAdmin && "(Sistema)"}
                </p>
                <h3 className="text-3xl font-bold text-red-700 mt-2">
                  {urgentCount}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-200 flex items-center justify-center">
                <Flame className="h-6 w-6 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
