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
import { Save, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { parseCurrency, applyCurrencyMask } from "@/lib/salaryUtils";
import { formatCNPJ, validateCNPJ, cleanCNPJ } from "@/lib/cnpjUtils";

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

export default function PublicVagaForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formStartTime] = useState(Date.now());
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    titulo: "",
    empresa: "",
    cnpj: "",
    confidencial: false,
    motivo_confidencial: "",
    salario_min: "",
    salario_max: "",
    salario_modalidade: "FAIXA" as "FAIXA" | "A_COMBINAR",
    modelo_trabalho: "",
    tipo_contratacao: "",
    horario_inicio: "",
    horario_fim: "",
    dias_semana: [] as string[],
    beneficios: [] as string[],
    beneficios_outros: "",
    requisitos_obrigatorios: "",
    requisitos_desejaveis: "",
    habilidades_comportamentais: "",
    quantidade_vagas: "1",
    responsabilidades: "",
    observacoes: "",
    contato_nome: "",
    contato_email: "",
    contato_telefone: "",
    website: "", // Honeypot field
  });

  const handleCNPJLookup = async () => {
    const cnpjLimpo = cleanCNPJ(formData.cnpj);
    
    if (cnpjLimpo.length === 0) {
      setCnpjError("CNPJ é obrigatório");
      return;
    }
    
    if (cnpjLimpo.length !== 14) {
      setCnpjError("CNPJ deve ter 14 dígitos");
      return;
    }
    
    if (!validateCNPJ(cnpjLimpo)) {
      setCnpjError("CNPJ inválido - verifique os dígitos");
      return;
    }
    
    setCnpjError(null);
    setCnpjLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('consultar-cnpj', {
        body: { cnpj: cnpjLimpo }
      });
      
      if (!error && data && data.status !== 'ERROR') {
        const nomeEmpresa = data.fantasia || data.nome || '';
        if (nomeEmpresa) {
          setFormData(prev => ({
            ...prev,
            empresa: nomeEmpresa
          }));
          toast.success('Dados da empresa carregados automaticamente!');
        }
      }
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      // Não bloqueia - usuário ainda pode preencher manualmente
    } finally {
      setCnpjLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar CNPJ obrigatório
      const cnpjLimpo = cleanCNPJ(formData.cnpj);
      if (cnpjLimpo.length !== 14 || !validateCNPJ(cnpjLimpo)) {
        setCnpjError("CNPJ inválido");
        toast.error("Por favor, informe um CNPJ válido");
        setLoading(false);
        return;
      }

      // Validations
      if (formData.salario_modalidade === "FAIXA") {
        const salMin = parseCurrency(formData.salario_min);
        const salMax = parseCurrency(formData.salario_max);
        
        if (salMin && salMax && salMin > salMax) {
          toast.error("O salário mínimo não pode ser maior que o máximo");
          setLoading(false);
          return;
        }
      }

      const dataToSave = {
        titulo: formData.titulo,
        empresa: formData.empresa,
        cnpj: cleanCNPJ(formData.cnpj),
        contato_nome: formData.contato_nome,
        contato_email: formData.contato_email,
        contato_telefone: formData.contato_telefone || null,
        website: formData.website, // Honeypot
        formStartTime, // Timing check
        confidencial: formData.confidencial,
        motivo_confidencial: formData.confidencial ? formData.motivo_confidencial : null,
        salario_min: formData.salario_modalidade === "A_COMBINAR" ? null : parseCurrency(formData.salario_min),
        salario_max: formData.salario_modalidade === "A_COMBINAR" ? null : parseCurrency(formData.salario_max),
        salario_modalidade: formData.salario_modalidade,
        modelo_trabalho: (formData.modelo_trabalho || null) as any,
        tipo_contratacao: formData.tipo_contratacao || null,
        horario_inicio: formData.horario_inicio || null,
        horario_fim: formData.horario_fim || null,
        dias_semana: formData.dias_semana.length > 0 ? formData.dias_semana : null,
        beneficios: formData.beneficios.length > 0 ? formData.beneficios : null,
        beneficios_outros: formData.beneficios.includes("Outros") ? formData.beneficios_outros : null,
        requisitos_obrigatorios: formData.requisitos_obrigatorios || null,
        requisitos_desejaveis: formData.requisitos_desejaveis,
        habilidades_comportamentais: formData.habilidades_comportamentais,
        quantidade_vagas: parseInt(formData.quantidade_vagas) || 1,
        responsabilidades: formData.responsabilidades || null,
        observacoes: formData.observacoes || null,
      };

      // Call edge function for secure, validated submission
      const { data: result, error } = await supabase.functions.invoke('submit-public-job', {
        body: dataToSave
      });

      if (error) throw error;
      if (!result?.success) throw new Error(result?.error || 'Erro ao enviar solicitação');

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
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border-2 border-primary/20">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="flex justify-center mb-6">
              <img 
                src="/src/assets/logo-rhello-dark.png" 
                alt="Rhello" 
                className="h-20 object-contain mb-4"
              />
            </div>
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-primary/10 p-6">
                <CheckCircle2 className="h-16 w-16 text-primary" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-[#00141D] mb-4">
              Solicitação Enviada com Sucesso! 🎉
            </h2>
            <p className="text-[#36404A] text-lg mb-8">
              Recebemos sua solicitação de vaga e nossa equipe entrará em contato em breve 
              para dar continuidade ao processo de recrutamento.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => setSubmitted(false)} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              >
                Enviar Outra Vaga
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="/src/assets/logo-rhello-dark.png" 
              alt="Rhello" 
              className="h-16 object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold text-[#00141D] mb-3">
            Solicitar Nova Vaga
          </h1>
          <p className="text-lg text-[#36404A]">
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
              
              {/* Honeypot field - hidden from users */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                style={{ position: 'absolute', left: '-9999px' }}
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
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
                <Label htmlFor="cnpj">CNPJ da Empresa *</Label>
                <div className="relative">
                  <Input
                    id="cnpj"
                    required
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={(e) => {
                      setCnpjError(null);
                      setFormData({ 
                        ...formData, 
                        cnpj: formatCNPJ(e.target.value) 
                      });
                    }}
                    onBlur={handleCNPJLookup}
                    maxLength={18}
                    className={cnpjError ? "border-destructive pr-10" : "pr-10"}
                  />
                  {cnpjLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {cnpjError && (
                  <p className="text-xs text-destructive mt-1">{cnpjError}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Ao informar o CNPJ, preenchemos automaticamente o nome da empresa
                </p>
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

              <div>
                <Label htmlFor="quantidade_vagas">Quantidade de Contratações para a Vaga *</Label>
                <Input
                  id="quantidade_vagas"
                  type="number"
                  min="1"
                  max="100"
                  required
                  placeholder="1"
                  value={formData.quantidade_vagas}
                  onChange={(e) => setFormData({ ...formData, quantidade_vagas: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Quantas pessoas serão contratadas para esta posição?
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Detalhes da Vaga */}
          <Card>
            <CardHeader>
              <CardTitle>Condições de Trabalho</CardTitle>
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
                  <Label htmlFor="salario_a_combinar" className="font-normal">
                    A combinar
                  </Label>
                </div>

                {formData.salario_modalidade === "FAIXA" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.modelo_trabalho.map((modelo) => (
                      <SelectItem key={modelo} value={modelo}>{modelo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tipo_contratacao">Formato da Contratação</Label>
                <Select value={formData.tipo_contratacao} onValueChange={(value) => setFormData({ ...formData, tipo_contratacao: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLT">CLT</SelectItem>
                    <SelectItem value="PJ">PJ</SelectItem>
                    <SelectItem value="CLT ou PJ">CLT ou PJ</SelectItem>
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

              {/* Benefícios */}
              <div>
                <Label>Benefícios Oferecidos</Label>
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
                <Label htmlFor="requisitos_desejaveis">Requisitos Desejáveis *</Label>
                <Textarea
                  id="requisitos_desejaveis"
                  required
                  rows={4}
                  placeholder="Liste as qualificações que seriam um diferencial..."
                  value={formData.requisitos_desejaveis}
                  onChange={(e) => setFormData({ ...formData, requisitos_desejaveis: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="habilidades_comportamentais">Habilidades Comportamentais *</Label>
                <Textarea
                  id="habilidades_comportamentais"
                  required
                  rows={4}
                  placeholder="Descreva as habilidades comportamentais desejadas (ex: liderança, comunicação, trabalho em equipe, resiliência...)"
                  value={formData.habilidades_comportamentais}
                  onChange={(e) => setFormData({ ...formData, habilidades_comportamentais: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Soft skills e competências interpessoais importantes para o cargo
                </p>
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
