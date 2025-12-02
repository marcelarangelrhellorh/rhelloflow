import { useState, useMemo } from "react";
import { Plus, Search, LayoutGrid, List, Video, ListTodo, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskModal from "@/components/Tasks/TaskModal";
import MeetingModal from "@/components/Tasks/MeetingModal";
import TaskCard from "@/components/Tasks/TaskCard";
import TaskKanban from "@/components/Tasks/TaskKanban";
import TasksDashboard from "@/components/Tasks/TasksDashboard";
import GoogleCalendarButton from "@/components/Tasks/GoogleCalendarButton";
import CalendarView from "@/components/Tasks/CalendarView";
import { TaskDetailDrawer } from "@/components/VagaDetalhes/TaskDetailDrawer";
import { Task, TaskFilters, useTasks, useDeleteTask, useUpdateTask } from "@/hooks/useTasks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import moment from "moment";
export default function Tarefas() {
  const [view, setView] = useState<"list" | "kanban" | "calendar">("kanban");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [taskForDetail, setTaskForDetail] = useState<Task | null>(null);
  const [externalEventDetail, setExternalEventDetail] = useState<any>(null);
  const [filters, setFilters] = useState<TaskFilters>({
    status: undefined,
    priority: undefined,
    assignee_id: undefined,
    search: undefined
  });
  const {
    data: tasks,
    isLoading
  } = useTasks(filters);
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const { getSyncedEvents } = useGoogleCalendar();

  // Fetch external calendar events
  const { data: externalEvents } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: async () => {
      const timeMin = moment().subtract(3, 'months').toISOString();
      const timeMax = moment().add(3, 'months').toISOString();
      return await getSyncedEvents(timeMin, timeMax);
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Load users for filter
  const {
    data: users
  } = useQuery({
    queryKey: ["users-for-filter"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("profiles").select("id, full_name").order("full_name");
      if (error) throw error;
      return data;
    }
  });
  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    if (task.task_type === 'meeting') {
      setMeetingModalOpen(true);
    } else {
      setTaskModalOpen(true);
    }
  };
  const handleDelete = (id: string) => {
    setTaskToDelete(id);
    setDeleteDialogOpen(true);
  };
  const confirmDelete = async () => {
    if (taskToDelete) {
      await deleteTask.mutateAsync(taskToDelete);
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };
  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'to_do' : 'done';
    await updateTask.mutateAsync({
      id: task.id,
      status: newStatus
    });
  };
  const handleNewTask = () => {
    setSelectedTask(null);
    setTaskModalOpen(true);
  };
  const handleNewMeeting = () => {
    setSelectedTask(null);
    setMeetingModalOpen(true);
  };
  const handleTaskClick = (task: Task | null, externalEvent?: any) => {
    if (externalEvent) {
      setExternalEventDetail(externalEvent);
      setTaskForDetail(null);
    } else if (task) {
      setTaskForDetail(task);
      setExternalEventDetail(null);
    }
    setDetailDrawerOpen(true);
  };

  // Filter only tasks (not meetings) for Kanban and List views
  const onlyTasks = useMemo(() => {
    return tasks?.filter(task => task.task_type !== 'meeting') || [];
  }, [tasks]);

  // Filter only synced meetings for calendar view (meetings with google_calendar_event_id)
  const syncedMeetings = useMemo(() => {
    return tasks?.filter(task => task.task_type === 'meeting' && task.google_calendar_event_id) || [];
  }, [tasks]);

  // All meetings for empty state check
  const allMeetings = useMemo(() => {
    return tasks?.filter(task => task.task_type === 'meeting') || [];
  }, [tasks]);
  return <div className="min-h-screen bg-[#FFFBF0]">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="w-full py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#00141d]">Tarefas</h1>
              <p className="text-base text-muted-foreground mt-1">
                Gerencie suas tarefas e mantenha o fluxo de trabalho organizado
              </p>
            </div>
            <div className="flex gap-2">
              <GoogleCalendarButton />
              <Button onClick={handleNewMeeting} variant="outline" className="gap-2 font-semibold bg-[#00141d] text-white text-sm">
                <Video className="h-5 w-5" />
                Nova Reunião
              </Button>
              <Button onClick={handleNewTask} className="bg-[#ffcd00] hover:bg-[#ffcd00]/90 text-black font-semibold text-sm">
                <ListTodo className="h-5 w-5 mr-2" />
                Nova Tarefa
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mt-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar tarefas..." className="pl-10" value={filters.search || ""} onChange={e => setFilters({
              ...filters,
              search: e.target.value || undefined
            })} />
            </div>

            <Select value={filters.status || "all"} onValueChange={value => setFilters({
            ...filters,
            status: value === "all" ? undefined : value as any
          })}>
              <SelectTrigger className="w-full md:w-[180px] text-base font-medium">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="to_do">A Fazer</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="done">Concluída</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priority || "all"} onValueChange={value => setFilters({
            ...filters,
            priority: value === "all" ? undefined : value as any
          })}>
              <SelectTrigger className="w-full md:w-[180px] text-base font-medium">
                <SelectValue placeholder="Todas prioridades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas prioridades</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.assignee_id || "all"} onValueChange={value => setFilters({
            ...filters,
            assignee_id: value === "all" ? undefined : value
          })}>
              <SelectTrigger className="w-full md:w-[200px] text-base font-medium">
                <SelectValue placeholder="Todos responsáveis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos responsáveis</SelectItem>
                {users?.map(user => <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>)}
              </SelectContent>
            </Select>

            <Tabs value={view} onValueChange={v => setView(v as "list" | "kanban" | "calendar")}>
              <TabsList>
                <TabsTrigger value="kanban">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List className="h-4 w-4 mr-2" />
                  Lista
                </TabsTrigger>
                <TabsTrigger value="calendar">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Agenda
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard - hide on calendar view */}
        {view !== "calendar" && <div className="mb-8">
            <TasksDashboard onTaskClick={handleEdit} />
          </div>}

        {isLoading ? <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
          </div> : view === "calendar" ? syncedMeetings.length === 0 ? <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-4">
                {allMeetings.length === 0 ? "Nenhuma reunião agendada" : "Nenhuma reunião sincronizada com o Google Calendar"}
              </p>
              <Button onClick={handleNewMeeting} variant="outline" className="gap-2">
                <Video className="h-5 w-5" />
                {allMeetings.length === 0 ? "Criar sua primeira reunião" : "Criar e sincronizar reunião"}
              </Button>
            </div> : <CalendarView meetings={syncedMeetings} externalEvents={externalEvents} onEventClick={handleTaskClick} /> : onlyTasks.length === 0 ? <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-4">Nenhuma tarefa encontrada</p>
            <Button onClick={handleNewTask} className="bg-[#ffcd00] hover:bg-[#ffcd00]/90 text-black font-semibold">
              <Plus className="h-5 w-5 mr-2" />
              Criar sua primeira tarefa
            </Button>
          </div> : view === "kanban" ? <TaskKanban tasks={onlyTasks} onEdit={handleEdit} onDelete={handleDelete} onTaskClick={handleTaskClick} /> : <div className="space-y-4">
            {onlyTasks.map(task => <TaskCard key={task.id} task={task} onEdit={handleEdit} onDelete={handleDelete} onToggleComplete={handleToggleComplete} onCardClick={handleTaskClick} />)}
          </div>}
      </div>

      {/* Modals */}
      <TaskModal open={taskModalOpen} onClose={() => setTaskModalOpen(false)} task={selectedTask} />
      <MeetingModal open={meetingModalOpen} onClose={() => setMeetingModalOpen(false)} task={selectedTask} />
      
      {taskForDetail && (
        <TaskDetailDrawer 
          task={taskForDetail} 
          open={detailDrawerOpen} 
          onOpenChange={open => {
            setDetailDrawerOpen(open);
            if (!open) {
              setTaskForDetail(null);
              setExternalEventDetail(null);
            }
          }} 
          onEdit={handleEdit} 
          onDelete={() => taskForDetail && handleDelete(taskForDetail.id)} 
          onToggleComplete={() => taskForDetail && handleToggleComplete(taskForDetail)} 
        />
      )}

      {externalEventDetail && (
        <TaskDetailDrawer 
          task={null}
          externalEvent={externalEventDetail}
          open={detailDrawerOpen} 
          onOpenChange={open => {
            setDetailDrawerOpen(open);
            if (!open) {
              setTaskForDetail(null);
              setExternalEventDetail(null);
            }
          }} 
          onEdit={() => {}}
          onDelete={() => {}}
          onToggleComplete={() => {}}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}