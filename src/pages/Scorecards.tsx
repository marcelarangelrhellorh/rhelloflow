import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Copy, Edit, Trash, TrendingUp, Users, Target, User, ClipboardList, FileText } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
interface ScorecardTemplate {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  created_by: string | null;
  type: "entrevista" | "teste_tecnico";
  creator_name?: string;
  criteria_count?: number;
  usage_count?: number;
}
interface DashboardStats {
  totalTemplates: number;
  totalEvaluations: number;
  averageScore: number;
}
export default function Scorecards() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ScorecardTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ScorecardTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<string>("todos");
  const [stats, setStats] = useState<DashboardStats>({
    totalTemplates: 0,
    totalEvaluations: 0,
    averageScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  useEffect(() => {
    loadData();
  }, []);
  useEffect(() => {
    filterTemplates();
  }, [templates, activeTab]);
  function filterTemplates() {
    if (activeTab === "todos") {
      setFilteredTemplates(templates);
    } else {
      setFilteredTemplates(templates.filter(t => t.type === activeTab));
    }
  }
  async function loadData() {
    try {
      setLoading(true);

      // Load templates with criteria count and creator info
      const {
        data: templatesData,
        error: templatesError
      } = await supabase.from("scorecard_templates").select(`
        *,
        profiles:created_by(full_name)
      `).order("created_at", {
        ascending: false
      });
      if (templatesError) throw templatesError;

      // Get criteria count for each template
      const templatesWithCounts = await Promise.all((templatesData || []).map(async template => {
        const {
          count: criteriaCount
        } = await supabase.from("scorecard_criteria").select("*", {
          count: "exact",
          head: true
        }).eq("template_id", template.id);
        const {
          count: usageCount
        } = await supabase.from("candidate_scorecards").select("*", {
          count: "exact",
          head: true
        }).eq("template_id", template.id);

        // Extract creator name from join
        const creatorName = (template.profiles as any)?.full_name || "Usuário desconhecido";
        return {
          ...template,
          type: (template.type || "entrevista") as "entrevista" | "teste_tecnico",
          creator_name: creatorName,
          criteria_count: criteriaCount || 0,
          usage_count: usageCount || 0
        };
      }));
      setTemplates(templatesWithCounts as ScorecardTemplate[]);

      // Calculate stats
      const {
        count: totalEvaluations
      } = await supabase.from("candidate_scorecards").select("*", {
        count: "exact",
        head: true
      });
      const {
        data: avgScoreData
      } = await supabase.from("candidate_scorecards").select("match_percentage");
      const avgScore = avgScoreData && avgScoreData.length > 0 ? avgScoreData.reduce((sum, s) => sum + (s.match_percentage || 0), 0) / avgScoreData.length : 0;
      setStats({
        totalTemplates: templatesWithCounts.length,
        totalEvaluations: totalEvaluations || 0,
        averageScore: Math.round(avgScore)
      });
    } catch (error: any) {
      console.error("Erro ao carregar scorecards:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }
  async function handleDuplicate(templateId: string) {
    try {
      // Get original template
      const {
        data: originalTemplate,
        error: templateError
      } = await supabase.from("scorecard_templates").select("*").eq("id", templateId).single();
      if (templateError) throw templateError;

      // Get criteria
      const {
        data: criteria,
        error: criteriaError
      } = await supabase.from("scorecard_criteria").select("*").eq("template_id", templateId);
      if (criteriaError) throw criteriaError;

      // Create new template
      const {
        data: newTemplate,
        error: newTemplateError
      } = await supabase.from("scorecard_templates").insert({
        name: `${originalTemplate.name} (Cópia)`,
        description: originalTemplate.description,
        type: originalTemplate.type || "entrevista",
        active: true
      }).select().single();
      if (newTemplateError) throw newTemplateError;

      // Duplicate criteria
      if (criteria && criteria.length > 0) {
        const newCriteria = criteria.map(c => ({
          template_id: newTemplate.id,
          category: c.category,
          name: c.name,
          description: c.description,
          weight: c.weight,
          scale_type: c.scale_type,
          display_order: c.display_order,
          question_type: c.question_type || "rating",
          options: c.options
        }));
        const {
          error: criteriaInsertError
        } = await supabase.from("scorecard_criteria").insert(newCriteria);
        if (criteriaInsertError) throw criteriaInsertError;
      }
      toast.success("Template duplicado com sucesso!");
      loadData();
    } catch (error: any) {
      console.error("Erro ao duplicar template:", error);
      toast.error("Erro ao duplicar template");
    }
  }
  async function handleDelete(templateId: string) {
    try {
      const {
        error
      } = await supabase.from("scorecard_templates").delete().eq("id", templateId);
      if (error) throw error;
      toast.success("Template excluído com sucesso!");
      setDeleteTemplateId(null);
      loadData();
    } catch (error: any) {
      console.error("Erro ao excluir template:", error);
      toast.error("Erro ao excluir template");
    }
  }
  const getTypeIcon = (type: string) => {
    return type === "teste_tecnico" ? <FileText className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />;
  };
  const getTypeBadge = (type: string) => {
    if (type === "teste_tecnico") {
      return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200 font-medium">
          <FileText className="h-3 w-3 mr-1" />
          Teste Técnico
        </Badge>;
    }
    return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 font-medium">
        <ClipboardList className="h-3 w-3 mr-1" />
        Entrevista
      </Badge>;
  };
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>;
  }
  return <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#00141D]">Avaliações</h1>
              <p className="text-base text-[#36404A] mt-1">
                Gerencie templates de avaliação de candidatos
              </p>
            </div>
            <Button onClick={() => navigate("/avaliacoes/novo")} className="font-semibold">
              <Plus className="mr-2 h-4 w-4" />
              Novo Template
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="bg-gradient-to-br from-[hsl(var(--primary))]/15 to-[hsl(var(--accent))]/10 border-[hsl(var(--primary))]/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-semibold text-[hsl(var(--foreground))]">Total de Templates</CardTitle>
              <div className="h-10 w-10 rounded-full bg-[hsl(var(--primary))]/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-[hsl(var(--primary-foreground))]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[hsl(var(--foreground))]">{stats.totalTemplates}</div>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 font-medium">Templates ativos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[hsl(var(--accent))]/15 to-[hsl(var(--primary))]/10 border-[hsl(var(--accent))]/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-semibold text-[hsl(var(--foreground))]">Avaliações Realizadas</CardTitle>
              <div className="h-10 w-10 rounded-full bg-[hsl(var(--accent))]/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-[hsl(var(--primary-foreground))]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[hsl(var(--foreground))]">{stats.totalEvaluations}</div>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 font-medium">Candidatos avaliados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[hsl(var(--primary))]/15 to-[hsl(var(--accent))]/10 border-[hsl(var(--primary))]/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-semibold text-[hsl(var(--foreground))]">Score Médio</CardTitle>
              <div className="h-10 w-10 rounded-full bg-[hsl(var(--primary))]/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-[hsl(var(--primary-foreground))]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[hsl(var(--foreground))]">{stats.averageScore}%</div>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 font-medium">Match geral</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="todos" className="flex items-center gap-2">
              Todos
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {templates.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="entrevista" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Entrevista
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {templates.filter(t => t.type === "entrevista").length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="teste_tecnico" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Teste Técnico
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {templates.filter(t => t.type === "teste_tecnico").length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Templates List */}
        <div>
          <h2 className="text-xl font-bold mb-5 text-[hsl(var(--foreground))]">Templates de Avaliação</h2>
          
          {filteredTemplates.length === 0 ? <Card className="bg-gradient-to-br from-[hsl(var(--primary))]/5 to-[hsl(var(--accent))]/5 border-[hsl(var(--border))]">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center mb-5">
                  <Target className="h-10 w-10 text-[hsl(var(--primary-foreground))]" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-[hsl(var(--foreground))]">
                  {activeTab === "todos" ? "Nenhum template criado" : activeTab === "entrevista" ? "Nenhum template de entrevista" : "Nenhum teste técnico"}
                </h3>
                <p className="text-base text-[hsl(var(--muted-foreground))] mb-6">
                  {activeTab === "todos" ? "Crie seu primeiro template de scorecard para começar" : `Crie um template do tipo ${activeTab === "entrevista" ? "entrevista" : "teste técnico"}`}
                </p>
                <Button onClick={() => navigate("/avaliacoes/novo")} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] font-semibold">
                  <Plus className="mr-2 h-5 w-5" />
                  Criar Template
                </Button>
              </CardContent>
            </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-sm">
              {filteredTemplates.map(template => <Card key={template.id} className="hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-[hsl(var(--background))] border-[hsl(var(--border))] text-sm flex flex-col h-full">
                  <CardHeader className="min-h-[140px]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 text-sm">
                        <CardTitle className="font-bold text-[hsl(var(--foreground))] truncate text-sm">{template.name}</CardTitle>
                        <CardDescription className="mt-1.5 text-sm font-medium line-clamp-2">
                          {template.description || "Sem descrição"}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {getTypeBadge(template.type)}
                        {template.active && <Badge variant="outline" className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/30 font-medium">
                            Ativo
                          </Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1 flex flex-col justify-end">
                    <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                      <User className="h-4 w-4" />
                      <span>Criado por: <strong className="text-[hsl(var(--foreground))]">{template.creator_name}</strong></span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[hsl(var(--muted-foreground))] font-semibold">Perguntas:</span>
                      <span className="font-bold text-[hsl(var(--foreground))]">{template.criteria_count}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[hsl(var(--muted-foreground))] font-semibold">Usado em:</span>
                      <span className="font-bold text-[hsl(var(--foreground))]">{template.usage_count} avaliações</span>
                    </div>
                    
                    <div className="flex gap-2 pt-3 border-t border-[hsl(var(--border))]">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/avaliacoes/${template.id}/editar`)} className="flex-1 hover:bg-[hsl(var(--primary))]/10 hover:border-[hsl(var(--primary))]/30 font-semibold">
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDuplicate(template.id)} className="hover:bg-[hsl(var(--accent))]/10 hover:border-[hsl(var(--accent))]/30">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTemplateId(template.id)} className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>)}
            </div>}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTemplateId && handleDelete(deleteTemplateId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}