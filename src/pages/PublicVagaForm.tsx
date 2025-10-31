import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";

const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export default function PublicVagaForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    empresa: "",
    confidencial: false,
    motivo_confidencial: "",
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
    contato_nome: "",
    contato_email: "",
    contato_telefone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        titulo: formData.titulo,
        empresa: formData.empresa,
        confidencial: formData.confidencial,
        motivo_confidencial: formData.confidencial ? formData.motivo_confidencial : null,
        status: "A iniciar" as any, // Default status for external submissions
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
        observacoes: [
          formData.observacoes,
          `\n\n--- Contato do Solicitante ---`,
          `Nome: ${formData.contato_nome}`,
          `Email: ${formData.contato_email}`,
          `Telefone: ${formData.contato_telefone || "Não informado"}`
        ].filter(Boolean).join("\n"),
      };

      const { error } = await supabase
        .from("vagas")
        .insert([dataToSave]);

      if (error) throw error;

      setSubmitted(true);
      toast.success("Solicitação de vaga enviada com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar vaga:", error);
      toast.error("Erro ao enviar solicitação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FFFDF6] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-success/10 p-6">
                <CheckCircle2 className="h-16 w-16 text-success" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-[#00141D] mb-4">
              Solicitação Enviada com Sucesso! 🎉
            </h2>
            <p className="text-muted-foreground mb-8">
              Recebemos sua solicitação de vaga e nossa equipe entrará em contato em breve 
              para dar continuidade ao processo de recrutamento.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => setSubmitted(false)} variant="outline">
                Enviar Outra Vaga
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF6] py-12 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F9EC3F]">
              <span className="text-2xl font-bold text-[#00141D]">R</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[#00141D] mb-2">
            Solicitar Nova Vaga
          </h1>
          <p className="text-muted-foreground">
            Preencha os dados abaixo para iniciar o processo de recrutamento
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações de Contato */}
          <Card>
            <CardHeader>
              <CardTitle>Seus Dados de Contato</CardTitle>
              <CardDescription>
                Precisamos dessas informações para entrar em contato com você
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="contato_nome">Seu Nome Completo *</Label>
                <Input
                  id="contato_nome"
                  required
                  placeholder="Ex: João Silva"
                  value={formData.contato_nome}
                  onChange={(e) => setFormData({ ...formData, contato_nome: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contato_email">Seu E-mail *</Label>
                  <Input
                    id="contato_email"
                    type="email"
                    required
                    placeholder="joao@empresa.com"
                    value={formData.contato_email}
                    onChange={(e) => setFormData({ ...formData, contato_email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="contato_telefone">Telefone (opcional)</Label>
                  <Input
                    id="contato_telefone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={formData.contato_telefone}
                    onChange={(e) => setFormData({ ...formData, contato_telefone: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Vaga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título da Vaga *</Label>
                <Input
                  id="titulo"
                  required
                  placeholder="Ex: Analista de Marketing Pleno"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="empresa">Nome da Empresa *</Label>
                <Input
                  id="empresa"
                  required
                  placeholder="Ex: Empresa XYZ Ltda"
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
                <Label htmlFor="confidencial" className="font-normal">
                  Esta é uma vaga confidencial (nome da empresa não deve ser divulgado)
                </Label>
              </div>

              {formData.confidencial && (
                <div>
                  <Label htmlFor="motivo_confidencial">Motivo da Confidencialidade</Label>
                  <Textarea
                    id="motivo_confidencial"
                    placeholder="Ex: Substituição de funcionário atual, expansão estratégica..."
                    value={formData.motivo_confidencial}
                    onChange={(e) => setFormData({ ...formData, motivo_confidencial: e.target.value })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalhes da Vaga */}
          <Card>
            <CardHeader>
              <CardTitle>Condições de Trabalho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salario_min">Faixa Salarial Mínima (R$)</Label>
                  <Input
                    id="salario_min"
                    type="number"
                    step="0.01"
                    placeholder="3000.00"
                    value={formData.salario_min}
                    onChange={(e) => setFormData({ ...formData, salario_min: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="salario_max">Faixa Salarial Máxima (R$)</Label>
                  <Input
                    id="salario_max"
                    type="number"
                    step="0.01"
                    placeholder="5000.00"
                    value={formData.salario_max}
                    onChange={(e) => setFormData({ ...formData, salario_max: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="modelo_trabalho">Modelo de Trabalho</Label>
                <Select value={formData.modelo_trabalho} onValueChange={(value) => setFormData({ ...formData, modelo_trabalho: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.modelo_trabalho.map((modelo) => (
                      <SelectItem key={modelo} value={modelo}>{modelo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="horario_fim">Horário de Término</Label>
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
                      <Label htmlFor={dia} className="font-normal">{dia}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="beneficios">Benefícios Oferecidos</Label>
                <Input
                  id="beneficios"
                  placeholder="Ex: Vale Refeição, Vale Transporte, Plano de Saúde, Home Office"
                  value={formData.beneficios}
                  onChange={(e) => setFormData({ ...formData, beneficios: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separe os benefícios por vírgula
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Requisitos e Responsabilidades */}
          <Card>
            <CardHeader>
              <CardTitle>Descrição da Vaga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="requisitos_obrigatorios">Requisitos Obrigatórios *</Label>
                <Textarea
                  id="requisitos_obrigatorios"
                  required
                  rows={4}
                  placeholder="Liste os requisitos essenciais para a vaga..."
                  value={formData.requisitos_obrigatorios}
                  onChange={(e) => setFormData({ ...formData, requisitos_obrigatorios: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="requisitos_desejaveis">Requisitos Desejáveis</Label>
                <Textarea
                  id="requisitos_desejaveis"
                  rows={4}
                  placeholder="Liste as qualificações que seriam um diferencial..."
                  value={formData.requisitos_desejaveis}
                  onChange={(e) => setFormData({ ...formData, requisitos_desejaveis: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="responsabilidades">Principais Responsabilidades *</Label>
                <Textarea
                  id="responsabilidades"
                  required
                  rows={4}
                  placeholder="Descreva as principais atividades do dia a dia..."
                  value={formData.responsabilidades}
                  onChange={(e) => setFormData({ ...formData, responsabilidades: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="observacoes">Informações Adicionais</Label>
                <Textarea
                  id="observacoes"
                  rows={3}
                  placeholder="Alguma informação adicional relevante sobre a vaga..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button 
              type="submit" 
              disabled={loading}
              size="lg"
              className="bg-[#F9EC3F] text-[#00141D] hover:bg-[#F9EC3F]/90 font-semibold"
            >
              <Save className="mr-2 h-5 w-5" />
              {loading ? "Enviando..." : "Enviar Solicitação de Vaga"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
