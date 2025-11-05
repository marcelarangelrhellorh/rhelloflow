import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import logoLight from "@/assets/logo-rhello-light.png";
import logoDark from "@/assets/logo-rhello-dark.png";

const QUICK_TEMPLATES = [
  "Boa comunicação",
  "Perfil técnico adequado",
  "Experiência alinhada",
  "Postura profissional",
  "Abaixo da senioridade esperada",
  "Falta de experiência específica",
  "Necessita desenvolvimento",
];

interface RequestData {
  request_id: string;
  candidate_name: string;
  vacancy_title: string;
  company_name: string;
  expires_at: string;
  allow_multiple: boolean;
  already_submitted?: boolean;
}

export default function FeedbackCliente() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [rating, setRating] = useState<number | null>(null);
  const [disposition, setDisposition] = useState<string>("");
  const [comment, setComment] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [quickTags, setQuickTags] = useState<string[]>([]);

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-feedback-token?token=${token}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao validar token');
      }

      const data = await response.json();
      setRequestData(data);
    } catch (err: any) {
      console.error("Erro ao validar token:", err);
      setError(err.message || "Link inválido ou expirado");
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = (template: string) => {
    if (quickTags.includes(template)) {
      setQuickTags(quickTags.filter(t => t !== template));
    } else {
      setQuickTags([...quickTags, template]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rating || !comment.trim()) {
      toast.error("Por favor, preencha a avaliação e o comentário");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-client-feedback', {
        body: {
          token,
          rating,
          disposition: disposition || undefined,
          quick_tags: quickTags,
          comment: comment.trim(),
          sender_name: senderName.trim() || undefined,
          sender_email: senderEmail.trim() || undefined,
        },
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Feedback enviado com sucesso!");
    } catch (err: any) {
      console.error("Erro ao enviar feedback:", err);
      toast.error(err.message || "Erro ao enviar feedback");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <picture>
                <source srcSet={logoDark} media="(prefers-color-scheme: dark)" />
                <img src={logoLight} alt="Rhello" className="h-8" />
              </picture>
            </div>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Link Inválido</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted || requestData?.already_submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <picture>
                <source srcSet={logoDark} media="(prefers-color-scheme: dark)" />
                <img src={logoLight} alt="Rhello" className="h-8" />
              </picture>
            </div>
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <CardTitle>Feedback Recebido!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {submitted 
                ? `Obrigado pelo seu feedback sobre ${requestData?.candidate_name}. O recrutador será notificado.`
                : 'Este link já foi utilizado para enviar feedback. Obrigado!'
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-center mb-6">
              <picture>
                <source srcSet={logoDark} media="(prefers-color-scheme: dark)" />
                <img src={logoLight} alt="Rhello" className="h-10" />
              </picture>
            </div>
            <CardTitle className="text-center text-2xl">Avaliação de Candidato</CardTitle>
            <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground text-center mb-2">Candidato avaliado</p>
              <p className="text-2xl font-bold text-center text-primary">{requestData?.candidate_name || 'Carregando...'}</p>
              <div className="mt-4 space-y-1 text-center text-sm">
                <p><strong>Vaga:</strong> {requestData?.vacancy_title}</p>
                {requestData?.company_name && <p><strong>Empresa:</strong> {requestData.company_name}</p>}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avaliação */}
              <div className="space-y-2">
                <Label className="required">Avaliação Geral</Label>
                <div className="flex justify-center py-2">
                  <StarRating value={rating} onChange={setRating} size="lg" />
                </div>
              </div>

              {/* Disposição */}
              <div className="space-y-2">
                <Label>Parecer</Label>
                <Select value={disposition} onValueChange={setDisposition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aprovado">✅ Aprovado</SelectItem>
                    <SelectItem value="reprovado">❌ Reprovado</SelectItem>
                    <SelectItem value="neutro">⚪ Neutro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Templates rápidos */}
              <div className="space-y-2">
                <Label>Tópicos Rápidos (opcional)</Label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TEMPLATES.map((template) => (
                    <Badge
                      key={template}
                      variant={quickTags.includes(template) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleTemplateClick(template)}
                    >
                      {template}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Comentário */}
              <div className="space-y-2">
                <Label htmlFor="comment" className="required">Comentário</Label>
                <Textarea
                  id="comment"
                  placeholder="Descreva seu feedback sobre o candidato..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={6}
                  required
                />
              </div>

              {/* Informações do avaliador (opcional) */}
              <div className="space-y-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Informações do avaliador (opcional)</p>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Seu Nome</Label>
                  <Input
                    id="name"
                    placeholder="Nome completo"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Seu E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@empresa.com"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Feedback"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
