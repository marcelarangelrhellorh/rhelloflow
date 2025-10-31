import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LinkToJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  onSuccess: () => void;
}

interface Vaga {
  id: string;
  titulo: string;
  empresa: string;
  status: string;
}

export function LinkToJobModal({ open, onOpenChange, candidateId, onSuccess }: LinkToJobModalProps) {
  const [loading, setLoading] = useState(false);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [selectedVagaId, setSelectedVagaId] = useState<string>("");

  useEffect(() => {
    if (open) {
      loadVagas();
    }
  }, [open]);

  const loadVagas = async () => {
    try {
      const { data, error } = await supabase
        .from("vagas")
        .select("id, titulo, empresa, status")
        .neq("status", "Concluído")
        .neq("status", "Cancelada")
        .order("titulo");

      if (error) throw error;
      setVagas(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar vagas:", error);
      toast.error("Erro ao carregar vagas disponíveis");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVagaId) {
      toast.error("Selecione uma vaga");
      return;
    }

    setLoading(true);

    try {
      // Buscar dados do candidato
      const { data: candidato } = await supabase
        .from("candidatos")
        .select("nome_completo, recrutador")
        .eq("id", candidateId)
        .single();

      const { error } = await supabase
        .from("candidatos")
        .update({
          vaga_relacionada_id: selectedVagaId,
          status: "Selecionado"
        })
        .eq("id", candidateId);

      if (error) throw error;

      // Adicionar ao histórico
      await supabase
        .from("historico_candidatos")
        .insert({
          candidato_id: candidateId,
          vaga_id: selectedVagaId,
          resultado: "Em andamento",
          recrutador: candidato?.recrutador,
          feedback: "Candidato vinculado à vaga"
        });

      // Logar evento
      const { logVagaEvento } = await import("@/lib/vagaEventos");
      const { data: { user } } = await supabase.auth.getUser();
      
      await logVagaEvento({
        vagaId: selectedVagaId,
        actorUserId: user?.id,
        tipo: "CANDIDATO_ADICIONADO",
        descricao: `Candidato "${candidato?.nome_completo}" adicionado à vaga`,
        payload: {
          candidatoId: candidateId,
          nomeCandidato: candidato?.nome_completo,
          etapaInicial: "Selecionado"
        }
      });

      toast.success("Candidato vinculado à vaga com sucesso!");
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao vincular candidato:", error);
      toast.error("Erro ao vincular candidato à vaga");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular Candidato a Vaga</DialogTitle>
          <DialogDescription>
            Selecione uma vaga ativa para vincular o candidato
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vaga">Vaga Disponível</Label>
            <Select value={selectedVagaId} onValueChange={setSelectedVagaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma vaga" />
              </SelectTrigger>
              <SelectContent>
                {vagas.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Nenhuma vaga disponível
                  </div>
                ) : (
                  vagas.map((vaga) => (
                    <SelectItem key={vaga.id} value={vaga.id}>
                      {vaga.titulo} - {vaga.empresa} ({vaga.status})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedVagaId || vagas.length === 0}
              className="bg-[#F9EC3F] hover:bg-[#F9EC3F]/90 text-[#00141D] font-semibold"
            >
              {loading ? "Vinculando..." : "Vincular à Vaga"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
