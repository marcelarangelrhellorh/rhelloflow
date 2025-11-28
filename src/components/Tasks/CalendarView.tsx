import { useMemo } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import { Task } from '@/hooks/useTasks';
import { Video } from 'lucide-react';

// Set moment locale to Portuguese
moment.locale('pt-br');

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Task;
}

interface CalendarViewProps {
  meetings: Task[];
  onEventClick: (task: Task) => void;
}

// Custom event component
const EventComponent = ({ event }: { event: CalendarEvent }) => (
  <div className="flex items-center gap-1 text-xs">
    <Video className="h-3 w-3 flex-shrink-0" />
    <span className="truncate">{event.title}</span>
  </div>
);

// Messages in Portuguese
const messages = {
  allDay: 'Dia todo',
  previous: 'Anterior',
  next: 'Próximo',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'Não há reuniões neste período.',
  showMore: (total: number) => `+${total} mais`,
};

export default function CalendarView({ meetings, onEventClick }: CalendarViewProps) {
  // Convert meetings to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return meetings
      .filter(meeting => meeting.due_date && meeting.start_time)
      .map(meeting => {
        const dateStr = meeting.due_date!;
        const startTime = meeting.start_time || '09:00';
        const endTime = meeting.end_time || '10:00';
        
        const start = moment(`${dateStr} ${startTime}`, 'YYYY-MM-DD HH:mm').toDate();
        const end = moment(`${dateStr} ${endTime}`, 'YYYY-MM-DD HH:mm').toDate();
        
        return {
          id: meeting.id,
          title: meeting.title,
          start,
          end,
          resource: meeting,
        };
      });
  }, [meetings]);

  const handleSelectEvent = (event: CalendarEvent) => {
    onEventClick(event.resource);
  };

  // Custom styling for events
  const eventStyleGetter = (event: CalendarEvent) => {
    const task = event.resource;
    const isCompleted = task.status === 'done';
    
    return {
      style: {
        backgroundColor: isCompleted ? '#94a3b8' : '#00141d',
        borderRadius: '4px',
        opacity: isCompleted ? 0.6 : 1,
        color: 'white',
        border: 'none',
        fontSize: '12px',
        padding: '2px 4px',
      },
    };
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <style>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-header {
          padding: 8px 4px;
          font-weight: 600;
          font-size: 14px;
          color: #00141d;
          background: #f8f9fa;
          border-bottom: 1px solid #e5e7eb;
        }
        .rbc-month-view {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        .rbc-day-bg {
          background: white;
        }
        .rbc-day-bg + .rbc-day-bg {
          border-left: 1px solid #e5e7eb;
        }
        .rbc-month-row + .rbc-month-row {
          border-top: 1px solid #e5e7eb;
        }
        .rbc-off-range-bg {
          background: #f8f9fa;
        }
        .rbc-today {
          background-color: #fffbeb !important;
        }
        .rbc-toolbar {
          margin-bottom: 16px;
          gap: 8px;
          flex-wrap: wrap;
        }
        .rbc-toolbar button {
          padding: 8px 16px;
          border: 1px solid #e5e7eb;
          background: white;
          color: #00141d;
          font-weight: 500;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .rbc-toolbar button:hover {
          background: #f8f9fa;
          border-color: #d1d5db;
        }
        .rbc-toolbar button.rbc-active {
          background: #ffcd00;
          border-color: #ffcd00;
          color: #00141d;
          font-weight: 600;
        }
        .rbc-toolbar-label {
          font-weight: 700;
          font-size: 18px;
          color: #00141d;
          text-transform: capitalize;
        }
        .rbc-event {
          cursor: pointer;
        }
        .rbc-event:hover {
          opacity: 0.9;
        }
        .rbc-show-more {
          color: #00141d;
          font-weight: 500;
          font-size: 12px;
        }
        .rbc-date-cell {
          text-align: right;
          padding: 4px 8px;
          font-size: 14px;
          color: #64748b;
        }
        .rbc-date-cell.rbc-now {
          font-weight: 700;
          color: #00141d;
        }
        .rbc-time-view {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        .rbc-time-header {
          border-bottom: 1px solid #e5e7eb;
        }
        .rbc-time-content {
          border-top: none;
        }
        .rbc-timeslot-group {
          border-bottom: 1px solid #f1f5f9;
        }
        .rbc-time-slot {
          font-size: 12px;
          color: #94a3b8;
        }
        .rbc-current-time-indicator {
          background-color: #ef4444;
        }
        .rbc-agenda-view {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        .rbc-agenda-table {
          border: none;
        }
        .rbc-agenda-date-cell,
        .rbc-agenda-time-cell {
          padding: 8px 12px;
          font-size: 14px;
          white-space: nowrap;
        }
        .rbc-agenda-event-cell {
          padding: 8px 12px;
        }
      `}</style>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        messages={messages}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        defaultView={Views.MONTH}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        components={{
          event: EventComponent,
        }}
        popup
        selectable={false}
      />
    </div>
  );
}
