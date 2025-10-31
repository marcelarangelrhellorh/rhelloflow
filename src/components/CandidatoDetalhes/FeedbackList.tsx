import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, Trash2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface Feedback {
  id: string;
  tipo: "interno" | "cliente";
  conteudo: string;
  criado_em: string;
  etapa?: string | null;
  disposicao?: "aprovado" | "reprovado" | "neutro" | null;
  avaliacao?: number | null;
  author_user_id: string;
}

interface FeedbackListProps {
  candidatoId: string;
  onAddFeedback: () => void;
}

const disposicaoColors = {
  aprovado: "bg-success/10 text-success border-success/20",
  reprovado: "bg-destructive/10 text-destructive border-destructive/20",
  neutro: "bg-muted/10 text-muted-foreground border-muted",
};

const disposicaoIcons = {
  aprovado: "✅",
  reprovado: "❌",
  neutro: "⚪",
};

export function FeedbackList({ candidatoId, onAddFeedback }: FeedbackListProps) {
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    loadFeedbacks();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`feedbacks-${candidatoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedbacks',
          filter: `candidato_id=eq.${candidatoId}`
        },
        () => {
          loadFeedbacks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [candidatoId]);

  const loadFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from("feedbacks")
        .select("*")
        .eq("candidato_id", candidatoId)
        .order("criado_em", { ascending: false });

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
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", authorIds);

        if (profilesData) {
          const profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = p.full_name;
            return acc;
          }, {} as Record<string, string>);
          setProfiles(profilesMap);
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar feedbacks:", error);
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
      const { error } = await supabase
        .from("feedbacks")
        .delete()
        .eq("id", feedbackId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Feedback excluído com sucesso!"
      });
    } catch (error: any) {
      console.error("Erro ao excluir feedback:", error);
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
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Feedbacks ({feedbacks.length})
          </CardTitle>
          <Button onClick={onAddFeedback} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Novo Feedback
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 rounded-full bg-muted/20 p-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Nenhum feedback registrado ainda
            </p>
            <Button onClick={onAddFeedback} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeiro Feedback
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="group rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        feedback.tipo === "interno"
                          ? "bg-muted/10 text-muted-foreground border-muted"
                          : "bg-primary/10 text-primary border-primary/20"
                      }
                    >
                      {feedback.tipo === "interno" ? "💬 Interno" : "📋 Cliente"}
                    </Badge>
                    
                    {feedback.disposicao && (
                      <Badge
                        variant="outline"
                        className={disposicaoColors[feedback.disposicao]}
                      >
                        {disposicaoIcons[feedback.disposicao]} {feedback.disposicao}
                      </Badge>
                    )}

                    {feedback.etapa && (
                      <Badge variant="outline" className="text-xs">
                        {feedback.etapa}
                      </Badge>
                    )}

                    {feedback.avaliacao && (
                      <Badge variant="outline" className="text-xs">
                        {feedback.avaliacao} <Star className="ml-1 h-3 w-3 fill-current" />
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(feedback.criado_em)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(feedback.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm font-medium text-card-foreground mb-2">
                  {profiles[feedback.author_user_id] || "Carregando..."}
                </p>

                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {feedback.conteudo}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
