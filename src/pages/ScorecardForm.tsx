import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Plus, Trash, GripVertical, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
interface MultipleChoiceOption {
  text: string;
  is_correct: boolean;
}
interface Criterion {
  id?: string;
  name: string;
  description: string;
  category: "hard_skills" | "soft_skills" | "experiencia" | "fit_cultural" | "outros";
  weight: number;
  display_order: number;
  question_type: "rating" | "open_text" | "multiple_choice";
  options: MultipleChoiceOption[] | null;
}
const categories = [{
  value: "hard_skills",
  label: "Hard Skills"
}, {
  value: "soft_skills",
  label: "Soft Skills"
}, {
  value: "experiencia",
  label: "Experiência"
}, {
  value: "fit_cultural",
  label: "Fit Cultural"
}, {
  value: "outros",
  label: "Outros"
}];
const questionTypes = [{
  value: "rating",
  label: "Nota (1-5)",
  description: "Avaliação com escala de 1 a 5"
}, {
  value: "open_text",
  label: "Texto Aberto",
  description: "Resposta dissertativa"
}, {
  value: "multiple_choice",
  label: "Múltipla Escolha",
  description: "Opções de resposta"
}];
const categoryColors: Record<string, string> = {
  hard_skills: "bg-blue-100 text-blue-800 border-blue-200",
  soft_skills: "bg-green-100 text-green-800 border-green-200",
  experiencia: "bg-purple-100 text-purple-800 border-purple-200",
  fit_cultural: "bg-orange-100 text-orange-800 border-orange-200",
  outros: "bg-gray-100 text-gray-800 border-gray-200"
};
export default function ScorecardForm() {
  const navigate = useNavigate();
  const {
    id
  } = useParams();
  const isEditing = !!id;
  const [loading, setLoading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateType, setTemplateType] = useState<"entrevista" | "teste_tecnico">("entrevista");
  const [criteria, setCriteria] = useState<Criterion[]>([{
    name: "",
    description: "",
    category: "hard_skills",
    weight: 10,
    display_order: 0,
    question_type: "rating",
    options: null
  }]);
  useEffect(() => {
    if (isEditing) {
      loadTemplate();
    }
  }, [id]);
  async function loadTemplate() {
    try {
      setLoading(true);
      const {
        data: template,
        error: templateError
      } = await supabase.from("scorecard_templates").select("*").eq("id", id).single();
      if (templateError) throw templateError;
      const {
        data: criteriaData,
        error: criteriaError
      } = await supabase.from("scorecard_criteria").select("*").eq("template_id", id).order("display_order");
      if (criteriaError) throw criteriaError;
      setTemplateName(template.name);
      setTemplateDescription(template.description || "");
      setTemplateType(template.type as "entrevista" | "teste_tecnico" || "entrevista");
      if (criteriaData && criteriaData.length > 0) {
        setCriteria(criteriaData.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description || "",
          category: c.category,
          weight: c.weight,
          display_order: c.display_order,
          question_type: c.question_type as "rating" | "open_text" | "multiple_choice" || "rating",
          options: c.options as unknown as MultipleChoiceOption[] | null
        })));
      }
    } catch (error: any) {
      console.error("Erro ao carregar template:", error);
      toast.error("Erro ao carregar template");
      navigate("/avaliacoes");
    } finally {
      setLoading(false);
    }
  }
  function addCriterion() {
    setCriteria([...criteria, {
      name: "",
      description: "",
      category: "hard_skills",
      weight: 10,
      display_order: criteria.length,
      question_type: "rating",
      options: null
    }]);
  }
  function removeCriterion(index: number) {
    const newCriteria = criteria.filter((_, i) => i !== index);
    newCriteria.forEach((c, i) => {
      c.display_order = i;
    });
    setCriteria(newCriteria);
  }
  function updateCriterion(index: number, field: keyof Criterion, value: any) {
    const newCriteria = [...criteria];
    newCriteria[index] = {
      ...newCriteria[index],
      [field]: value
    };

    // Se mudar o tipo para múltipla escolha, inicializar opções
    if (field === "question_type" && value === "multiple_choice" && !newCriteria[index].options) {
      newCriteria[index].options = [{
        text: "",
        is_correct: false
      }, {
        text: "",
        is_correct: false
      }];
    }

    // Se mudar para outro tipo, limpar opções
    if (field === "question_type" && value !== "multiple_choice") {
      newCriteria[index].options = null;
    }
    setCriteria(newCriteria);
  }
  function addOption(criterionIndex: number) {
    const newCriteria = [...criteria];
    const options = newCriteria[criterionIndex].options || [];
    newCriteria[criterionIndex].options = [...options, {
      text: "",
      is_correct: false
    }];
    setCriteria(newCriteria);
  }
  function removeOption(criterionIndex: number, optionIndex: number) {
    const newCriteria = [...criteria];
    const options = newCriteria[criterionIndex].options || [];
    if (options.length > 2) {
      newCriteria[criterionIndex].options = options.filter((_, i) => i !== optionIndex);
      setCriteria(newCriteria);
    }
  }
  function updateOption(criterionIndex: number, optionIndex: number, text: string) {
    const newCriteria = [...criteria];
    const options = [...(newCriteria[criterionIndex].options || [])];
    options[optionIndex] = {
      ...options[optionIndex],
      text
    };
    newCriteria[criterionIndex].options = options;
    setCriteria(newCriteria);
  }
  function setCorrectOption(criterionIndex: number, optionIndex: number) {
    const newCriteria = [...criteria];
    const options = (newCriteria[criterionIndex].options || []).map((opt, i) => ({
      ...opt,
      is_correct: i === optionIndex
    }));
    newCriteria[criterionIndex].options = options;
    setCriteria(newCriteria);
  }
  function moveCriterion(index: number, direction: "up" | "down") {
    if (direction === "up" && index === 0 || direction === "down" && index === criteria.length - 1) {
      return;
    }
    const newCriteria = [...criteria];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newCriteria[index], newCriteria[targetIndex]] = [newCriteria[targetIndex], newCriteria[index]];
    newCriteria.forEach((c, i) => {
      c.display_order = i;
    });
    setCriteria(newCriteria);
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Nome do template é obrigatório");
      return;
    }
    if (criteria.length === 0) {
      toast.error("Adicione pelo menos uma pergunta");
      return;
    }

    // Validate criteria
    const invalidCriteria = criteria.find(c => !c.name.trim());
    if (invalidCriteria) {
      toast.error("Todas as perguntas devem ter um texto");
      return;
    }

    // Validate multiple choice options
    const invalidMultipleChoice = criteria.find(c => {
      if (c.question_type === "multiple_choice") {
        if (!c.options || c.options.length < 2) return true;
        if (c.options.some(opt => !opt.text.trim())) return true;
        if (templateType === "teste_tecnico" && !c.options.some(opt => opt.is_correct)) return true;
      }
      return false;
    });
    if (invalidMultipleChoice) {
      if (templateType === "teste_tecnico") {
        toast.error("Perguntas de múltipla escolha devem ter pelo menos 2 opções preenchidas e uma marcada como correta");
      } else {
        toast.error("Perguntas de múltipla escolha devem ter pelo menos 2 opções preenchidas");
      }
      return;
    }

    // Validate total weight = 100
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight !== 100) {
      toast.error(`A soma dos pesos deve ser 100% (atual: ${totalWeight}%)`);
      return;
    }
    try {
      setLoading(true);
      if (isEditing) {
        // Update template
        const {
          error: templateError
        } = await supabase.from("scorecard_templates").update({
          name: templateName,
          description: templateDescription,
          type: templateType
        }).eq("id", id);
        if (templateError) throw templateError;

        // Delete existing criteria
        const {
          error: deleteError
        } = await supabase.from("scorecard_criteria").delete().eq("template_id", id);
        if (deleteError) throw deleteError;

        // Insert updated criteria
        const {
          error: criteriaError
        } = await supabase.from("scorecard_criteria").insert(criteria.map(c => ({
          template_id: id,
          name: c.name,
          description: c.description,
          category: c.category,
          weight: c.weight,
          display_order: c.display_order,
          question_type: c.question_type,
          options: c.options ? JSON.parse(JSON.stringify(c.options)) : null
        })));
        if (criteriaError) throw criteriaError;
        toast.success("Template atualizado com sucesso!");
      } else {
        // Create new template
        const {
          data: newTemplate,
          error: templateError
        } = await supabase.from("scorecard_templates").insert({
          name: templateName,
          description: templateDescription,
          type: templateType,
          active: true
        }).select().single();
        if (templateError) throw templateError;

        // Insert criteria
        const {
          error: criteriaError
        } = await supabase.from("scorecard_criteria").insert(criteria.map(c => ({
          template_id: newTemplate.id,
          name: c.name,
          description: c.description,
          category: c.category,
          weight: c.weight,
          display_order: c.display_order,
          question_type: c.question_type,
          options: c.options ? JSON.parse(JSON.stringify(c.options)) : null
        })));
        if (criteriaError) throw criteriaError;
        toast.success("Template criado com sucesso!");
      }
      navigate("/avaliacoes");
    } catch (error: any) {
      console.error("Erro ao salvar template:", error);
      toast.error("Erro ao salvar template");
    } finally {
      setLoading(false);
    }
  }
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (loading && isEditing) {
    return <div className="flex items-center justify-center min-h-screen bg-[#00141D]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FFCD00] border-t-transparent" />
      </div>;
  }
  return <div className="min-h-screen bg-[#00141D]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/avaliacoes")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-bold text-[#00141D] text-xl">
                  {isEditing ? "Editar Template" : "Novo Template"}
                </h1>
                <p className="text-base text-[#36404A] mt-1">
                  Configure as perguntas de avaliação
                </p>
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Template"}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        {/* Template Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Informações do Template</CardTitle>
            <CardDescription className="text-base">
              Defina o nome, descrição e tipo do template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Type */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Tipo de Template *</Label>
              <RadioGroup value={templateType} onValueChange={value => setTemplateType(value as "entrevista" | "teste_tecnico")} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="entrevista" id="entrevista" />
                  <Label htmlFor="entrevista" className="flex-1 cursor-pointer">
                    <div className="font-medium">Avaliação de Entrevista</div>
                    <div className="text-sm text-muted-foreground font-normal">
                      Preenchido pelo recrutador após entrevistar o candidato
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="teste_tecnico" id="teste_tecnico" />
                  <Label htmlFor="teste_tecnico" className="flex-1 cursor-pointer">
                    <div className="font-semibold">Teste Técnico</div>
                    <div className="text-sm text-muted-foreground">
                      Enviado ao candidato para preenchimento online
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-base">Nome do Template *</Label>
              <Input id="name" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder={templateType === "teste_tecnico" ? "Ex: Teste Técnico Dev Frontend" : "Ex: Avaliação Técnica Geral"} className="text-base" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-base">Descrição</Label>
              <Textarea id="description" value={templateDescription} onChange={e => setTemplateDescription(e.target.value)} placeholder="Descreva quando e como este template deve ser usado" rows={3} className="text-base" />
            </div>
          </CardContent>
        </Card>

        {/* Criteria */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Perguntas da Avaliação</CardTitle>
                <CardDescription className="text-base">
                  Defina as perguntas que serão avaliadas (peso total deve somar 100%)
                </CardDescription>
              </div>
              <Badge variant={totalWeight === 100 ? "default" : "destructive"} className="text-base px-3 py-1">
                Total: {totalWeight}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {criteria.map((criterion, index) => <Card key={index} className="border-2">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start gap-4">
                    {/* Drag Handle */}
                    <div className="flex flex-col gap-1 pt-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveCriterion(index, "up")} disabled={index === 0}>
                              <GripVertical className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mover para cima</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="flex-1 space-y-4">
                      {/* Question Type and Category */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-base">Tipo de Resposta</Label>
                          <Select value={criterion.question_type} onValueChange={value => updateCriterion(index, "question_type", value)}>
                            <SelectTrigger className="text-base">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {questionTypes.map(qt => <SelectItem key={qt.value} value={qt.value}>
                                  <div>
                                    <div className="font-medium">{qt.label}</div>
                                  </div>
                                </SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-base">Categoria</Label>
                          <Select value={criterion.category} onValueChange={value => updateCriterion(index, "category", value)}>
                            <SelectTrigger className="text-base">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => <SelectItem key={cat.value} value={cat.value}>
                                  <Badge variant="outline" className={categoryColors[cat.value]}>
                                    {cat.label}
                                  </Badge>
                                </SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-base">Peso (%)</Label>
                          <Input type="number" min="0" max="100" value={criterion.weight} onChange={e => updateCriterion(index, "weight", parseInt(e.target.value) || 0)} className="text-base" />
                        </div>
                      </div>

                      {/* Name */}
                      <div className="space-y-2">
                        <Label className="text-base">Pergunta *</Label>
                        <Input value={criterion.name} onChange={e => updateCriterion(index, "name", e.target.value)} placeholder={criterion.question_type === "open_text" ? "Ex: Descreva sua experiência com React e TypeScript" : criterion.question_type === "multiple_choice" ? "Ex: Qual framework você tem mais experiência?" : "Ex: O candidato demonstrou conhecimento técnico adequado?"} className="text-base" />
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label className="text-base">Descrição / Instrução</Label>
                        <Textarea value={criterion.description} onChange={e => updateCriterion(index, "description", e.target.value)} placeholder={templateType === "teste_tecnico" ? "Instruções para o candidato responder esta pergunta" : "Explique o que deve ser avaliado nesta pergunta"} rows={2} className="text-base" />
                      </div>

                      {/* Multiple Choice Options */}
                      {criterion.question_type === "multiple_choice" && <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                          <Label className="text-base font-semibold">Opções de Resposta</Label>
                          {templateType === "teste_tecnico" && <p className="text-sm text-muted-foreground">
                              Clique no ícone ✓ para marcar a resposta correta
                            </p>}
                          <div className="space-y-2">
                            {(criterion.options || []).map((option, optIndex) => <div key={optIndex} className="flex items-center gap-2">
                                {templateType === "teste_tecnico" && <Button type="button" variant={option.is_correct ? "default" : "ghost"} size="icon" className={`h-8 w-8 shrink-0 ${option.is_correct ? "bg-green-600 hover:bg-green-700" : "hover:bg-green-100"}`} onClick={() => setCorrectOption(index, optIndex)}>
                                    <CheckCircle2 className={`h-4 w-4 ${option.is_correct ? "text-white" : "text-muted-foreground"}`} />
                                  </Button>}
                                <Input value={option.text} onChange={e => updateOption(index, optIndex, e.target.value)} placeholder={`Opção ${optIndex + 1}`} className="flex-1" />
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index, optIndex)} disabled={(criterion.options?.length || 0) <= 2} className="text-destructive hover:bg-destructive hover:text-destructive-foreground h-8 w-8">
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>)}
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => addOption(index)} className="mt-2">
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar Opção
                          </Button>
                        </div>}
                    </div>

                    {/* Delete Button */}
                    <Button variant="ghost" size="icon" onClick={() => removeCriterion(index)} className="text-destructive hover:bg-destructive hover:text-destructive-foreground" disabled={criteria.length === 1}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>)}

            <Button variant="outline" onClick={addCriterion} className="w-full text-base">
              <Plus className="mr-2 h-5 w-5" />
              Adicionar Pergunta
            </Button>

            {/* Scale Info */}
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="text-base font-semibold mb-2">Informações sobre Tipos de Resposta</h4>
              <ul className="text-base text-muted-foreground space-y-2">
                <li>
                  <strong>Nota (1-5):</strong> Escala de avaliação onde 1 = Não atende e 5 = Excepcional
                </li>
                <li>
                  <strong>Texto Aberto:</strong> Resposta dissertativa que será avaliada pelo recrutador posteriormente
                </li>
                <li>
                  <strong>Múltipla Escolha:</strong> Opções de resposta 
                  {templateType === "teste_tecnico" ? " - marque a correta para calcular a nota automaticamente" : " para categorizar a resposta"}
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
}