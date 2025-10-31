import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";

interface CandidateModalProps {
  open: boolean;
  onClose: () => void;
  candidatoId?: string | null;
  onSave: () => void;
}

const RECRUTADORES = ["Ítalo", "Bianca Marques", "Victor", "Mariana", "Isabella"];

export function CandidateModal({ open, onClose, candidatoId, onSave }: CandidateModalProps) {
  const [loading, setLoading] = useState(false);
  const [vagas, setVagas] = useState<{ id: string; titulo: string }[]>([]);
  const [formData, setFormData] = useState({
    nome_completo: "",
    email: "",
    telefone: "",
    cidade: "",
    estado: "",
    linkedin: "",
    curriculo_link: "",
    nivel: "",
    area: "",
    recrutador: "",
    vaga_relacionada_id: "",
    pretensao_salarial: "",
    status: "Banco de Talentos",
    feedback: "",
  });

  useEffect(() => {
    if (open) {
      loadVagas();
      if (candidatoId) {
        loadCandidato();
      } else {
        resetForm();
      }
    }
  }, [open, candidatoId]);

  const resetForm = () => {
    setFormData({
      nome_completo: "",
      email: "",
      telefone: "",
      cidade: "",
      estado: "",
      linkedin: "",
      curriculo_link: "",
      nivel: "",
      area: "",
      recrutador: "",
      vaga_relacionada_id: "",
      pretensao_salarial: "",
      status: "Banco de Talentos",
      feedback: "",
    });
  };

  const loadVagas = async () => {
    try {
      const { data, error } = await supabase
        .from("vagas")
        .select("id, titulo")
        .not("status", "in", '("Concluído","Cancelada")')
        .order("titulo");

      if (error) throw error;
      setVagas(data || []);
    } catch (error) {
      console.error("Erro ao carregar vagas:", error);
    }
  };

  const loadCandidato = async () => {
    if (!candidatoId) return;
    
    try {
      const { data, error } = await supabase
        .from("candidatos")
        .select("*")
        .eq("id", candidatoId)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          nome_completo: data.nome_completo || "",
          email: data.email || "",
          telefone: data.telefone || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
          linkedin: data.linkedin || "",
          curriculo_link: data.curriculo_link || "",
          nivel: data.nivel || "",
          area: data.area || "",
          recrutador: data.recrutador || "",
          vaga_relacionada_id: data.vaga_relacionada_id || "",
          pretensao_salarial: data.pretensao_salarial?.toString() || "",
          status: data.status || "Banco de Talentos",
          feedback: data.feedback || "",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar candidato:", error);
      toast.error("Erro ao carregar candidato");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        nome_completo: formData.nome_completo,
        email: formData.email,
        telefone: formData.telefone || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        linkedin: formData.linkedin || null,
        curriculo_link: formData.curriculo_link || null,
        nivel: (formData.nivel || null) as any,
        area: (formData.area || null) as any,
        recrutador: formData.recrutador || null,
        vaga_relacionada_id: formData.vaga_relacionada_id || null,
        pretensao_salarial: formData.pretensao_salarial ? parseFloat(formData.pretensao_salarial) : null,
        status: formData.status as any,
        feedback: formData.feedback || null,
      };

      if (candidatoId) {
        const { error } = await supabase
          .from("candidatos")
          .update(dataToSave)
          .eq("id", candidatoId);
        if (error) throw error;
        toast.success("Candidato atualizado com sucesso!");
      } else {
        const { data: newCandidato, error } = await supabase
          .from("candidatos")
          .insert([dataToSave])
          .select()
          .single();
        if (error) throw error;

        // Logar evento se candidato foi vinculado a uma vaga
        if (dataToSave.vaga_relacionada_id) {
          const { logVagaEvento } = await import("@/lib/vagaEventos");
          const { data: { user } } = await supabase.auth.getUser();
          
          await logVagaEvento({
            vagaId: dataToSave.vaga_relacionada_id,
            actorUserId: user?.id,
            tipo: "CANDIDATO_ADICIONADO",
            descricao: `Candidato "${dataToSave.nome_completo}" adicionado à vaga`,
            payload: {
              candidatoId: newCandidato?.id,
              nomeCandidato: dataToSave.nome_completo,
              etapaInicial: dataToSave.status
            }
          });
        }

        toast.success("Candidato criado com sucesso!");
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar candidato:", error);
      toast.error("Erro ao salvar candidato");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {candidatoId ? "Editar Candidato" : "Novo Candidato"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nome_completo">Nome Completo *</Label>
                <Input
                  id="nome_completo"
                  required
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    placeholder="SP"
                    maxLength={2}
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  placeholder="https://linkedin.com/in/..."
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Perfil Profissional */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Perfil Profissional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="area">Área</Label>
                  <Select value={formData.area} onValueChange={(value) => setFormData({ ...formData, area: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {Constants.public.Enums.area_candidato.map((area) => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="nivel">Nível</Label>
                  <Select value={formData.nivel} onValueChange={(value) => setFormData({ ...formData, nivel: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {Constants.public.Enums.nivel_candidato.map((nivel) => (
                        <SelectItem key={nivel} value={nivel}>{nivel}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="pretensao_salarial">Pretensão Salarial (R$)</Label>
                <Input
                  id="pretensao_salarial"
                  type="number"
                  step="0.01"
                  placeholder="R$ 0,00"
                  value={formData.pretensao_salarial}
                  onChange={(e) => setFormData({ ...formData, pretensao_salarial: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="curriculo_link">Link do Currículo</Label>
                <Input
                  id="curriculo_link"
                  placeholder="https://..."
                  value={formData.curriculo_link}
                  onChange={(e) => setFormData({ ...formData, curriculo_link: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Relacionamento com Processos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Relacionamento com Processos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="recrutador">Recrutador Responsável</Label>
                <Select value={formData.recrutador} onValueChange={(value) => setFormData({ ...formData, recrutador: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {RECRUTADORES.map((rec) => (
                      <SelectItem key={rec} value={rec}>{rec}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="vaga_relacionada_id">Vaga Vinculada</Label>
                <Select value={formData.vaga_relacionada_id} onValueChange={(value) => setFormData({ ...formData, vaga_relacionada_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {vagas.map((vaga) => (
                      <SelectItem key={vaga.id} value={vaga.id}>{vaga.titulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status Atual</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {Constants.public.Enums.status_candidato.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="feedback">Observações</Label>
                <Textarea
                  id="feedback"
                  rows={3}
                  placeholder="Campo livre de observações..."
                  value={formData.feedback}
                  onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
