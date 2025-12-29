import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, Trash2, Star, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
interface Feedback {
  id: string;
  tipo: "interno" | "cliente";
  conteudo: string;
  criado_em: string;
  etapa?: string | null;
  disposicao?: "aprovado" | "reprovado" | "neutro" | null;
  avaliacao?: number | null;
  author_user_id: string;
  origem?: string;
  sender_name?: string;
  quick_tags?: string[];
}
interface FeedbackListProps {
  candidatoId: string;
  onSolicitarFeedback?: () => void;
}
const disposicaoColors = {
  aprovado: "bg-success/10 text-success border-success/20",
  reprovado: "bg-destructive/10 text-destructive border-destructive/20",
  neutro: "bg-muted/10 text-muted-foreground border-muted"
};
const disposicaoIcons = {
  aprovado: "✅",
  reprovado: "❌",
  neutro: "⚪"
};
export function FeedbackList({
  candidatoId,
  onSolicitarFeedback
}: FeedbackListProps) {
  const {
    toast
  } = useToast();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  useEffect(() => {
    loadFeedbacks();

    // Subscribe to realtime changes
    const channel = supabase.channel(`feedbacks-${candidatoId}`).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'feedbacks',
      filter: `candidato_id=eq.${candidatoId}`
    }, () => {
      loadFeedbacks();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [candidatoId]);
  const loadFeedbacks = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("feedbacks").select("*").eq("candidato_id", candidatoId).order("criado_em", {
        ascending: false
      });
      if (error) throw error;

      // Cast the data to match our Feedback type
      const feedbacksData: Feedback[] = (data || []).map(item => ({
        ...item,
        tipo: item.tipo as "interno" | "cliente",
        disposicao: item.disposicao as "aprovado" | "reprovado" | "neutro" | null
      }));
      setFeedbacks(feedbacksData);

      // Load author profiles
      if (data && data.length > 0) {
        const authorIds = [...new Set(data.map(f => f.author_user_id))];
        const {
          data: profilesData
        } = await supabase.from("profiles").select("id, full_name").in("id", authorIds);
        if (profilesData) {
          const profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = p.full_name;
            return acc;
          }, {} as Record<string, string>);
          setProfiles(profilesMap);
        }
      }
    } catch (error: any) {
      logger.error("Erro ao carregar feedbacks:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os feedbacks.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleDelete = async (feedbackId: string) => {
    if (!confirm("Tem certeza que deseja excluir este feedback?")) {
      return;
    }
    try {
      const {
        error
      } = await supabase.from("feedbacks").delete().eq("id", feedbackId);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Feedback excluído com sucesso!"
      });
    } catch (error: any) {
      logger.error("Erro ao excluir feedback:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o feedback.",
        variant: "destructive"
      });
    }
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };
  return <Card className="h-full px-0 py-0 shadow-md border-gray-300">
      <CardHeader className="mx-[10px]">
        <div className="flex items-center justify-between px-0 mx-[14px]">
          <CardTitle className="font-bold text-base">
            Feedbacks do Cliente    <span className="font-normal text-muted-foreground">({feedbacks.length})</span>
          </CardTitle>
          {onSolicitarFeedback && <Button onClick={onSolicitarFeedback} size="sm" className="font-semibold bg-[#00141d] text-background hover:bg-[#00141d]/90">
              <Send className="mr-2 h-4 w-4" />
              Solicitar Feedback
            </Button>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div> : feedbacks.length === 0 ? <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 rounded-full bg-muted/20 p-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium text-sm">
              Nenhum feedback registrado ainda
            </p>
          </div> : <div className="space-y-4">
            {feedbacks.map(feedback => <div key={feedback.id} className="group rounded-lg border-2 border-border bg-card p-5 transition-all hover:shadow-lg hover:border-primary/20">
                {/* Header com tipo e data */}
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className={feedback.origem === "cliente" ? "bg-blue-500 text-white text-sm font-semibold" : feedback.tipo === "interno" ? "bg-muted text-muted-foreground text-sm font-semibold" : "bg-primary text-primary-foreground text-sm font-semibold"}>
                      {feedback.origem === "cliente" ? "👤 Cliente" : feedback.tipo === "interno" ? "💬 Interno" : "📋 Cliente"}
                    </Badge>

                    {feedback.disposicao && <Badge className={disposicaoColors[feedback.disposicao] + " text-sm font-semibold"}>
                        {disposicaoIcons[feedback.disposicao]} {feedback.disposicao}
                      </Badge>}

                    {feedback.avaliacao && <Badge variant="outline" className="text-sm font-semibold gap-1">
                        <Star className="h-4 w-4 fill-[#FFCD00] text-[#FFCD00]" />
                        {feedback.avaliacao}
                      </Badge>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium text-muted-foreground">
                      {formatDate(feedback.criado_em)}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(feedback.id)} className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Autor */}
                <div className="mb-3">
                  <p className="text-base font-bold text-card-foreground">
                    {profiles[feedback.author_user_id] || "Carregando..."}
                    {feedback.sender_name && <span className="text-sm font-normal text-muted-foreground ml-2">
                        via {feedback.sender_name}
                      </span>}
                  </p>
                </div>

                {/* Conteúdo */}
                <p className="text-base text-card-foreground whitespace-pre-wrap leading-relaxed mb-3">
                  {feedback.conteudo}
                </p>

                {/* Tags e etapa na parte inferior */}
                {(feedback.etapa || feedback.quick_tags && feedback.quick_tags.length > 0) && <div className="flex gap-2 flex-wrap pt-3 border-t border-border">
                    {feedback.etapa && <Badge variant="outline" className="text-sm">
                        📍 {feedback.etapa}
                      </Badge>}

                    {feedback.quick_tags && feedback.quick_tags.length > 0 && feedback.quick_tags.map((tag, idx) => <Badge key={idx} variant="secondary" className="text-sm">
                          {tag}
                        </Badge>)}
                  </div>}
              </div>)}
          </div>}
      </CardContent>
    </Card>;
}