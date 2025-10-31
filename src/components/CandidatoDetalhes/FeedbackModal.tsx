import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidatoId: string;
  vagaId?: string | null;
  etapaAtual?: string;
  onSuccess?: () => void;
}

const QUICK_TEMPLATES = [
  "Soft skills abaixo do esperado",
  "Senioridade aquém do solicitado",
  "Salário fora do budget",
  "Fit cultural positivo",
  "Excelente comunicação",
  "Perfil técnico adequado"
];

export function FeedbackModal({
  open,
  onOpenChange,
  candidatoId,
  vagaId,
  etapaAtual,
  onSuccess
}: FeedbackModalProps) {
  const { toast } = useToast();
  const [tipo, setTipo] = useState<"interno" | "cliente">("interno");
  const [conteudo, setConteudo] = useState("");
  const [etapa, setEtapa] = useState(etapaAtual || "");
  const [disposicao, setDisposicao] = useState<"aprovado" | "reprovado" | "neutro" | "">("");
  const [avaliacao, setAvaliacao] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setEtapa(etapaAtual || "");
    }
  }, [open, etapaAtual]);

  const handleSubmit = async () => {
    if (!conteudo.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha o conteúdo do feedback.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { error } = await supabase.from("feedbacks").insert({
        candidato_id: candidatoId,
        vaga_id: vagaId || null,
        author_user_id: user.id,
        tipo,
        conteudo: conteudo.trim(),
        etapa: etapa || null,
        disposicao: disposicao || null,
        avaliacao: avaliacao || null
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Feedback adicionado com sucesso!"
      });

      // Reset form
      setConteudo("");
      setTipo("interno");
      setDisposicao("");
      setAvaliacao(null);
      setEtapa(etapaAtual || "");

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Erro ao criar feedback:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível adicionar o feedback.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTemplateClick = (template: string) => {
    setConteudo(prev => prev ? `${prev}\n${template}` : template);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Feedback</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo de Feedback</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={tipo === "interno" ? "default" : "outline"}
                onClick={() => setTipo("interno")}
                className="flex-1"
              >
                Interno
              </Button>
              <Button
                type="button"
                variant={tipo === "cliente" ? "default" : "outline"}
                onClick={() => setTipo("cliente")}
                className="flex-1"
              >
                Cliente
              </Button>
            </div>
          </div>

          {/* Etapa */}
          <div className="space-y-2">
            <Label htmlFor="etapa">Etapa do Processo</Label>
            <Select value={etapa} onValueChange={setEtapa}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Banco de Talentos">Banco de Talentos</SelectItem>
                <SelectItem value="Triado">Triado</SelectItem>
                <SelectItem value="Entrevista Rhello">Entrevista Rhello</SelectItem>
                <SelectItem value="Enviado Cliente">Enviado Cliente</SelectItem>
                <SelectItem value="Entrevista Cliente">Entrevista Cliente</SelectItem>
                <SelectItem value="Aprovado">Aprovado</SelectItem>
                <SelectItem value="Reprovado">Reprovado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Disposição */}
          <div className="space-y-2">
            <Label>Disposição (opcional)</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={disposicao === "aprovado" ? "default" : "outline"}
                onClick={() => setDisposicao(disposicao === "aprovado" ? "" : "aprovado")}
                className="flex-1"
              >
                ✅ Aprovado
              </Button>
              <Button
                type="button"
                size="sm"
                variant={disposicao === "reprovado" ? "default" : "outline"}
                onClick={() => setDisposicao(disposicao === "reprovado" ? "" : "reprovado")}
                className="flex-1"
              >
                ❌ Reprovado
              </Button>
              <Button
                type="button"
                size="sm"
                variant={disposicao === "neutro" ? "default" : "outline"}
                onClick={() => setDisposicao(disposicao === "neutro" ? "" : "neutro")}
                className="flex-1"
              >
                ⚪ Neutro
              </Button>
            </div>
          </div>

          {/* Avaliação */}
          <div className="space-y-2">
            <Label>Avaliação (opcional)</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  type="button"
                  size="sm"
                  variant={avaliacao === rating ? "default" : "outline"}
                  onClick={() => setAvaliacao(avaliacao === rating ? null : rating)}
                >
                  {rating} ⭐
                </Button>
              ))}
            </div>
          </div>

          {/* Templates Rápidos */}
          <div className="space-y-2">
            <Label>Templates Rápidos</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_TEMPLATES.map((template) => (
                <Button
                  key={template}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleTemplateClick(template)}
                  className="text-xs"
                >
                  {template}
                </Button>
              ))}
            </div>
          </div>

          {/* Conteúdo */}
          <div className="space-y-2">
            <Label htmlFor="conteudo">Conteúdo *</Label>
            <Textarea
              id="conteudo"
              placeholder="Descreva o feedback detalhadamente..."
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
