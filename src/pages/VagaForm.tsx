import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";

const RECRUTADORES = ["Ítalo", "Bianca Marques", "Victor", "Mariana", "Isabella"];
const CS_RESPONSAVEIS = ["Marcela Rangel", "Ana Carolina"];
const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export default function VagaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    empresa: "",
    confidencial: false,
    motivo_confidencial: "",
    recrutador: "",
    cs_responsavel: "",
    complexidade: "",
    prioridade: "",
    status: "A iniciar",
    salario_min: "",
    salario_max: "",
    modelo_trabalho: "",
    horario_inicio: "",
    horario_fim: "",
    dias_semana: [] as string[],
    beneficios: "",
    requisitos_obrigatorios: "",
    requisitos_desejaveis: "",
    responsabilidades: "",
    observacoes: "",
  });

  useEffect(() => {
    if (id) {
      loadVaga();
    }
  }, [id]);

  const loadVaga = async () => {
    try {
      const { data, error } = await supabase
        .from("vagas")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          titulo: data.titulo || "",
          empresa: data.empresa || "",
          confidencial: data.confidencial || false,
          motivo_confidencial: data.motivo_confidencial || "",
          recrutador: data.recrutador || "",
          cs_responsavel: data.cs_responsavel || "",
          complexidade: data.complexidade || "",
          prioridade: data.prioridade || "",
          status: data.status || "A iniciar",
          salario_min: data.salario_min?.toString() || "",
          salario_max: data.salario_max?.toString() || "",
          modelo_trabalho: data.modelo_trabalho || "",
          horario_inicio: data.horario_inicio || "",
          horario_fim: data.horario_fim || "",
          dias_semana: data.dias_semana || [],
          beneficios: data.beneficios?.join(", ") || "",
          requisitos_obrigatorios: data.requisitos_obrigatorios || "",
          requisitos_desejaveis: data.requisitos_desejaveis || "",
          responsabilidades: data.responsabilidades || "",
          observacoes: data.observacoes || "",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar vaga:", error);
      toast.error("Erro ao carregar vaga");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        titulo: formData.titulo,
        empresa: formData.empresa,
        confidencial: formData.confidencial,
        motivo_confidencial: formData.confidencial ? formData.motivo_confidencial : null,
        recrutador: formData.recrutador || null,
        cs_responsavel: formData.cs_responsavel || null,
        complexidade: (formData.complexidade || null) as any,
        prioridade: (formData.prioridade || null) as any,
        status: formData.status as any,
        salario_min: formData.salario_min ? parseFloat(formData.salario_min) : null,
        salario_max: formData.salario_max ? parseFloat(formData.salario_max) : null,
        modelo_trabalho: (formData.modelo_trabalho || null) as any,
        horario_inicio: formData.horario_inicio || null,
        horario_fim: formData.horario_fim || null,
        dias_semana: formData.dias_semana.length > 0 ? formData.dias_semana : null,
        beneficios: formData.beneficios ? formData.beneficios.split(",").map(b => b.trim()) : null,
        requisitos_obrigatorios: formData.requisitos_obrigatorios || null,
        requisitos_desejaveis: formData.requisitos_desejaveis || null,
        responsabilidades: formData.responsabilidades || null,
        observacoes: formData.observacoes || null,
      };

      if (id) {
        const { error } = await supabase
          .from("vagas")
          .update(dataToSave)
          .eq("id", id);
        if (error) throw error;
        toast.success("Vaga atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("vagas")
          .insert([dataToSave]);
        if (error) throw error;
        toast.success("Vaga criada com sucesso!");
      }
      navigate("/vagas");
    } catch (error) {
      console.error("Erro ao salvar vaga:", error);
      toast.error("Erro ao salvar vaga");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/vagas")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">{id ? "Editar Vaga" : "Nova Vaga"}</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título da Vaga *</Label>
                <Input
                  id="titulo"
                  required
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="empresa">Empresa *</Label>
                <Input
                  id="empresa"
                  required
                  value={formData.empresa}
                  onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confidencial"
                  checked={formData.confidencial}
                  onCheckedChange={(checked) => setFormData({ ...formData, confidencial: checked as boolean })}
                />
                <Label htmlFor="confidencial">Vaga Confidencial</Label>
              </div>

              {formData.confidencial && (
                <div>
                  <Label htmlFor="motivo_confidencial">Motivo da Confidencialidade</Label>
                  <Textarea
                    id="motivo_confidencial"
                    value={formData.motivo_confidencial}
                    onChange={(e) => setFormData({ ...formData, motivo_confidencial: e.target.value })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recrutamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="recrutador">Recrutador</Label>
                <Select value={formData.recrutador} onValueChange={(value) => setFormData({ ...formData, recrutador: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um recrutador" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECRUTADORES.map((rec) => (
                      <SelectItem key={rec} value={rec}>{rec}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cs_responsavel">CS Responsável</Label>
                <Select value={formData.cs_responsavel} onValueChange={(value) => setFormData({ ...formData, cs_responsavel: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um CS" />
                  </SelectTrigger>
                  <SelectContent>
                    {CS_RESPONSAVEIS.map((cs) => (
                      <SelectItem key={cs} value={cs}>{cs}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="complexidade">Complexidade</Label>
                  <Select value={formData.complexidade} onValueChange={(value) => setFormData({ ...formData, complexidade: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Constants.public.Enums.complexidade_vaga.map((comp) => (
                        <SelectItem key={comp} value={comp}>{comp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select value={formData.prioridade} onValueChange={(value) => setFormData({ ...formData, prioridade: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Constants.public.Enums.prioridade_vaga.map((prio) => (
                        <SelectItem key={prio} value={prio}>{prio}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.status_vaga.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Vaga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salario_min">Salário Mínimo (R$)</Label>
                  <Input
                    id="salario_min"
                    type="number"
                    step="0.01"
                    value={formData.salario_min}
                    onChange={(e) => setFormData({ ...formData, salario_min: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="salario_max">Salário Máximo (R$)</Label>
                  <Input
                    id="salario_max"
                    type="number"
                    step="0.01"
                    value={formData.salario_max}
                    onChange={(e) => setFormData({ ...formData, salario_max: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="modelo_trabalho">Modelo de Trabalho</Label>
                <Select value={formData.modelo_trabalho} onValueChange={(value) => setFormData({ ...formData, modelo_trabalho: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.modelo_trabalho.map((modelo) => (
                      <SelectItem key={modelo} value={modelo}>{modelo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="horario_inicio">Horário de Início</Label>
                  <Input
                    id="horario_inicio"
                    type="time"
                    value={formData.horario_inicio}
                    onChange={(e) => setFormData({ ...formData, horario_inicio: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="horario_fim">Horário de Fim</Label>
                  <Input
                    id="horario_fim"
                    type="time"
                    value={formData.horario_fim}
                    onChange={(e) => setFormData({ ...formData, horario_fim: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Dias da Semana</Label>
                <div className="mt-2 flex flex-wrap gap-4">
                  {DIAS_SEMANA.map((dia) => (
                    <div key={dia} className="flex items-center space-x-2">
                      <Checkbox
                        id={dia}
                        checked={formData.dias_semana.includes(dia)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, dias_semana: [...formData.dias_semana, dia] });
                          } else {
                            setFormData({ ...formData, dias_semana: formData.dias_semana.filter(d => d !== dia) });
                          }
                        }}
                      />
                      <Label htmlFor={dia}>{dia}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="beneficios">Benefícios (separados por vírgula)</Label>
                <Input
                  id="beneficios"
                  placeholder="VR, VT, Plano de Saúde"
                  value={formData.beneficios}
                  onChange={(e) => setFormData({ ...formData, beneficios: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requisitos e Responsabilidades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="requisitos_obrigatorios">Requisitos Obrigatórios</Label>
                <Textarea
                  id="requisitos_obrigatorios"
                  rows={4}
                  value={formData.requisitos_obrigatorios}
                  onChange={(e) => setFormData({ ...formData, requisitos_obrigatorios: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="requisitos_desejaveis">Requisitos Desejáveis</Label>
                <Textarea
                  id="requisitos_desejaveis"
                  rows={4}
                  value={formData.requisitos_desejaveis}
                  onChange={(e) => setFormData({ ...formData, requisitos_desejaveis: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="responsabilidades">Responsabilidades</Label>
                <Textarea
                  id="responsabilidades"
                  rows={4}
                  value={formData.responsabilidades}
                  onChange={(e) => setFormData({ ...formData, responsabilidades: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  rows={3}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Salvando..." : "Salvar Vaga"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/vagas")}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
