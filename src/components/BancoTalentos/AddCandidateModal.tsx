import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { MODELO_CONTRATACAO_OPTIONS, FORMATO_TRABALHO_OPTIONS, CARGO_OPTIONS, ESTADOS_BRASILEIROS } from "@/constants/fitCultural";

interface AddCandidateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

export function AddCandidateModal({ open, onOpenChange, onSuccess }: AddCandidateModalProps) {
  const [loading, setLoading] = useState(false);
  const [recruiters, setRecruiters] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({
    nome_completo: "",
    email: "",
    telefone: "",
    cidade: "",
    estado: "",
    area: "",
    nivel: "",
    cargo: "",
    pretensao_salarial: "",
    linkedin: "",
    recruiter_id: "",
    curriculo_link: "",
    portfolio_link: "",
    feedback: "",
    modelo_contratacao: "",
    formato_trabalho: ""
  });

  useEffect(() => {
    if (open) {
      loadRecruiters();
    }
  }, [open]);

  const loadRecruiters = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("role", "recruiter");

      if (error) throw error;
      setRecruiters(data || []);
    } catch (error: any) {
      logger.error("Erro ao carregar recrutadores:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("candidatos").insert({
        nome_completo: formData.nome_completo,
        email: formData.email,
        telefone: formData.telefone || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        area: formData.area as any,
        nivel: formData.nivel as any,
        cargo: formData.cargo || null,
        pretensao_salarial: formData.pretensao_salarial ? parseFloat(formData.pretensao_salarial) : null,
        linkedin: formData.linkedin || null,
        recruiter_id: formData.recruiter_id || null,
        recrutador: null,
        status: "Banco de Talentos",
        curriculo_link: formData.curriculo_link || null,
        portfolio_url: formData.portfolio_link || null,
        feedback: formData.feedback || null,
        modelo_contratacao: formData.modelo_contratacao || null,
        formato_trabalho: formData.formato_trabalho || null
      });

      if (error) throw error;

      toast.success("Candidato adicionado com sucesso!");
      onSuccess();
      resetForm();
    } catch (error: any) {
      logger.error("Erro ao adicionar candidato:", error);
      toast.error("Erro ao adicionar candidato");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome_completo: "",
      email: "",
      telefone: "",
      cidade: "",
      estado: "",
      area: "",
      nivel: "",
      cargo: "",
      pretensao_salarial: "",
      linkedin: "",
      recruiter_id: "",
      curriculo_link: "",
      portfolio_link: "",
      feedback: "",
      modelo_contratacao: "",
      formato_trabalho: ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Candidato ao Banco de Talentos</DialogTitle>
          <DialogDescription>
            Preencha os dados do candidato para adicionar ao banco de talentos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="nome_completo">Nome Completo *</Label>
              <Input
                id="nome_completo"
                value={formData.nome_completo}
                onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>

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
              <Select value={formData.estado} onValueChange={(value) => setFormData({ ...formData, estado: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {ESTADOS_BRASILEIROS.map((estado) => (
                    <SelectItem key={estado.value} value={estado.value}>{estado.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="area">Área de Atuação</Label>
              <Select value={formData.area} onValueChange={(value) => setFormData({ ...formData, area: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RH">RH</SelectItem>
                  <SelectItem value="Comercial">Comercial</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Administrativo">Administrativo</SelectItem>
                  <SelectItem value="TI">Tech</SelectItem>
                  <SelectItem value="Financeiro">Financeiro</SelectItem>
                  <SelectItem value="Operações">Operacional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cargo">Cargo</Label>
              <Select value={formData.cargo} onValueChange={(value) => setFormData({ ...formData, cargo: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CARGO_OPTIONS.map((cargo) => (
                    <SelectItem key={cargo.value} value={cargo.value}>{cargo.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="nivel">Senioridade</Label>
              <Select value={formData.nivel} onValueChange={(value) => setFormData({ ...formData, nivel: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Estagiário">Estágio</SelectItem>
                  <SelectItem value="Júnior">Júnior</SelectItem>
                  <SelectItem value="Pleno">Pleno</SelectItem>
                  <SelectItem value="Sênior">Sênior</SelectItem>
                  <SelectItem value="Coordenador">Coordenador</SelectItem>
                  <SelectItem value="Liderança">Gerente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="pretensao_salarial">Pretensão Salarial (R$)</Label>
              <Input
                id="pretensao_salarial"
                type="number"
                step="0.01"
                value={formData.pretensao_salarial}
                onChange={(e) => setFormData({ ...formData, pretensao_salarial: e.target.value })}
                placeholder="5000.00"
              />
            </div>

            <div>
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                type="url"
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            <div>
              <Label htmlFor="recruiter_id">Recrutador Responsável</Label>
              <Select 
                value={formData.recruiter_id} 
                onValueChange={(value) => setFormData({ ...formData, recruiter_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {recruiters.map((recruiter) => (
                    <SelectItem key={recruiter.id} value={recruiter.id}>
                      {recruiter.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="curriculo_link">Link do Currículo</Label>
              <Input
                id="curriculo_link"
                type="url"
                value={formData.curriculo_link}
                onChange={(e) => setFormData({ ...formData, curriculo_link: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="portfolio_link">Link do Portfólio</Label>
              <Input
                id="portfolio_link"
                type="url"
                value={formData.portfolio_link}
                onChange={(e) => setFormData({ ...formData, portfolio_link: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="modelo_contratacao">Modelo de Contratação</Label>
              <Select 
                value={formData.modelo_contratacao} 
                onValueChange={(value) => setFormData({ ...formData, modelo_contratacao: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {MODELO_CONTRATACAO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="formato_trabalho">Formato de Trabalho</Label>
              <Select 
                value={formData.formato_trabalho} 
                onValueChange={(value) => setFormData({ ...formData, formato_trabalho: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {FORMATO_TRABALHO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="feedback">Observações</Label>
              <Textarea
                id="feedback"
                value={formData.feedback}
                onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                rows={3}
                placeholder="Observações sobre o candidato..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-[#F9EC3F] hover:bg-[#F9EC3F]/90 text-[#00141D] font-semibold"
            >
              {loading ? "Salvando..." : "Salvar Candidato"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
