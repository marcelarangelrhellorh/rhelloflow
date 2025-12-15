import { Video, Calendar, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";

interface TodayMeetingsSidebarProps {
  onEventClick?: (meeting: any) => void;
}

interface MergedMeeting {
  id: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  google_meet_link?: string | null;
  isExternal: boolean;
}

export default function TodayMeetingsSidebar({
  onEventClick
}: TodayMeetingsSidebarProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { getSyncedEvents, isConnected } = useGoogleCalendar();

  // Fetch local meetings from tasks table
  const { data: localMeetings, isLoading: isLoadingLocal } = useQuery({
    queryKey: ['today-meetings-local', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('task_type', 'meeting')
        .gte('due_date', `${today}T00:00:00`)
        .lte('due_date', `${today}T23:59:59`)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60 * 1000
  });

  // Fetch external Google Calendar events for today
  const { data: externalEvents, isLoading: isLoadingExternal } = useQuery({
    queryKey: ['today-meetings-external', today],
    queryFn: async () => {
      if (!isConnected) return [];
      const timeMin = `${today}T00:00:00Z`;
      const timeMax = `${today}T23:59:59Z`;
      const events = await getSyncedEvents(timeMin, timeMax);
      // Filter only events NOT from the system (external events)
      return events?.filter(e => !e.isFromSystem) || [];
    },
    enabled: isConnected,
    refetchInterval: 5 * 60 * 1000
  });

  // Merge and sort all meetings
  const todayMeetings: MergedMeeting[] = [];

  // Add local meetings
  localMeetings?.forEach((meeting: any) => {
    todayMeetings.push({
      id: meeting.id,
      title: meeting.title || "Sem título",
      start_time: meeting.start_time,
      end_time: meeting.end_time,
      google_meet_link: meeting.google_meet_link,
      isExternal: false
    });
  });

  // Add external events (not already in local)
  externalEvents?.forEach((event: any) => {
    // Check if this event is already synced locally (by google_calendar_event_id)
    const alreadyLocal = localMeetings?.some(
      (m: any) => m.google_calendar_event_id === event.id
    );
    if (!alreadyLocal) {
      todayMeetings.push({
        id: event.id,
        title: event.title || "Sem título",
        start_time: event.start ? format(new Date(event.start), 'HH:mm:ss') : null,
        end_time: event.end ? format(new Date(event.end), 'HH:mm:ss') : null,
        google_meet_link: event.hangoutLink,
        isExternal: true
      });
    }
  });

  // Sort by start_time
  todayMeetings.sort((a, b) => {
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return a.start_time.localeCompare(b.start_time);
  });

  const formatMeetingTime = (meeting: MergedMeeting) => {
    if (!meeting.start_time) return "Dia inteiro";
    const start = meeting.start_time.substring(0, 5);
    const end = meeting.end_time ? meeting.end_time.substring(0, 5) : "";
    return end ? `${start} - ${end}` : start;
  };

  const isMeetingNow = (meeting: MergedMeeting) => {
    if (!meeting.start_time || !meeting.end_time) return false;
    const now = new Date();
    const currentTime = format(now, 'HH:mm:ss');
    return currentTime >= meeting.start_time && currentTime <= meeting.end_time;
  };

  const isMeetingPast = (meeting: MergedMeeting) => {
    if (!meeting.end_time) return false;
    const now = new Date();
    const currentTime = format(now, 'HH:mm:ss');
    return currentTime > meeting.end_time;
  };

  const isLoading = isLoadingLocal || isLoadingExternal;

  if (isLoading) {
    return (
      <Card className="w-full shadow-sm">
        <CardHeader className="p-3 pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#00141d]">
          <Calendar className="h-4 w-4 text-[#ffcd00]" />
          Reuniões de Hoje
          {todayMeetings.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">
              {todayMeetings.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="p-2">
        {todayMeetings.length === 0 ? (
          <div className="text-center py-4">
            <Video className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              Nenhuma reunião hoje
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {todayMeetings.map((meeting) => {
              const isNow = isMeetingNow(meeting);
              const isPast = isMeetingPast(meeting);
              return (
                <div 
                  key={meeting.id} 
                  onClick={() => onEventClick?.(meeting)} 
                  className={`p-2 rounded-md border cursor-pointer transition-colors ${
                    isNow 
                      ? "bg-[#ffcd00]/20 border-[#ffcd00]" 
                      : isPast 
                        ? "bg-muted/50 opacity-60" 
                        : "bg-white hover:bg-muted/50 border-border"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`p-1 rounded ${isNow ? "bg-[#ffcd00]" : "bg-[#00141d]"}`}>
                      <Video className={`h-3 w-3 ${isNow ? "text-[#00141d]" : "text-white"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-medium truncate ${isPast ? "line-through" : ""}`}>
                          {meeting.title}
                        </p>
                        {meeting.isExternal && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 bg-blue-50 text-blue-600 border-blue-200">
                            Google
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {formatMeetingTime(meeting)}
                        </span>
                        {isNow && (
                          <Badge className="text-[9px] px-1 py-0 h-4 bg-green-500">
                            Agora
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {meeting.google_meet_link && !isPast && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="w-full mt-1.5 h-6 text-[10px] gap-1" 
                      onClick={e => {
                        e.stopPropagation();
                        window.open(meeting.google_meet_link!, '_blank');
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Entrar na reunião
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
