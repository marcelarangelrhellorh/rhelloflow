import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X, Tag as TagIcon, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TagPicker } from "@/components/TagPicker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { logger } from "@/lib/logger";
interface CandidateTag {
  id: string;
  tag_id: string;
  label: string;
  category: string;
  added_by: string | null;
  added_at: string;
  added_reason: string | null;
}
interface CandidateTagsCardProps {
  candidateId: string;
}
const categoryLabels = {
  area: {
    label: "Área",
    color: "bg-blue-100 text-blue-800 border-blue-300"
  },
  role: {
    label: "Função",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300"
  },
  skill: {
    label: "Skill",
    color: "bg-gray-100 text-gray-800 border-gray-300"
  },
  seniority: {
    label: "Senioridade",
    color: "bg-purple-100 text-purple-800 border-purple-300"
  },
  location: {
    label: "Localização",
    color: "bg-green-100 text-green-800 border-green-300"
  }
};
export function CandidateTagsCard({
  candidateId
}: CandidateTagsCardProps) {
  const [tags, setTags] = useState<CandidateTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    loadTags();
  }, [candidateId]);
  const loadTags = async () => {
    try {
      const {
        data,
        error
      } = await (supabase as any).from("view_candidate_tags").select("*").eq("candidate_id", candidateId).order("added_at", {
        ascending: false
      });
      if (error) throw error;
      setTags(data || []);
    } catch (error: any) {
      logger.error("Erro ao carregar tags:", error);
      toast.error("Erro ao carregar tags");
    } finally {
      setLoading(false);
    }
  };
  const handleAddTags = async () => {
    if (selectedTagIds.length === 0) {
      toast.error("Selecione pelo menos uma tag");
      return;
    }
    setSaving(true);
    try {
      const tagsToInsert = selectedTagIds.map(tagId => ({
        candidate_id: candidateId,
        tag_id: tagId,
        added_reason: "manual"
      }));
      const {
        error
      } = await (supabase as any).from("candidate_tags").insert(tagsToInsert);
      if (error) {
        if (error.message.includes("duplicate")) {
          toast.error("Algumas tags já existem no candidato");
        } else {
          throw error;
        }
        return;
      }
      toast.success("Tags adicionadas com sucesso!");
      setAddModalOpen(false);
      setSelectedTagIds([]);
      loadTags();
    } catch (error: any) {
      logger.error("Erro ao adicionar tags:", error);
      toast.error("Erro ao adicionar tags");
    } finally {
      setSaving(false);
    }
  };
  const handleRemoveTag = async (candidateTagId: string) => {
    try {
      const {
        error
      } = await (supabase as any).from("candidate_tags").delete().eq("id", candidateTagId);
      if (error) throw error;
      toast.success("Tag removida");
      loadTags();
    } catch (error: any) {
      logger.error("Erro ao remover tag:", error);
      toast.error("Erro ao remover tag");
    }
  };
  const getOriginIcon = (added_reason: string | null) => {
    if (!added_reason) return {
      icon: "⚙",
      text: "Automático"
    };
    if (added_reason === "manual") return {
      icon: "+",
      text: "Adicionado manualmente"
    };
    if (added_reason.startsWith("application_via_vaga:")) {
      return {
        icon: "↗",
        text: "Adicionado pela candidatura"
      };
    }
    return {
      icon: "⚙",
      text: "Sistema"
    };
  };
  const groupedTags = tags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, CandidateTag[]>);
  return <Card className="my-[50px] shadow-lg border border-[#ffcd00]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TagIcon className="h-5 w-5" />
            <CardTitle>Tags</CardTitle>
          </div>
          <Button size="sm" onClick={() => setAddModalOpen(true)} className="font-semibold">
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Tags
          </Button>
        </div>
      </CardHeader>
      <CardContent className="py-0 my-[32px]">
        {loading ? <p className="text-muted-foreground">Carregando tags...</p> : tags.length === 0 ? <div className="text-center py-8">
            <TagIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhuma tag adicionada</p>
            <p className="text-sm text-muted-foreground">
              Tags serão adicionadas automaticamente quando o candidato se candidatar a vagas
            </p>
          </div> : <div className="space-y-4">
            {Object.entries(groupedTags).map(([category, categoryTags]) => {
          const categoryInfo = categoryLabels[category as keyof typeof categoryLabels];
          return <div key={category}>
                  <h4 className="font-semibold mb-2 text-muted-foreground text-base text-left">
                    {categoryInfo.label}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {categoryTags.map(tag => {
                const origin = getOriginIcon(tag.added_reason);
                return <TooltipProvider key={tag.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className={`${categoryInfo.color} cursor-help group relative`}>
                                <span className="text-xs mr-1">{origin.icon}</span>
                                {tag.label}
                                <button onClick={e => {
                          e.stopPropagation();
                          handleRemoveTag(tag.id);
                        }} className="ml-1 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1 text-xs">
                                <p className="font-semibold">{origin.text}</p>
                                <p className="text-muted-foreground">
                                  Adicionado em:{" "}
                                  {format(new Date(tag.added_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR
                          })}
                                </p>
                                {tag.added_reason?.startsWith("application_via_vaga:") && <p className="text-muted-foreground text-xs">
                                    Via candidatura na vaga
                                  </p>}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>;
              })}
                  </div>
                </div>;
        })}
          </div>}
      </CardContent>

      {/* Modal para adicionar tags */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Tags ao Candidato</DialogTitle>
            <DialogDescription>
              Selecione as tags que melhor descrevem as habilidades e características deste
              candidato
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <TagPicker selectedTags={selectedTagIds} onChange={setSelectedTagIds} disabled={saving} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleAddTags} disabled={saving}>
              {saving ? "Salvando..." : "Adicionar Tags"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>;
}