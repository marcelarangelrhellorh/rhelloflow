import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  DollarSign,
  ExternalLink,
  Download,
  MessageSquare,
  Link as LinkIcon
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { logger } from "@/lib/logger";

interface Feedback {
  id: string;
  tipo: string;
  conteudo: string;
  criado_em: string;
  avaliacao: number | null;
  origem: string;
  sender_name: string | null;
  sender_email: string | null;
}

interface FeedbackRequest {
  id: string;
  token: string;
  created_at: string;
  expires_at: string;
}

interface Scorecard {
  id: string;
  total_score: number;
  match_percentage: number;
  recommendation: string;
  comments: string | null;
  created_at: string;
  evaluator_name: string | null;
}

interface ClientCandidateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
}

export function ClientCandidateDrawer({ open, onOpenChange, candidateId }: ClientCandidateDrawerProps) {
  const [candidate, setCandidate] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [feedbackRequests, setFeedbackRequests] = useState<FeedbackRequest[]>([]);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && candidateId) {
      loadCandidateData();
    }
  }, [open, candidateId]);

  const loadCandidateData = async () => {
    try {
      setLoading(true);

      // Load candidate data
      const { data: candidateData, error: candidateError } = await supabase
        .from("candidatos")
        .select("*")
        .eq("id", candidateId)
        .single();

      if (candidateError) throw candidateError;
      setCandidate(candidateData);

      // Load feedbacks
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedbacks")
        .select("*")
        .eq("candidato_id", candidateId)
        .order("criado_em", { ascending: false });

      if (feedbackError) throw feedbackError;
      setFeedbacks(feedbackData || []);

      // Load feedback requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("feedback_requests")
        .select("*")
        .eq("candidato_id", candidateId)
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;
      setFeedbackRequests(requestsData || []);

      // Load scorecards
      const { data: scorecardsData, error: scorecardsError } = await supabase
        .from("candidate_scorecards")
        .select(`
          id,
          total_score,
          match_percentage,
          recommendation,
          comments,
          created_at,
          evaluator_id
        `)
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });

      if (scorecardsError) throw scorecardsError;

      // Get evaluator names
      if (scorecardsData && scorecardsData.length > 0) {
        const evaluatorIds = [...new Set(scorecardsData.map(s => s.evaluator_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", evaluatorIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        
        const scorecardsWithNames = scorecardsData.map(scorecard => ({
          ...scorecard,
          evaluator_name: profilesMap.get(scorecard.evaluator_id) || null
        }));

        setScorecards(scorecardsWithNames);
      } else {
        setScorecards([]);
      }

    } catch (error) {
      logger.error("Erro ao carregar dados do candidato:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "Não informado";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getFeedbackLink = (token: string) => {
    return `${window.location.origin}/feedback/${token}`;
  };

  const getRecommendationBadge = (recommendation: string) => {
    const variants = {
      'yes': { label: 'Recomendado', variant: 'default' as const },
      'maybe': { label: 'Talvez', variant: 'secondary' as const },
      'no': { label: 'Não Recomendado', variant: 'destructive' as const }
    };
    return variants[recommendation as keyof typeof variants] || { label: recommendation, variant: 'outline' as const };
  };

  if (loading || !candidate) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <div className="flex items-center justify-center h-full">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">Perfil do Candidato</SheetTitle>
          <SheetDescription>
            Informações completas e feedbacks do processo seletivo
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Header com nome e status */}
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">{candidate.nome_completo}</h3>
                <p className="text-muted-foreground">{candidate.nivel} - {candidate.area}</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-base font-semibold">
              {candidate.status}
            </Badge>
          </div>

          <Separator />

          {/* Informações profissionais */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground text-lg">Informações Profissionais</h4>

            <div className="flex items-center gap-3 text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span>{candidate.area} - {candidate.nivel}</span>
            </div>

            {candidate.pretensao_salarial && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Pretensão: {formatCurrency(candidate.pretensao_salarial)}</span>
              </div>
            )}
          </div>

          {(candidate.curriculo_link || candidate.curriculo_url) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground text-lg flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Currículo
                </h4>
                <Button 
                  className="w-full"
                  variant="outline"
                  asChild
                >
                  <a 
                    href={candidate.curriculo_link || candidate.curriculo_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    download
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Baixar Currículo
                  </a>
                </Button>
              </div>
            </>
          )}

          {/* Seção de Scorecards */}
          {scorecards.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Avaliações (Scorecards)
                </h4>

                <div className="space-y-3">
                  {scorecards.map((scorecard) => {
                    const recommendation = getRecommendationBadge(scorecard.recommendation);
                    
                    return (
                      <Card key={scorecard.id}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant={recommendation.variant} className="text-xs font-semibold">
                                {recommendation.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(scorecard.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>

                            {scorecard.evaluator_name && (
                              <p className="text-sm text-muted-foreground">
                                Avaliador: {scorecard.evaluator_name}
                              </p>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Score Total</p>
                                <p className="text-2xl font-bold text-primary">{scorecard.total_score}%</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Match</p>
                                <p className="text-2xl font-bold text-primary">{scorecard.match_percentage}%</p>
                              </div>
                            </div>

                            {scorecard.comments && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-semibold">Comentários:</p>
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                  {scorecard.comments}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Seção de Feedbacks */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedbacks do Processo
            </h4>

            {feedbacks.length > 0 ? (
              <div className="space-y-3">
                {feedbacks.map((feedback) => (
                  <Card key={feedback.id}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {feedback.tipo}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(feedback.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        
                        {feedback.sender_name && (
                          <p className="text-sm text-muted-foreground">
                            Por: {feedback.sender_name}
                            {feedback.sender_email && ` (${feedback.sender_email})`}
                          </p>
                        )}
                        
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {feedback.conteudo}
                        </p>

                        {feedback.avaliacao && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <span>Avaliação:</span>
                            <span className="text-primary font-medium">{feedback.avaliacao}/5</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum feedback registrado ainda.</p>
            )}
          </div>

          {/* Solicitações de Feedback */}
          {feedbackRequests.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Dar Feedback sobre o Candidato
                </h4>

                <div className="space-y-3">
                  {feedbackRequests.map((request) => {
                    const isExpired = new Date(request.expires_at) < new Date();
                    const feedbackLink = getFeedbackLink(request.token);

                    return (
                      <Card key={request.id}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant={isExpired ? "secondary" : "default"} className="text-xs">
                                {isExpired ? "Expirado" : "Ativo"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Expira em: {format(new Date(request.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                            
                            {!isExpired && (
                              <Button
                                className="w-full"
                                onClick={() => window.open(feedbackLink, '_blank')}
                              >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Dar feedback
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
