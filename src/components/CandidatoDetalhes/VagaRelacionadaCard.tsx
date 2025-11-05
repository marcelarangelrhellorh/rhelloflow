import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Edit2, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VagaRelacionadaCardProps {
  candidatoId: string;
  vagaAtualId: string | null;
  vagaAtualTitulo?: string;
  onUpdate?: () => void;
}

interface Vaga {
  id: string;
  titulo: string;
  empresa: string;
  status: string;
}

export function VagaRelacionadaCard({ 
  candidatoId, 
  vagaAtualId, 
  vagaAtualTitulo,
  onUpdate 
}: VagaRelacionadaCardProps) {
  const [editing, setEditing] = useState(false);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [selectedVagaId, setSelectedVagaId] = useState<string>(vagaAtualId || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      loadVagas();
    }
  }, [editing]);

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
      toast.error("Erro ao carregar vagas");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("candidatos")
        .update({ 
          vaga_relacionada_id: selectedVagaId || null,
          status: selectedVagaId ? "Selecionado" : "Banco de Talentos"
        })
        .eq("id", candidatoId);

      if (error) throw error;

      toast.success("Vaga relacionada atualizada!");
      setEditing(false);
      onUpdate?.();
    } catch (error: any) {
      console.error("Erro ao atualizar vaga:", error);
      toast.error("Erro ao atualizar vaga relacionada");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedVagaId(vagaAtualId || "");
    setEditing(false);
  };

  if (!editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Vaga Relacionada
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {vagaAtualTitulo ? (
            <p className="text-sm font-medium">{vagaAtualTitulo}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma vaga vinculada</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Editar Vaga Relacionada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedVagaId} onValueChange={setSelectedVagaId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma vaga" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhuma vaga</SelectItem>
            {vagas.map((vaga) => (
              <SelectItem key={vaga.id} value={vaga.id}>
                {vaga.titulo} - {vaga.empresa}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={loading}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-1" />
            Salvar
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleCancel}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
