import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RejectedCandidate {
  id: string;
  nome_completo: string;
  telefone: string;
  email: string;
  status: string;
  vacancy_title: string;
}

interface BulkWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: RejectedCandidate[];
  onSuccess: () => void;
}

interface SendResult {
  candidateId: string;
  candidateName: string;
  success: boolean;
  error?: string;
}

export function BulkWhatsAppModal({
  open,
  onOpenChange,
  candidates,
  onSuccess
}: BulkWhatsAppModalProps) {
  const [template, setTemplate] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SendResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (open) {
      loadTemplate();
      setConsentConfirmed(false);
      setProgress(0);
      setResults([]);
      setShowResults(false);
    }
  }, [open]);

  const loadTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('content')
        .eq('key', 'reprovacao')
        .eq('active', true)
        .single();

      if (error) throw error;

      if (data) {
        setTemplate(data.content);
      } else {
        setTemplate("Olá {{nome}}, infelizmente não seguiremos com sua candidatura para a vaga de {{vaga}}. Agradecemos seu interesse e desejamos sucesso em sua busca!");
      }
    } catch (error) {
      console.error("Erro ao carregar template:", error);
      setTemplate("Olá {{nome}}, infelizmente não seguiremos com sua candidatura para a vaga de {{vaga}}. Agradecemos seu interesse e desejamos sucesso em sua busca!");
    }
  };

  const getPreviewText = () => {
    if (candidates.length === 0) return "";
    
    const candidate = candidates[0];
    return template
      .replace(/\{\{nome\}\}/g, candidate.nome_completo.split(' ')[0])
      .replace(/\{\{vaga\}\}/g, candidate.vacancy_title);
  };

  const validatePhone = (phone: string): boolean => {
    return phone && phone.startsWith('+') && phone.length >= 10;
  };

  const handleSend = async () => {
    if (!consentConfirmed) {
      toast.error("É necessário confirmar o consentimento para enviar mensagens");
      return;
    }

    setSending(true);
    setShowResults(false);
    const sendResults: SendResult[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        
        // Validar telefone
        if (!validatePhone(candidate.telefone)) {
          sendResults.push({
            candidateId: candidate.id,
            candidateName: candidate.nome_completo,
            success: false,
            error: "Número de telefone inválido (formato E.164 esperado)"
          });
          setProgress(((i + 1) / candidates.length) * 100);
          continue;
        }

        // Personalizar mensagem
        const personalizedText = template
          .replace(/\{\{nome\}\}/g, candidate.nome_completo.split(' ')[0])
          .replace(/\{\{vaga\}\}/g, candidate.vacancy_title);

        try {
          // Chamar edge function para enviar WhatsApp
          const { data, error } = await supabase.functions.invoke('send-whatsapp', {
            body: {
              candidateId: candidate.id,
              phone: candidate.telefone,
              message: personalizedText,
              templateKey: 'reprovacao',
              vacancyId: candidate.vacancy_title // Você pode ajustar para usar vacancy_id real
            }
          });

          if (error) throw error;

          // Registrar envio no banco
          await supabase.from('whatsapp_sends').insert({
            candidate_id: candidate.id,
            sent_by: user.id,
            number: candidate.telefone,
            text: personalizedText,
            template_key: 'reprovacao',
            status: 'sent',
            consent_confirmed: true,
            sent_at: new Date().toISOString()
          });

          sendResults.push({
            candidateId: candidate.id,
            candidateName: candidate.nome_completo,
            success: true
          });
        } catch (error: any) {
          console.error(`Erro ao enviar para ${candidate.nome_completo}:`, error);
          sendResults.push({
            candidateId: candidate.id,
            candidateName: candidate.nome_completo,
            success: false,
            error: error.message || "Erro desconhecido"
          });
        }

        setProgress(((i + 1) / candidates.length) * 100);
        
        // Rate limiting: aguardar 500ms entre cada envio
        if (i < candidates.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setResults(sendResults);
      setShowResults(true);

      const successCount = sendResults.filter(r => r.success).length;
      const failCount = sendResults.filter(r => !r.success).length;

      if (successCount > 0) {
        toast.success(`${successCount} mensagens enviadas com sucesso!`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} mensagens falharam. Veja os detalhes.`);
      }

      onSuccess();
    } catch (error: any) {
      console.error("Erro geral ao enviar mensagens:", error);
      toast.error("Erro ao enviar mensagens: " + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      onOpenChange(false);
    }
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar WhatsApp em Massa - Template "Reprovação"</DialogTitle>
          <DialogDescription>
            Você está prestes a enviar mensagens para {candidates.length} candidato(s) selecionado(s).
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-6 py-4">
            {/* Preview do template */}
            <div className="space-y-2">
              <Label>Preview do Template (primeiro candidato como exemplo)</Label>
              <Textarea
                value={getPreviewText()}
                readOnly
                className="min-h-[120px] bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                A mensagem será personalizada para cada candidato com seu nome e vaga correspondente.
              </p>
            </div>

            {/* Lista de candidatos */}
            <div className="space-y-2">
              <Label>Candidatos selecionados ({candidates.length})</Label>
              <div className="border rounded-lg p-4 max-h-[200px] overflow-y-auto space-y-2">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{candidate.nome_completo}</span>
                    <span className="text-muted-foreground">{candidate.telefone}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Validação de números */}
            {candidates.some(c => !validatePhone(c.telefone)) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Alguns números de telefone não estão no formato E.164 válido (ex: +5511999999999).
                  Estes serão ignorados no envio.
                </AlertDescription>
              </Alert>
            )}

            {/* Consentimento obrigatório */}
            <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/50">
              <Checkbox
                id="consent"
                checked={consentConfirmed}
                onCheckedChange={(checked) => setConsentConfirmed(checked as boolean)}
                disabled={sending}
              />
              <Label
                htmlFor="consent"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                Confirmo que tenho consentimento para contatar estes candidatos via WhatsApp e estou
                ciente das responsabilidades relacionadas à LGPD. Ao enviar, declaro que possuo
                autorização prévia dos contatos.
              </Label>
            </div>

            {/* Progress bar durante envio */}
            {sending && (
              <div className="space-y-2">
                <Label>Enviando mensagens... ({Math.round(progress)}%)</Label>
                <Progress value={progress} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 bg-success/10">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">{successCount} enviados</span>
                </div>
              </div>
              <div className="border rounded-lg p-4 bg-destructive/10">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">{failCount} falharam</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Resultados detalhados</Label>
              <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 border-b last:border-b-0 flex items-center justify-between ${
                      result.success ? 'bg-success/5' : 'bg-destructive/5'
                    }`}
                  >
                    <span className="font-medium">{result.candidateName}</span>
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <>
                          <span className="text-xs text-destructive">{result.error}</span>
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!showResults ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={!consentConfirmed || sending || candidates.length === 0}
              >
                {sending ? (
                  <>Enviando...</>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar para {candidates.length} candidato(s)
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
