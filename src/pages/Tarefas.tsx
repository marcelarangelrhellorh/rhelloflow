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
import TodayMeetingsSidebar from "@/components/Tasks/TodayMeetingsSidebar";
import { TaskDetailDrawer } from "@/components/VagaDetalhes/TaskDetailDrawer";
import { Task, TaskFilters, useTasks, useDeleteTask, useUpdateTask } from "@/hooks/useTasks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import moment from "moment";
import { logger } from "@/lib/logger";

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

  const { data: tasks, isLoading } = useTasks(filters);
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const { getSyncedEvents } = useGoogleCalendar();

  // Fetch external calendar events - optimized: 1 month past + 2 months future
  const { data: externalEvents = [], isLoading: isLoadingExternalEvents } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: async () => {
      const timeMin = moment().subtract(1, 'month').toISOString();
      const timeMax = moment().add(2, 'months').toISOString();
      const events = await getSyncedEvents(timeMin, timeMax);
      return events || [];
    },
    refetchInterval: 5 * 60 * 1000
  });

  // Debug: Log external events for calendar view
  logger.log('[Tarefas] External events for CalendarView:', {
    total: externalEvents?.length || 0,
    externalOnly: externalEvents?.filter(e => !e.isFromSystem).length || 0,
    isLoading: isLoadingExternalEvents,
    events: externalEvents
  });

  // Load users for filter
  const { data: users } = useQuery({
    queryKey: ["users-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name").order("full_name");
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

  // Filter only synced meetings for calendar view
  const syncedMeetings = useMemo(() => {
    return tasks?.filter(task => task.task_type === 'meeting' && task.google_calendar_event_id) || [];
  }, [tasks]);

  // All meetings for empty state check
  const allMeetings = useMemo(() => {
    return tasks?.filter(task => task.task_type === 'meeting') || [];
  }, [tasks]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Simplified */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="w-full py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#00141d]">Tarefas</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Gerencie suas tarefas e reuniões
              </p>
            </div>
            <div className="flex gap-2">
              <GoogleCalendarButton />
              <Button onClick={handleNewMeeting} variant="outline" className="gap-2 font-semibold bg-[#00141d] text-white text-sm">
                <Video className="h-4 w-4" />
                Nova Reunião
              </Button>
              <Button onClick={handleNewTask} className="bg-[#ffcd00] hover:bg-[#ffcd00]/90 text-black font-semibold text-sm">
                <ListTodo className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Column - Main Content (3/4) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Filters Row */}
            <div className="bg-white rounded-lg border p-4 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar tarefas..." 
                    className="pl-10 h-9" 
                    value={filters.search || ""} 
                    onChange={e => setFilters({ ...filters, search: e.target.value || undefined })} 
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Select 
                    value={filters.status || "all"} 
                    onValueChange={value => setFilters({ ...filters, status: value === "all" ? undefined : value as any })}
                  >
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos status</SelectItem>
                      <SelectItem value="to_do">A Fazer</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="done">Concluída</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select 
                    value={filters.priority || "all"} 
                    onValueChange={value => setFilters({ ...filters, priority: value === "all" ? undefined : value as any })}
                  >
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select 
                    value={filters.assignee_id || "all"} 
                    onValueChange={value => setFilters({ ...filters, assignee_id: value === "all" ? undefined : value })}
                  >
                    <SelectTrigger className="w-[160px] h-9 text-sm">
                      <SelectValue placeholder="Responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {users?.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Tabs value={view} onValueChange={v => setView(v as "list" | "kanban" | "calendar")}>
                    <TabsList className="h-9">
                      <TabsTrigger value="kanban" className="text-xs px-3">
                        <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                        Kanban
                      </TabsTrigger>
                      <TabsTrigger value="list" className="text-xs px-3">
                        <List className="h-3.5 w-3.5 mr-1.5" />
                        Lista
                      </TabsTrigger>
                      <TabsTrigger value="calendar" className="text-xs px-3">
                        <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                        Agenda
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </div>

            {/* Task Content */}
            <div className="w-full">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
                </div>
              ) : view === "calendar" ? (
                syncedMeetings.length === 0 && (!externalEvents || externalEvents.length === 0) ? (
                  <div className="text-center py-16 bg-white rounded-lg border">
                    <p className="text-muted-foreground text-lg mb-4">
                      {allMeetings.length === 0 ? "Nenhuma reunião agendada" : "Nenhuma reunião sincronizada"}
                    </p>
                    <Button onClick={handleNewMeeting} variant="outline" className="gap-2">
                      <Video className="h-5 w-5" />
                      {allMeetings.length === 0 ? "Criar primeira reunião" : "Criar e sincronizar"}
                    </Button>
                  </div>
                ) : (
                  <CalendarView 
                    meetings={syncedMeetings} 
                    externalEvents={externalEvents} 
                    onEventClick={handleTaskClick} 
                  />
                )
              ) : onlyTasks.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border">
                  <p className="text-muted-foreground text-lg mb-4">Nenhuma tarefa encontrada</p>
                  <Button onClick={handleNewTask} className="bg-[#ffcd00] hover:bg-[#ffcd00]/90 text-black font-semibold">
                    <Plus className="h-5 w-5 mr-2" />
                    Criar sua primeira tarefa
                  </Button>
                </div>
              ) : view === "kanban" ? (
                <TaskKanban 
                  tasks={onlyTasks} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete} 
                  onTaskClick={handleTaskClick} 
                />
              ) : (
                <div className="space-y-3">
                  {onlyTasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onEdit={handleEdit} 
                      onDelete={handleDelete} 
                      onToggleComplete={handleToggleComplete} 
                      onCardClick={handleTaskClick} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar (1/4) */}
          {view !== "calendar" && (
            <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-24 lg:self-start">
              <TasksDashboard onTaskClick={handleEdit} />
              <TodayMeetingsSidebar 
                onEventClick={async event => {
                  // Check if this is an external Google Calendar event or a local meeting
                  if (event.isExternal) {
                    // External event: convert to externalEvent format
                    const today = new Date();
                    const todayStr = moment(today).format('YYYY-MM-DD');
                    
                    const externalEvent = {
                      id: event.id,
                      title: event.title,
                      description: '',
                      start: event.start_time 
                        ? new Date(`${todayStr}T${event.start_time}`) 
                        : today,
                      end: event.end_time 
                        ? new Date(`${todayStr}T${event.end_time}`) 
                        : today,
                      meetLink: event.google_meet_link
                    };
                    handleTaskClick(null, externalEvent);
                  } else {
                    // Local meeting: fetch full task data and open with edit options
                    const { data: taskData } = await supabase
                      .from('tasks')
                      .select(`
                        *,
                        assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url),
                        vaga:vagas!tasks_vaga_id_fkey(id, titulo)
                      `)
                      .eq('id', event.id)
                      .single();
                    
                    if (taskData) {
                      handleTaskClick(taskData as Task, null);
                    }
                  }
                }} 
              />
            </div>
          )}
        </div>
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
    </div>
  );
}
