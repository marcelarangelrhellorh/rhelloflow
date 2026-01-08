import { useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, parseISO, isSameDay, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Task } from '@/hooks/useTasks';
import { Video, Clock } from 'lucide-react';
import { logger } from '@/lib/logger';

// Configure date-fns localizer (replaces moment - saves ~232KB)
const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales,
});

// Helper function to parse date and time
const parseDateTime = (dateStr: string, timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = parseISO(dateStr);
  return setMinutes(setHours(date, hours || 0), minutes || 0);
};
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: Task;
  isExternal?: boolean;
  allDay?: boolean;
  description?: string;
  meetLink?: string;
}

interface CalendarViewProps {
  meetings: Task[];
  tasks?: Task[];
  externalEvents?: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    allDay?: boolean;
    description?: string;
    meetLink?: string;
    isFromSystem: boolean;
  }>;
  onEventClick: (task: Task | null, externalEvent?: any) => void;
}

// Custom event component with better visibility
const EventComponent = ({
  event
}: {
  event: CalendarEvent;
}) => {
  const startTime = format(event.start, 'HH:mm');
  const endTime = format(event.end, 'HH:mm');
  return <div className="flex flex-col gap-0.5 p-1 h-full overflow-hidden">
      <div className="flex items-center gap-1.5">
        <Video className="h-3.5 w-3.5 flex-shrink-0 text-white" />
        <span className="font-semibold text-sm truncate text-white">{event.title}</span>
      </div>
      <div className="flex items-center gap-1 text-white/80">
        <Clock className="h-3 w-3 flex-shrink-0" />
        <span className="font-semibold text-sm">{startTime} - {endTime}</span>
      </div>
    </div>;
};

// Messages in Portuguese
const messages = {
  allDay: 'Dia inteiro',
  previous: '← Anterior',
  next: 'Próximo →',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Lista',
  date: 'Data',
  time: 'Horário',
  event: 'Reunião',
  noEventsInRange: 'Nenhuma reunião agendada neste período.',
  showMore: (total: number) => `+ ${total} reunião(ões)`,
  work_week: 'Semana útil'
};

// Custom toolbar component
const CustomToolbar = ({
  label,
  onNavigate,
  onView,
  view
}: any) => {
  return <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
      <div className="flex items-center gap-2">
        <button onClick={() => onNavigate('TODAY')} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          Hoje
        </button>
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button onClick={() => onNavigate('PREV')} className="px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
            ←
          </button>
          <button onClick={() => onNavigate('NEXT')} className="px-3 py-2 text-sm font-medium hover:bg-muted transition-colors border-l border-border">
            →
          </button>
        </div>
      </div>
      
      <h2 className="text-xl font-bold text-foreground capitalize">{label}</h2>
      
      <div className="flex items-center border border-border rounded-lg overflow-hidden">
        {[{
        key: Views.MONTH,
        label: 'Mês'
      }, {
        key: Views.WEEK,
        label: 'Semana'
      }, {
        key: Views.DAY,
        label: 'Dia'
      }, {
        key: Views.AGENDA,
        label: 'Lista'
      }].map((item, index) => <button key={item.key} onClick={() => onView(item.key)} className={`px-4 py-2 text-sm font-medium transition-colors ${index > 0 ? 'border-l border-border' : ''} ${view === item.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
            {item.label}
          </button>)}
      </div>
    </div>;
};
export default function CalendarView({
  meetings,
  tasks = [],
  externalEvents = [],
  onEventClick
}: CalendarViewProps) {
  // Convert meetings and external events to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    // System meetings
    const systemEvents = meetings
      .filter(meeting => meeting.due_date && meeting.start_time)
      .map(meeting => {
        const dateStr = meeting.due_date!;
        const startTime = meeting.start_time || '09:00';
        const endTime = meeting.end_time || '10:00';
        const start = parseDateTime(dateStr, startTime);
        const end = parseDateTime(dateStr, endTime);
        return {
          id: meeting.id,
          title: meeting.title,
          start,
          end,
          resource: meeting,
          isExternal: false,
          allDay: false,
        };
      });

    // Tasks with due_date (shown as all-day events)
    const taskEvents = tasks
      .filter(task => task.due_date)
      .map(task => {
        const date = parseISO(task.due_date!);
        return {
          id: task.id,
          title: task.title,
          start: date,
          end: date,
          resource: task,
          isExternal: false,
          allDay: true,
        };
      });

    // External Calendar events (not created in system)
    const calendarEvents = externalEvents
      .filter(event => !event.isFromSystem) // Only non-system events
      .map(event => {
        // Detect all-day events: either explicit flag or date string without time component
        const isAllDay = event.allDay || (!event.start.includes('T'));
        
        let start: Date;
        let end: Date;
        
        if (isAllDay) {
          // For all-day events, parse as local date (not UTC)
          start = parseISO(event.start);
          end = parseISO(event.end);
        } else {
          start = parseISO(event.start);
          end = parseISO(event.end);
        }
        
        return {
          id: event.id,
          title: event.title,
          start,
          end,
          isExternal: true,
          allDay: isAllDay,
          description: event.description,
          meetLink: event.meetLink,
        };
      });

    // Debug logs
    logger.log('[CalendarView] Processed events:', {
      systemCount: systemEvents.length,
      taskCount: taskEvents.length,
      externalCount: calendarEvents.length,
      totalEvents: systemEvents.length + taskEvents.length + calendarEvents.length,
      externalSample: calendarEvents.slice(0, 3).map(e => ({
        title: e.title,
        start: e.start.toISOString(),
        end: e.end.toISOString(),
        allDay: e.allDay
      }))
    });

    return [...systemEvents, ...taskEvents, ...calendarEvents];
  }, [meetings, tasks, externalEvents]);
  const handleSelectEvent = (event: CalendarEvent) => {
    if (event.isExternal) {
      onEventClick(null, {
        id: event.id,
        title: event.title,
        description: event.description || '',
        start: event.start,
        end: event.end,
        meetLink: event.meetLink,
      });
    } else if (event.resource) {
      onEventClick(event.resource);
    }
  };

  // Custom styling for events
  const eventStyleGetter = (event: CalendarEvent) => {
    if (event.isExternal) {
      // External events from Google Calendar
      return {
        style: {
          backgroundColor: 'hsl(var(--secondary))',
          borderRadius: '6px',
          opacity: 0.85,
          color: 'hsl(var(--secondary-foreground))',
          border: '1px dashed hsl(var(--border))',
          padding: '4px 8px',
          fontSize: '13px',
          fontWeight: 500,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          cursor: 'pointer'
        }
      };
    }

    const task = event.resource;
    const isCompleted = task?.status === 'done';
    return {
      style: {
        backgroundColor: isCompleted ? 'hsl(var(--muted))' : 'hsl(var(--primary))',
        borderRadius: '6px',
        opacity: isCompleted ? 0.7 : 1,
        color: isCompleted ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary-foreground))',
        border: 'none',
        padding: '4px 8px',
        fontSize: '13px',
        fontWeight: 500,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        cursor: 'pointer'
      }
    };
  };

  // Day cell styling
  const dayPropGetter = (date: Date) => {
    const isToday = isSameDay(date, new Date());
    return {
      style: {
        backgroundColor: isToday ? 'hsl(var(--primary) / 0.05)' : undefined
      }
    };
  };
  return <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <style>{`
        .rbc-calendar {
          font-family: inherit;
          min-height: 800px;
        }
        
        /* Header styling */
        .rbc-header {
          padding: 12px 8px;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: hsl(var(--muted-foreground));
          background: hsl(var(--muted) / 0.3);
          border-bottom: 1px solid hsl(var(--border)) !important;
        }
        
        /* Month view */
        .rbc-month-view {
          border: 1px solid hsl(var(--border));
          border-radius: 12px;
          overflow: hidden;
          background: hsl(var(--card));
        }
        
        .rbc-month-row {
          min-height: 120px;
        }
        
        .rbc-day-bg {
          background: hsl(var(--card));
          transition: background-color 0.2s;
        }
        
        .rbc-day-bg:hover {
          background: hsl(var(--muted) / 0.3);
        }
        
        .rbc-day-bg + .rbc-day-bg {
          border-left: 1px solid hsl(var(--border));
        }
        
        .rbc-month-row + .rbc-month-row {
          border-top: 1px solid hsl(var(--border));
        }
        
        .rbc-off-range-bg {
          background: hsl(var(--muted) / 0.2);
        }
        
        .rbc-today {
          background-color: hsl(var(--primary) / 0.08) !important;
        }
        
        /* Date cell */
        .rbc-date-cell {
          text-align: right;
          padding: 8px 12px;
          font-size: 14px;
          font-weight: 500;
          color: hsl(var(--muted-foreground));
        }
        
        .rbc-date-cell.rbc-now {
          font-weight: 700;
          color: hsl(var(--primary));
        }
        
        .rbc-date-cell.rbc-now > a {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          padding: 4px 8px;
          border-radius: 50%;
          display: inline-block;
          min-width: 28px;
          text-align: center;
        }
        
        /* Events */
        .rbc-event {
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          min-height: 28px;
        }
        
        .rbc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
        }
        
        .rbc-event:focus {
          outline: 2px solid hsl(var(--ring));
          outline-offset: 2px;
        }
        
        .rbc-event-content {
          font-size: 13px;
          font-weight: 500;
        }
        
        .rbc-row-segment {
          padding: 2px 4px;
        }
        
        /* Show more link */
        .rbc-show-more {
          color: hsl(var(--primary));
          font-weight: 600;
          font-size: 12px;
          padding: 4px 8px;
          background: hsl(var(--primary) / 0.1);
          border-radius: 4px;
          margin: 2px 4px;
        }
        
        .rbc-show-more:hover {
          background: hsl(var(--primary) / 0.2);
        }
        
        /* Week and Day views */
        .rbc-time-view {
          border: 1px solid hsl(var(--border));
          border-radius: 12px;
          overflow: hidden;
          background: hsl(var(--card));
        }
        
        .rbc-time-header {
          border-bottom: 1px solid hsl(var(--border));
        }
        
        .rbc-time-header-content {
          border-left: 1px solid hsl(var(--border));
        }
        
        .rbc-time-content {
          border-top: none;
        }
        
        .rbc-time-content > * + * > * {
          border-left: 1px solid hsl(var(--border));
        }
        
        .rbc-timeslot-group {
          border-bottom: 1px solid hsl(var(--border) / 0.5);
          min-height: 60px;
        }
        
        .rbc-time-slot {
          font-size: 12px;
          color: hsl(var(--muted-foreground));
          padding: 4px 8px;
        }
        
        .rbc-label {
          font-size: 12px;
          font-weight: 500;
          color: hsl(var(--muted-foreground));
          padding: 8px;
        }
        
        .rbc-current-time-indicator {
          background-color: hsl(var(--destructive));
          height: 2px;
        }
        
        .rbc-current-time-indicator::before {
          content: '';
          position: absolute;
          left: -6px;
          top: -4px;
          width: 10px;
          height: 10px;
          background: hsl(var(--destructive));
          border-radius: 50%;
        }
        
        /* Agenda view */
        .rbc-agenda-view {
          border: 1px solid hsl(var(--border));
          border-radius: 12px;
          overflow: hidden;
          background: hsl(var(--card));
        }
        
        .rbc-agenda-view table.rbc-agenda-table {
          border: none;
        }
        
        .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
          padding: 12px 16px;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: hsl(var(--muted-foreground));
          background: hsl(var(--muted) / 0.3);
          border-bottom: 1px solid hsl(var(--border));
        }
        
        .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
          padding: 12px 16px;
          border-bottom: 1px solid hsl(var(--border) / 0.5);
          vertical-align: middle;
        }
        
        .rbc-agenda-view table.rbc-agenda-table tbody > tr:hover {
          background: hsl(var(--muted) / 0.3);
        }
        
        .rbc-agenda-date-cell,
        .rbc-agenda-time-cell {
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          color: hsl(var(--foreground));
        }
        
        .rbc-agenda-event-cell {
          font-size: 14px;
          font-weight: 500;
        }
        
        /* Toolbar override (hidden since we use custom) */
        .rbc-toolbar {
          display: none;
        }
        
        /* Overlay styling */
        .rbc-overlay {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          padding: 8px;
          z-index: 50;
        }
        
        .rbc-overlay-header {
          padding: 8px 12px;
          font-weight: 600;
          font-size: 14px;
          border-bottom: 1px solid hsl(var(--border));
          margin-bottom: 8px;
          color: hsl(var(--foreground));
        }
        
        /* Selected slot */
        .rbc-slot-selection {
          background: hsl(var(--primary) / 0.2);
          border: 1px dashed hsl(var(--primary));
        }
        
        /* All day row */
        .rbc-allday-cell {
          min-height: 40px;
        }
        
        .rbc-row-bg {
          border-bottom: 1px solid hsl(var(--border));
        }
      `}</style>
      
      <Calendar localizer={localizer} events={events} startAccessor="start" endAccessor="end" style={{
      height: 800
    }} messages={messages} views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]} defaultView={Views.MONTH} onSelectEvent={handleSelectEvent} eventPropGetter={eventStyleGetter} dayPropGetter={dayPropGetter} components={{
      event: EventComponent,
      toolbar: CustomToolbar
    }} popup selectable={false} step={30} timeslots={2} min={setMinutes(setHours(new Date(), 7), 0)} max={setMinutes(setHours(new Date(), 22), 0)} formats={{
      dayFormat: (date: Date) => format(date, 'EEE dd/MM', { locale: ptBR }),
      weekdayFormat: (date: Date) => format(date, 'EEE', { locale: ptBR }),
      monthHeaderFormat: (date: Date) => format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      dayHeaderFormat: (date: Date) => format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }),
      dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) => 
        `${format(start, 'dd MMM', { locale: ptBR })} - ${format(end, 'dd MMM yyyy', { locale: ptBR })}`,
      agendaDateFormat: (date: Date) => format(date, 'EEE, dd/MM', { locale: ptBR }),
      agendaTimeFormat: (date: Date) => format(date, 'HH:mm', { locale: ptBR }),
      agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) => 
        `${format(start, 'HH:mm', { locale: ptBR })} - ${format(end, 'HH:mm', { locale: ptBR })}`
    }} />
    </div>;
}