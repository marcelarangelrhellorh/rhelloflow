import { useState } from "react";
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
  const [feedbackLink, setFeedbackLink] = useState<string | null>(null);
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [copied, setCopied] = useState(false);

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
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Feedback do Cliente</DialogTitle>
          <DialogDescription>
            Gere um link seguro para o cliente enviar feedback sobre {candidatoNome}
          </DialogDescription>
        </DialogHeader>

        {!feedbackLink ? (
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
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-md">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="text-sm text-success font-medium">Link gerado com sucesso!</p>
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

            <p className="text-sm text-muted-foreground">
              Válido por {expiresInDays} dias. {allowMultiple ? "Permite múltiplas respostas." : "Permite apenas uma resposta."}
            </p>
          </div>
        )}

        <DialogFooter>
          {!feedbackLink ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleGenerate} disabled={loading || !vagaId}>
                {loading ? "Gerando..." : "Gerar Link"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
              <Button onClick={() => window.open(feedbackLink, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Link
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
