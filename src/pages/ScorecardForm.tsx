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
import { ArrowLeft, Plus, Trash, GripVertical } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Criterion {
  id?: string;
  name: string;
  description: string;
  category: "hard_skills" | "soft_skills" | "experiencia" | "fit_cultural" | "outros";
  weight: number;
  display_order: number;
}

const categories = [
  { value: "hard_skills", label: "Hard Skills" },
  { value: "soft_skills", label: "Soft Skills" },
  { value: "experiencia", label: "Experiência" },
  { value: "fit_cultural", label: "Fit Cultural" },
  { value: "outros", label: "Outros" },
];

const categoryColors: Record<string, string> = {
  hard_skills: "bg-blue-100 text-blue-800 border-blue-200",
  soft_skills: "bg-green-100 text-green-800 border-green-200",
  experiencia: "bg-purple-100 text-purple-800 border-purple-200",
  fit_cultural: "bg-orange-100 text-orange-800 border-orange-200",
  outros: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function ScorecardForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>([
    {
      name: "",
      description: "",
      category: "hard_skills",
      weight: 10,
      display_order: 0,
    },
  ]);

  useEffect(() => {
    if (isEditing) {
      loadTemplate();
    }
  }, [id]);

  async function loadTemplate() {
    try {
      setLoading(true);

      const { data: template, error: templateError } = await supabase
        .from("scorecard_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (templateError) throw templateError;

      const { data: criteriaData, error: criteriaError } = await supabase
        .from("scorecard_criteria")
        .select("*")
        .eq("template_id", id)
        .order("display_order");

      if (criteriaError) throw criteriaError;

      setTemplateName(template.name);
      setTemplateDescription(template.description || "");
      
      if (criteriaData && criteriaData.length > 0) {
        setCriteria(
          criteriaData.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description || "",
            category: c.category,
            weight: c.weight,
            display_order: c.display_order,
          }))
        );
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
    setCriteria([
      ...criteria,
      {
        name: "",
        description: "",
        category: "hard_skills",
        weight: 10,
        display_order: criteria.length,
      },
    ]);
  }

  function removeCriterion(index: number) {
    const newCriteria = criteria.filter((_, i) => i !== index);
    // Reorder display_order
    newCriteria.forEach((c, i) => {
      c.display_order = i;
    });
    setCriteria(newCriteria);
  }

  function updateCriterion(index: number, field: keyof Criterion, value: any) {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], [field]: value };
    setCriteria(newCriteria);
  }

  function moveCriterion(index: number, direction: "up" | "down") {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === criteria.length - 1)
    ) {
      return;
    }

    const newCriteria = [...criteria];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    // Swap
    [newCriteria[index], newCriteria[targetIndex]] = [
      newCriteria[targetIndex],
      newCriteria[index],
    ];

    // Update display_order
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
    const invalidCriteria = criteria.find((c) => !c.name.trim());
    if (invalidCriteria) {
      toast.error("Todas as perguntas devem ter um texto");
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
        const { error: templateError } = await supabase
          .from("scorecard_templates")
          .update({
            name: templateName,
            description: templateDescription,
          })
          .eq("id", id);

        if (templateError) throw templateError;

        // Delete existing criteria
        const { error: deleteError } = await supabase
          .from("scorecard_criteria")
          .delete()
          .eq("template_id", id);

        if (deleteError) throw deleteError;

        // Insert updated criteria
        const { error: criteriaError } = await supabase
          .from("scorecard_criteria")
          .insert(
            criteria.map((c) => ({
              template_id: id,
              name: c.name,
              description: c.description,
              category: c.category,
              weight: c.weight,
              display_order: c.display_order,
            }))
          );

        if (criteriaError) throw criteriaError;

        toast.success("Template atualizado com sucesso!");
      } else {
        // Create new template
        const { data: newTemplate, error: templateError } = await supabase
          .from("scorecard_templates")
          .insert({
            name: templateName,
            description: templateDescription,
            active: true,
          })
          .select()
          .single();

        if (templateError) throw templateError;

        // Insert criteria
        const { error: criteriaError } = await supabase
          .from("scorecard_criteria")
          .insert(
            criteria.map((c) => ({
              template_id: newTemplate.id,
              name: c.name,
              description: c.description,
              category: c.category,
              weight: c.weight,
              display_order: c.display_order,
            }))
          );

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
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#00141D]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FFCD00] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#00141D]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/avaliacoes")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-[#00141D]">
                  {isEditing ? "Editar Template" : "Novo Template"}
                </h1>
                <p className="text-base text-[#36404A] mt-1">
                  Configure os critérios de avaliação
                </p>
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={loading}
            >
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
              Defina o nome e descrição do template de avaliação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base">Nome do Template *</Label>
              <Input
                id="name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Avaliação Técnica Geral"
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-base">Descrição</Label>
              <Textarea
                id="description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Descreva quando e como este template deve ser usado"
                rows={3}
                className="text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Criteria */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Perguntas da Avaliação</CardTitle>
                <CardDescription className="text-base">
                  Defina as perguntas que serão avaliadas (peso total deve somar 100%)
                </CardDescription>
              </div>
              <Badge
                variant={totalWeight === 100 ? "default" : "destructive"}
                className="text-base px-3 py-1"
              >
                Total: {totalWeight}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {criteria.map((criterion, index) => (
              <Card key={index} className="border-2">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start gap-4">
                    {/* Drag Handle */}
                    <div className="flex flex-col gap-1 pt-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => moveCriterion(index, "up")}
                              disabled={index === 0}
                            >
                              <GripVertical className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mover para cima</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="flex-1 space-y-4">
                      {/* Category and Weight */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-base">Categoria</Label>
                          <Select
                            value={criterion.category}
                            onValueChange={(value) =>
                              updateCriterion(index, "category", value)
                            }
                          >
                            <SelectTrigger className="text-base">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  <Badge
                                    variant="outline"
                                    className={categoryColors[cat.value]}
                                  >
                                    {cat.label}
                                  </Badge>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-base">Peso (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={criterion.weight}
                            onChange={(e) =>
                              updateCriterion(
                                index,
                                "weight",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="text-base"
                          />
                        </div>
                      </div>

                      {/* Name */}
                      <div className="space-y-2">
                        <Label className="text-base">Pergunta *</Label>
                        <Input
                          value={criterion.name}
                          onChange={(e) =>
                            updateCriterion(index, "name", e.target.value)
                          }
                          placeholder="Ex: O candidato demonstrou conhecimento técnico adequado?"
                          className="text-base"
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label className="text-base">Descrição</Label>
                        <Textarea
                          value={criterion.description}
                          onChange={(e) =>
                            updateCriterion(index, "description", e.target.value)
                          }
                          placeholder="Explique o que deve ser avaliado neste critério"
                          rows={2}
                          className="text-base"
                        />
                      </div>
                    </div>

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCriterion(index)}
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      disabled={criteria.length === 1}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              variant="outline"
              onClick={addCriterion}
              className="w-full text-base"
            >
              <Plus className="mr-2 h-5 w-5" />
              Adicionar Pergunta
            </Button>

            {/* Scale Info */}
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="text-base font-semibold mb-2">Escala de Avaliação</h4>
              <p className="text-base text-muted-foreground">
                Todas as perguntas utilizam escala de 1 a 5:
              </p>
              <ul className="text-base text-muted-foreground mt-2 space-y-1">
                <li>• 1 = Não atende às expectativas</li>
                <li>• 2 = Atende parcialmente</li>
                <li>• 3 = Atende às expectativas</li>
                <li>• 4 = Supera as expectativas</li>
                <li>• 5 = Excede significativamente</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}