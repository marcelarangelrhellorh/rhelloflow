import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
interface Notification {
  id: string;
  job_id: string | null;
  link: string | null;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}
export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    loadNotifications();

    // Subscribe to realtime updates
    const channel = supabase.channel("notifications-changes").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "notifications"
    }, () => {
      loadNotifications();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const loadNotifications = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data,
        error
      } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", {
        ascending: false
      }).limit(20);
      if (error) throw error;
      setNotifications(data as any[] || []);
      setUnreadCount((data || []).filter((n: any) => !n.read_at).length);
    } catch (error: any) {
      console.error("Erro ao carregar notificações:", error);
    }
  };
  const markAsRead = async (id: string) => {
    try {
      const {
        error
      } = await supabase.from("notifications").update({
        read_at: new Date().toISOString()
      }).eq("id", id);
      if (error) throw error;
      loadNotifications();
    } catch (error: any) {
      console.error("Erro ao marcar como lida:", error);
    }
  };
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }

    // Navigate using link or job_id
    if (notification.link) {
      navigate(notification.link);
    } else if (notification.job_id) {
      navigate(`/vagas/${notification.job_id}`);
    }
  };
  const markAllAsRead = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        error
      } = await supabase.from("notifications").update({
        read_at: new Date().toISOString()
      }).eq("user_id", user.id).is("read_at", null);
      if (error) throw error;
      toast.success("Todas as notificações foram marcadas como lidas");
      loadNotifications();
    } catch (error: any) {
      console.error("Erro ao marcar todas como lidas:", error);
      toast.error("Erro ao marcar notificações");
    }
  };
  const getNotificationIcon = (kind: string) => {
    const icons = {
      vaga: "💼",
      candidato: "👤",
      feedback: "💬",
      feedback_cliente: "👤💬",
      feedback_solicitado: "📝",
      sistema: "🔔",
      stage_age_threshold: "⚠️",
      no_activity: "📅",
      candidatura_externa: "📨",
      etapa_vaga: "📋"
    };
    return icons[kind as keyof typeof icons] || "🔔";
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString("pt-BR");
  };
  return <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative shrink-0 text-primary hover:text-primary/80 hover:bg-primary/10 h-12 w-12" 
          aria-label={unreadCount > 0 ? `Notificações - ${unreadCount} não lidas` : "Notificações"}
          aria-haspopup="dialog"
        >
          <Bell className="h-6 w-6" aria-hidden="true" />
          {unreadCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse" aria-hidden="true">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Notificações</SheetTitle>
            {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
                Marcar todas como lidas
              </Button>}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-2" role="list" aria-label="Lista de notificações">
          {notifications.length === 0 ? <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
            </div> : notifications.map(notification => <div 
                key={notification.id} 
                onClick={() => handleNotificationClick(notification)} 
                onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(notification)}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${notification.read_at ? "bg-card border-border" : "bg-primary/5 border-primary/20"}`}
                role="listitem"
                tabIndex={0}
                aria-label={`${notification.title}${notification.read_at ? '' : ' - não lida'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {getNotificationIcon(notification.kind)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-card-foreground text-base text-left">
                        {notification.title}
                      </h4>
                      <span className="text-muted-foreground whitespace-nowrap text-sm font-medium">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    {notification.body && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notification.body}
                      </p>}
                  </div>
                </div>
              </div>)}
        </div>
      </SheetContent>
    </Sheet>;
}