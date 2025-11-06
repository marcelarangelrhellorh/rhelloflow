import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Edit, Trash, TrendingUp, Users, Target } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScorecardTemplate {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
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
  const [stats, setStats] = useState<DashboardStats>({
    totalTemplates: 0,
    totalEvaluations: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      // Load templates with criteria count
      const { data: templatesData, error: templatesError } = await supabase
        .from("scorecard_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (templatesError) throw templatesError;

      // Get criteria count for each template
      const templatesWithCounts = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { count: criteriaCount } = await supabase
            .from("scorecard_criteria")
            .select("*", { count: "exact", head: true })
            .eq("template_id", template.id);

          const { count: usageCount } = await supabase
            .from("candidate_scorecards")
            .select("*", { count: "exact", head: true })
            .eq("template_id", template.id);

          return {
            ...template,
            criteria_count: criteriaCount || 0,
            usage_count: usageCount || 0,
          };
        })
      );

      setTemplates(templatesWithCounts);

      // Calculate stats
      const { count: totalEvaluations } = await supabase
        .from("candidate_scorecards")
        .select("*", { count: "exact", head: true });

      const { data: avgScoreData } = await supabase
        .from("candidate_scorecards")
        .select("match_percentage");

      const avgScore =
        avgScoreData && avgScoreData.length > 0
          ? avgScoreData.reduce((sum, s) => sum + (s.match_percentage || 0), 0) / avgScoreData.length
          : 0;

      setStats({
        totalTemplates: templatesWithCounts.length,
        totalEvaluations: totalEvaluations || 0,
        averageScore: Math.round(avgScore),
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
      const { data: originalTemplate, error: templateError } = await supabase
        .from("scorecard_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      // Get criteria
      const { data: criteria, error: criteriaError } = await supabase
        .from("scorecard_criteria")
        .select("*")
        .eq("template_id", templateId);

      if (criteriaError) throw criteriaError;

      // Create new template
      const { data: newTemplate, error: newTemplateError } = await supabase
        .from("scorecard_templates")
        .insert({
          name: `${originalTemplate.name} (Cópia)`,
          description: originalTemplate.description,
          active: true,
        })
        .select()
        .single();

      if (newTemplateError) throw newTemplateError;

      // Duplicate criteria
      if (criteria && criteria.length > 0) {
        const newCriteria = criteria.map((c) => ({
          template_id: newTemplate.id,
          category: c.category,
          name: c.name,
          description: c.description,
          weight: c.weight,
          scale_type: c.scale_type,
          display_order: c.display_order,
        }));

        const { error: criteriaInsertError } = await supabase
          .from("scorecard_criteria")
          .insert(newCriteria);

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
      const { error } = await supabase
        .from("scorecard_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      toast.success("Template excluído com sucesso!");
      setDeleteTemplateId(null);
      loadData();
    } catch (error: any) {
      console.error("Erro ao excluir template:", error);
      toast.error("Erro ao excluir template");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary/30">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFDF6" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#00141D]">Scorecards</h1>
              <p className="text-sm text-[#36404A] mt-1">
                Gerencie templates de avaliação de candidatos
              </p>
            </div>
            <Button
              onClick={() => navigate("/scorecards/novo")}
              className="bg-[#FFCD00] hover:bg-[#FAEC3E] text-[#00141D]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Template
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Templates</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTemplates}</div>
              <p className="text-xs text-muted-foreground">Templates ativos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliações Realizadas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvaluations}</div>
              <p className="text-xs text-muted-foreground">Candidatos avaliados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageScore}%</div>
              <p className="text-xs text-muted-foreground">Match geral</p>
            </CardContent>
          </Card>
        </div>

        {/* Templates List */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Templates de Avaliação</h2>
          
          {templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum template criado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie seu primeiro template de scorecard para começar
                </p>
                <Button onClick={() => navigate("/scorecards/novo")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {template.description || "Sem descrição"}
                        </CardDescription>
                      </div>
                      {template.active && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Ativo
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Critérios:</span>
                      <span className="font-semibold">{template.criteria_count}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Usado em:</span>
                      <span className="font-semibold">{template.usage_count} avaliações</span>
                    </div>
                    
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/scorecards/${template.id}/editar`)}
                        className="flex-1"
                      >
                        <Edit className="mr-2 h-3 w-3" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(template.id)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTemplateId(template.id)}
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
            <AlertDialogAction
              onClick={() => deleteTemplateId && handleDelete(deleteTemplateId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}