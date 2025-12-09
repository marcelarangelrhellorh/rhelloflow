import { useMemo } from "react";
import { Video, Calendar, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import moment from "moment";
interface TodayMeetingsSidebarProps {
  onEventClick?: (event: any) => void;
}
export default function TodayMeetingsSidebar({
  onEventClick
}: TodayMeetingsSidebarProps) {
  const {
    isConnected,
    isLoading: connectionLoading,
    getSyncedEvents
  } = useGoogleCalendar();
  const {
    data: events,
    isLoading: eventsLoading
  } = useQuery({
    queryKey: ['today-calendar-events'],
    queryFn: async () => {
      const startOfDay = moment().startOf('day').toISOString();
      const endOfDay = moment().endOf('day').toISOString();
      return await getSyncedEvents(startOfDay, endOfDay);
    },
    enabled: isConnected,
    refetchInterval: 5 * 60 * 1000
  });
  const todayMeetings = useMemo(() => {
    if (!events) return [];
    return events.filter((event: any) => {
      const eventDate = event.start?.dateTime || event.start?.date;
      if (!eventDate) return false;
      return isToday(parseISO(eventDate));
    }).sort((a: any, b: any) => {
      const dateA = a.start?.dateTime || a.start?.date;
      const dateB = b.start?.dateTime || b.start?.date;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  }, [events]);
  if (connectionLoading) {
    return <Card className="w-full shadow-sm">
        <CardHeader className="p-3 pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>;
  }
  if (!isConnected) {
    return null;
  }
  const formatEventTime = (event: any) => {
    const startTime = event.start?.dateTime;
    const endTime = event.end?.dateTime;
    if (!startTime) return "Dia inteiro";
    const start = format(parseISO(startTime), "HH:mm", {
      locale: ptBR
    });
    const end = endTime ? format(parseISO(endTime), "HH:mm", {
      locale: ptBR
    }) : "";
    return end ? `${start} - ${end}` : start;
  };
  const isEventNow = (event: any) => {
    const startTime = event.start?.dateTime;
    const endTime = event.end?.dateTime;
    if (!startTime || !endTime) return false;
    const now = new Date();
    return now >= new Date(startTime) && now <= new Date(endTime);
  };
  const isEventPast = (event: any) => {
    const endTime = event.end?.dateTime || event.end?.date;
    if (!endTime) return false;
    return new Date() > new Date(endTime);
  };
  return <Card className="w-full shadow-lg">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#00141d]">
          <Calendar className="h-4 w-4 text-[#ffcd00]" />
          Reuniões de Hoje
          {todayMeetings.length > 0 && <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">
              {todayMeetings.length}
            </Badge>}
        </CardTitle>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="p-2">
        {eventsLoading ? <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </div> : todayMeetings.length === 0 ? <div className="text-center py-4">
            <Video className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              Nenhuma reunião hoje
            </p>
          </div> : <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {todayMeetings.map((event: any) => {
          const isNow = isEventNow(event);
          const isPast = isEventPast(event);
          return <div key={event.id} onClick={() => onEventClick?.(event)} className={`p-2 rounded-md border cursor-pointer transition-colors ${isNow ? "bg-[#ffcd00]/20 border-[#ffcd00]" : isPast ? "bg-muted/50 opacity-60" : "bg-white hover:bg-muted/50 border-border"}`}>
                  <div className="flex items-start gap-2">
                    <div className={`p-1 rounded ${isNow ? "bg-[#ffcd00]" : "bg-[#00141d]"}`}>
                      <Video className={`h-3 w-3 ${isNow ? "text-[#00141d]" : "text-white"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${isPast ? "line-through" : ""}`}>
                        {event.summary || "Sem título"}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {formatEventTime(event)}
                        </span>
                        {isNow && <Badge className="text-[9px] px-1 py-0 h-4 bg-green-500">
                            Agora
                          </Badge>}
                      </div>
                    </div>
                  </div>
                  
                  {event.hangoutLink && !isPast && <Button size="sm" variant="ghost" className="w-full mt-1.5 h-6 text-[10px] gap-1" onClick={e => {
              e.stopPropagation();
              window.open(event.hangoutLink, '_blank');
            }}>
                      <ExternalLink className="h-3 w-3" />
                      Entrar na reunião
                    </Button>}
                </div>;
        })}
          </div>}
      </CardContent>
    </Card>;
}