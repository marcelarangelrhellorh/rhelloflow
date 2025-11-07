import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
interface WhatsAppSend {
  id: string;
  template_key: string | null;
  text: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  error_message: string | null;
  sent_by: string;
}
interface WhatsAppHistoryProps {
  candidateId: string;
}
export function WhatsAppHistory({
  candidateId
}: WhatsAppHistoryProps) {
  const [sends, setSends] = useState<WhatsAppSend[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadWhatsAppHistory();
  }, [candidateId]);
  async function loadWhatsAppHistory() {
    try {
      const {
        data: sends,
        error
      } = await supabase.from("whatsapp_sends").select("*").eq("candidate_id", candidateId).order("created_at", {
        ascending: false
      });
      if (error) throw error;

      // Buscar informações dos usuários e templates
      const sendsWithDetails = await Promise.all((sends || []).map(async send => {
        const [profileResult, templateResult] = await Promise.all([supabase.from("profiles").select("full_name").eq("id", send.sent_by).single(), send.template_key ? supabase.from("whatsapp_templates").select("name").eq("key", send.template_key).single() : Promise.resolve({
          data: null,
          error: null
        })]);
        return {
          ...send,
          sender_name: profileResult.data?.full_name,
          template_name: templateResult.data?.name
        };
      }));
      setSends(sendsWithDetails);
    } catch (error) {
      console.error("Erro ao carregar histórico de WhatsApp:", error);
    } finally {
      setLoading(false);
    }
  }
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      sent: {
        label: "Enviado",
        variant: "default" as const,
        icon: CheckCircle
      },
      queued: {
        label: "Aguardando",
        variant: "secondary" as const,
        icon: Clock
      },
      failed: {
        label: "Falhou",
        variant: "destructive" as const,
        icon: XCircle
      }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.queued;
    const Icon = config.icon;
    return <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>;
  };
  if (loading) {
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Histórico de WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>;
  }
  if (sends.length === 0) {
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Histórico de WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhuma mensagem WhatsApp enviada para este candidato.
          </p>
        </CardContent>
      </Card>;
  }
  return <Card className="h-full">
      <CardHeader className="mx-[20px]">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Histórico de WhatsApp ({sends.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sends.map(send => <div key={send.id} className="border-l-2 border-primary/20 pl-4 pb-4 last:pb-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  {(send as any).template_name || send.template_key || "Template customizado"}
                </p>
                <p className="text-muted-foreground text-sm font-semibold">
                  Enviado por {(send as any).sender_name || "Usuário"} •{" "}
                  {formatDistanceToNow(new Date(send.created_at), {
                addSuffix: true,
                locale: ptBR
              })}
                </p>
              </div>
              {getStatusBadge(send.status)}
            </div>
            
            <div className="bg-muted/50 rounded-md p-3 text-sm">
              <p className="whitespace-pre-wrap text-sm">{send.text}</p>
            </div>

            {send.error_message && <p className="text-xs text-destructive mt-2">
                Erro: {send.error_message}
              </p>}
          </div>)}
      </CardContent>
    </Card>;
}