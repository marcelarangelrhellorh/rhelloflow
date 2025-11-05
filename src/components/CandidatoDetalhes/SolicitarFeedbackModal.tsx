import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, ExternalLink, CheckCircle2 } from "lucide-react";

interface SolicitarFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidatoId: string;
  vagaId: string | null;
  candidatoNome: string;
}

export function SolicitarFeedbackModal({ 
  open, 
  onOpenChange, 
  candidatoId, 
  vagaId,
  candidatoNome 
}: SolicitarFeedbackModalProps) {
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [feedbackLink, setFeedbackLink] = useState<string | null>(null);
  const [existingRequestId, setExistingRequestId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showNewLinkForm, setShowNewLinkForm] = useState(false);

  useEffect(() => {
    if (open && vagaId) {
      checkExistingLink();
    }
  }, [open, vagaId, candidatoId]);

  const checkExistingLink = async () => {
    if (!vagaId) return;

    setCheckingExisting(true);
    try {
      // Buscar link ativo existente
      const { data, error } = await supabase
        .from('feedback_requests')
        .select('id, token, expires_at, allow_multiple')
        .eq('vaga_id', vagaId)
        .eq('candidato_id', candidatoId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        // Link existente encontrado
        const baseUrl = window.location.origin;
        setFeedbackLink(`${baseUrl}/feedback/${data.token}`);
        setExistingRequestId(data.id);
        setExpiresAt(data.expires_at);
        setAllowMultiple(data.allow_multiple);
      } else {
        // Nenhum link ativo, mostrar formulário
        setShowNewLinkForm(true);
      }
    } catch (error) {
      console.error("Erro ao verificar link existente:", error);
      setShowNewLinkForm(true);
    } finally {
      setCheckingExisting(false);
    }
  };

  const handleGenerate = async () => {
    if (!vagaId) {
      toast.error("Candidato precisa estar vinculado a uma vaga");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-feedback-link', {
        body: {
          vaga_id: vagaId,
          candidato_id: candidatoId,
          allow_multiple: allowMultiple,
          expires_in_days: expiresInDays,
        },
      });

      if (error) throw error;

      setFeedbackLink(data.feedback_link);
      setExpiresAt(data.expires_at);
      setShowNewLinkForm(false);
      toast.success("Link de feedback gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar link:", error);
      toast.error("Erro ao gerar link de feedback");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (feedbackLink) {
      navigator.clipboard.writeText(feedbackLink);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setFeedbackLink(null);
    setExistingRequestId(null);
    setExpiresAt(null);
    setShowNewLinkForm(false);
    setCopied(false);
    setCheckingExisting(true);
    onOpenChange(false);
  };

  const handleGenerateNew = () => {
    setFeedbackLink(null);
    setExistingRequestId(null);
    setShowNewLinkForm(true);
  };

  const formatExpirationDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Feedback do Cliente</DialogTitle>
          <DialogDescription>
            {feedbackLink && !showNewLinkForm 
              ? `Link ativo para feedback sobre ${candidatoNome}`
              : `Gere um link seguro para o cliente enviar feedback sobre ${candidatoNome}`
            }
          </DialogDescription>
        </DialogHeader>

        {checkingExisting ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Verificando links existentes...</p>
            </div>
          </div>
        ) : !feedbackLink && showNewLinkForm ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expires">Validade do link (dias)</Label>
              <Input
                id="expires"
                type="number"
                min="1"
                max="90"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 14)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="multiple">Permitir múltiplos feedbacks</Label>
              <Switch
                id="multiple"
                checked={allowMultiple}
                onCheckedChange={setAllowMultiple}
              />
            </div>
          </div>
        ) : feedbackLink ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-md">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="text-sm text-success font-medium">
                {existingRequestId ? "Link ativo encontrado!" : "Link gerado com sucesso!"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Link de feedback</Label>
              <div className="flex gap-2">
                <Input
                  value={feedbackLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className={copied ? "bg-success/10" : ""}
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {expiresAt && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  <strong>Válido até:</strong> {formatExpirationDate(expiresAt)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {allowMultiple ? "✓ Permite múltiplas respostas" : "• Permite apenas uma resposta"}
                </p>
              </div>
            )}

            {existingRequestId && (
              <Button
                variant="outline"
                onClick={handleGenerateNew}
                className="w-full"
              >
                Gerar novo link
              </Button>
            )}
          </div>
        ) : null}

        <DialogFooter>
          {checkingExisting ? null : !feedbackLink && showNewLinkForm ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleGenerate} disabled={loading || !vagaId}>
                {loading ? "Gerando..." : "Gerar Link"}
              </Button>
            </>
          ) : feedbackLink ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
              <Button onClick={() => window.open(feedbackLink, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Link
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
