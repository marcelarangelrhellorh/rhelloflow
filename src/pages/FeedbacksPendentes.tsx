import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Mail, Briefcase, Clock, ExternalLink, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FeedbackPendente {
  request_id: string;
  candidato_id: string;
  candidato_nome: string;
  candidato_email: string;
  vaga_id: string;
  vaga_titulo: string;
  vaga_empresa: string;
  token: string;
  criado_em: string;
  expires_at: string;
  recrutador_nome: string | null;
}

export default function FeedbacksPendentes() {
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState<FeedbackPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadFeedbacksPendentes();
  }, []);

  const loadFeedbacksPendentes = async () => {
    try {
      setLoading(true);

      // Buscar feedback_requests sem resposta
      const { data, error } = await supabase
        .from('feedback_requests')
        .select(`
          id,
          candidato_id,
          vaga_id,
          token,
          created_at,
          expires_at,
          recrutador_id,
          candidatos!inner(
            id,
            nome_completo,
            email
          ),
          vagas!inner(
            id,
            titulo,
            empresa
          )
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filtrar apenas os que não têm feedback respondido
      const pendentes: FeedbackPendente[] = [];
      
      for (const request of data || []) {
        // Verificar se já tem feedback respondido
        const { data: feedbackData } = await supabase
          .from('feedbacks')
          .select('id')
          .eq('request_id', request.id)
          .is('deleted_at', null)
          .maybeSingle();

        // Se não tem feedback, adicionar à lista
        if (!feedbackData) {
          // Buscar nome do recrutador se houver
          let recrutadorNome = null;
          if (request.recrutador_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', request.recrutador_id)
              .maybeSingle();
            
            recrutadorNome = profileData?.full_name || null;
          }

          pendentes.push({
            request_id: request.id,
            candidato_id: request.candidato_id,
            candidato_nome: (request.candidatos as any).nome_completo,
            candidato_email: (request.candidatos as any).email,
            vaga_id: request.vaga_id,
            vaga_titulo: (request.vagas as any).titulo,
            vaga_empresa: (request.vagas as any).empresa,
            token: request.token,
            criado_em: request.created_at,
            expires_at: request.expires_at,
            recrutador_nome: recrutadorNome,
          });
        }
      }

      setFeedbacks(pendentes);
    } catch (error: any) {
      console.error("Erro ao carregar feedbacks pendentes:", error);
      toast.error("Erro ao carregar feedbacks pendentes");
    } finally {
      setLoading(false);
    }
  };

  const copyFeedbackLink = (token: string) => {
    const link = `${window.location.origin}/feedback-cliente/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência!");
  };

  const filteredFeedbacks = feedbacks.filter(
    (feedback) =>
      feedback.candidato_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.vaga_titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.vaga_empresa.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTimeRemaining = (expiresAt: string) => {
    return formatDistanceToNow(new Date(expiresAt), {
      addSuffix: true,
      locale: ptBR,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Dashboard
        </Button>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Feedbacks Pendentes
            </h1>
            <p className="text-base text-muted-foreground">
              Links de feedback enviados aos clientes aguardando resposta
            </p>
          </div>

          <Badge className="text-lg font-bold px-4 py-2 bg-purple/10 text-purple border-purple">
            {filteredFeedbacks.length} pendente{filteredFeedbacks.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por candidato, vaga ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lista de Feedbacks */}
      {filteredFeedbacks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 text-6xl">✅</div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            {searchTerm ? "Nenhum resultado encontrado" : "Nenhum feedback pendente"}
          </h3>
          <p className="text-base text-muted-foreground mb-6">
            {searchTerm 
              ? "Tente ajustar os termos de busca"
              : "Todos os feedbacks solicitados foram respondidos!"}
          </p>
          {searchTerm && (
            <Button onClick={() => setSearchTerm("")} variant="outline">
              Limpar busca
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredFeedbacks.map((feedback) => (
            <Card key={feedback.request_id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-bold line-clamp-2">
                    {feedback.candidato_nome}
                  </CardTitle>
                  <Badge variant="outline" className="bg-purple/10 text-purple border-purple shrink-0">
                    Pendente
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Candidato Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate font-medium">{feedback.candidato_email}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4 flex-shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-foreground">{feedback.vaga_titulo}</span>
                      <span className="text-xs ml-1">• {feedback.vaga_empresa}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">
                      Expira {getTimeRemaining(feedback.expires_at)}
                    </span>
                  </div>

                  {feedback.recrutador_nome && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Solicitado por:</span>{" "}
                      <span className="font-bold text-foreground">{feedback.recrutador_nome}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/candidatos/${feedback.candidato_id}`)}
                    className="flex-1"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver Candidato
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => copyFeedbackLink(feedback.token)}
                    className="flex-1 bg-purple hover:bg-purple/90 text-white"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
