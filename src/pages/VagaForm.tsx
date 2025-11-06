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
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { parseCurrency, applyCurrencyMask } from "@/lib/salaryUtils";
import { useUsers } from "@/hooks/useUsers";
import { TagPicker } from "@/components/TagPicker";

const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const BENEFICIOS_OPTIONS: MultiSelectOption[] = [
  { label: "VR (Vale Refeição)", value: "VR" },
  { label: "VA (Vale Alimentação)", value: "VA" },
  { label: "Convênio Médico", value: "Convênio Médico" },
  { label: "Convênio Odontológico", value: "Convênio Odonto" },
  { label: "Convênio Farmácia", value: "Convênio Farmácia" },
  { label: "Seguro de Vida", value: "Seguro de Vida" },
  { label: "PLR (Participação nos Lucros)", value: "PLR" },
  { label: "Comissão", value: "Comissão" },
  { label: "Wellhub (Gympass)", value: "Wellhub" },
  { label: "Ajuda de Custo/Transporte", value: "Ajuda de Custo" },
  { label: "VT (Vale Transporte)", value: "VT" },
  { label: "Day Off", value: "Day Off" },
  { label: "Outros", value: "Outros" },
];

export default function VagaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { users: recrutadores } = useUsers('recrutador');
  const { users: csUsers } = useUsers('cs');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    titulo: "",
    empresa: "",
    confidencial: false,
    motivo_confidencial: "",
    recrutador_id: "",
    cs_id: "",
    complexidade: "",
    prioridade: "",
    status: "A iniciar",
    salario_min: "",
    salario_max: "",
    salario_modalidade: "FAIXA" as "FAIXA" | "A_COMBINAR",
    modelo_trabalho: "",
    horario_inicio: "",
    horario_fim: "",
    dias_semana: [] as string[],
    beneficios: [] as string[],
    beneficios_outros: "",
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
          recrutador_id: data.recrutador_id || "",
          cs_id: data.cs_id || "",
          complexidade: data.complexidade || "",
          prioridade: data.prioridade || "",
          status: data.status || "A iniciar",
          salario_min: data.salario_min?.toString() || "",
          salario_max: data.salario_max?.toString() || "",
          salario_modalidade: (data.salario_modalidade as any) || "FAIXA",
          modelo_trabalho: data.modelo_trabalho || "",
          horario_inicio: data.horario_inicio || "",
          horario_fim: data.horario_fim || "",
          dias_semana: data.dias_semana || [],
          beneficios: data.beneficios || [],
          beneficios_outros: data.beneficios_outros || "",
          requisitos_obrigatorios: data.requisitos_obrigatorios || "",
          requisitos_desejaveis: data.requisitos_desejaveis || "",
          responsabilidades: data.responsabilidades || "",
          observacoes: data.observacoes || "",
        });

        // Carregar tags da vaga
        const { data: vacancyTagsData } = await (supabase as any)
          .from("vacancy_tags")
          .select("tag_id")
          .eq("vacancy_id", id);

        if (vacancyTagsData) {
          setSelectedTags(vacancyTagsData.map((vt: any) => vt.tag_id));
        }
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
      // Validations
      if (formData.salario_modalidade === "FAIXA") {
        const salMin = parseCurrency(formData.salario_min);
        const salMax = parseCurrency(formData.salario_max);
        
        if (!salMin && !salMax) {
          toast.error("Informe pelo menos um valor de salário ou marque 'A combinar'");
          setLoading(false);
          return;
        }
        
        if (salMin && salMax && salMin > salMax) {
          toast.error("O salário mínimo não pode ser maior que o máximo");
          setLoading(false);
          return;
        }
      }

      const dataToSave = {
        titulo: formData.titulo,
        empresa: formData.empresa,
        confidencial: formData.confidencial,
        motivo_confidencial: formData.confidencial ? formData.motivo_confidencial : null,
        recrutador_id: formData.recrutador_id || null,
        cs_id: formData.cs_id || null,
        complexidade: (formData.complexidade || null) as any,
        prioridade: (formData.prioridade || null) as any,
        status: formData.status as any,
        salario_min: formData.salario_modalidade === "A_COMBINAR" ? null : parseCurrency(formData.salario_min),
        salario_max: formData.salario_modalidade === "A_COMBINAR" ? null : parseCurrency(formData.salario_max),
        salario_modalidade: formData.salario_modalidade,
        modelo_trabalho: (formData.modelo_trabalho || null) as any,
        horario_inicio: formData.horario_inicio || null,
        horario_fim: formData.horario_fim || null,
        dias_semana: formData.dias_semana.length > 0 ? formData.dias_semana : null,
        beneficios: formData.beneficios.length > 0 ? formData.beneficios : null,
        beneficios_outros: formData.beneficios.includes("Outros") ? formData.beneficios_outros : null,
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

        // Atualizar tags da vaga
        await saveTags(id);

        toast.success("Vaga atualizada com sucesso!");
      } else {
        const { data: newVaga, error } = await supabase
          .from("vagas")
          .insert([dataToSave])
          .select()
          .single();
        
        if (error) throw error;

        // Salvar tags da vaga
        if (newVaga) {
          await saveTags(newVaga.id);
        }

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

  const saveTags = async (vagaId: string) => {
    try {
      // Remover todas as tags existentes
      await (supabase as any)
        .from("vacancy_tags")
        .delete()
        .eq("vacancy_id", vagaId);

      // Inserir novas tags
      if (selectedTags.length > 0) {
        const tagsToInsert = selectedTags.map((tagId) => ({
          vacancy_id: vagaId,
          tag_id: tagId,
        }));

        const { error } = await (supabase as any)
          .from("vacancy_tags")
          .insert(tagsToInsert);

        if (error) throw error;
      }
    } catch (error) {
      console.error("Erro ao salvar tags:", error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#00141d' }}>
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
                <Select value={formData.recrutador_id} onValueChange={(value) => setFormData({ ...formData, recrutador_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um recrutador" />
                  </SelectTrigger>
                  <SelectContent>
                    {recrutadores.map((rec) => (
                      <SelectItem key={rec.id} value={rec.id}>
                        {rec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cs_responsavel">CS Responsável</Label>
                <Select value={formData.cs_id} onValueChange={(value) => setFormData({ ...formData, cs_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um CS" />
                  </SelectTrigger>
                  <SelectContent>
                    {csUsers.map((cs) => (
                      <SelectItem key={cs.id} value={cs.id}>
                        {cs.name}
                      </SelectItem>
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
              {/* Salário */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="salario_a_combinar"
                    checked={formData.salario_modalidade === "A_COMBINAR"}
                    onCheckedChange={(checked) => 
                      setFormData({ 
                        ...formData, 
                        salario_modalidade: checked ? "A_COMBINAR" : "FAIXA",
                        salario_min: "",
                        salario_max: ""
                      })
                    }
                  />
                  <Label htmlFor="salario_a_combinar">A combinar</Label>
                </div>

                {formData.salario_modalidade === "FAIXA" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="salario_min">Salário Mínimo (R$)</Label>
                        <Input
                          id="salario_min"
                          placeholder="5000"
                          value={formData.salario_min}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d]/g, "");
                            setFormData({ ...formData, salario_min: value });
                          }}
                          onBlur={(e) => {
                            if (e.target.value) {
                              setFormData({ ...formData, salario_min: applyCurrencyMask(e.target.value) });
                            }
                          }}
                        />
                      </div>

                      <div>
                        <Label htmlFor="salario_max">Salário Máximo (R$)</Label>
                        <Input
                          id="salario_max"
                          placeholder="8000"
                          value={formData.salario_max}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d]/g, "");
                            setFormData({ ...formData, salario_max: value });
                          }}
                          onBlur={(e) => {
                            if (e.target.value) {
                              setFormData({ ...formData, salario_max: applyCurrencyMask(e.target.value) });
                            }
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Digite apenas números; formatamos automaticamente (ex: 5000 → R$ 5.000)
                    </p>
                  </>
                )}
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

              {/* Benefícios */}
              <div>
                <Label>Benefícios</Label>
                <MultiSelect
                  options={BENEFICIOS_OPTIONS}
                  value={formData.beneficios}
                  onChange={(value) => setFormData({ ...formData, beneficios: value })}
                  placeholder="Selecione os benefícios oferecidos"
                />
              </div>

              {formData.beneficios.includes("Outros") && (
                <div>
                  <Label htmlFor="beneficios_outros">Especifique outros benefícios</Label>
                  <Input
                    id="beneficios_outros"
                    placeholder="Ex: Auxílio home office, Bônus anual..."
                    value={formData.beneficios_outros}
                    onChange={(e) => setFormData({ ...formData, beneficios_outros: e.target.value })}
                  />
                </div>
              )}
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

          <Card>
            <CardHeader>
              <CardTitle>Tags e Categorização</CardTitle>
            </CardHeader>
            <CardContent>
              <TagPicker
                selectedTags={selectedTags}
                onChange={setSelectedTags}
                disabled={loading}
              />
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
